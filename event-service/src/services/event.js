const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const { getEventOccurrences, calculateOccurrenceEnd } = require('../utils/recurrence');

const getEvents = async (userId, start, end, calendarIds) => {
    if (!start || !end) {
        throw new Error('Start and end dates are required');
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date format');
    }

    let calendars = [];

    if (calendarIds) {
        calendars = calendarIds.split(',');
    } else {
        const accessibleCalendarsResult = await pool.query(
            `SELECT c.id FROM calendars c
             WHERE c.owner_id = $1
             UNION
             SELECT c.id FROM calendars c
             JOIN calendar_shares cs ON c.id = cs.calendar_id
             WHERE cs.user_id = $1 AND cs.status = 'accepted'`,
            [userId]
        );

        calendars = accessibleCalendarsResult.rows.map(row => row.id);
    }

    if (calendars.length === 0) {
        return [];
    }

    for (const calendarId of calendars) {
        const accessCheck = await pool.query(
            `SELECT COUNT(*) FROM (
               SELECT id FROM calendars WHERE id = $1 AND owner_id = $2
               UNION
               SELECT c.id FROM calendars c
               JOIN calendar_shares cs ON c.id = cs.calendar_id
               WHERE c.id = $1 AND cs.user_id = $2 AND cs.status = 'accepted'
             ) as access`,
            [calendarId, userId]
        );

        if (parseInt(accessCheck.rows[0].count) === 0) {
            throw new Error(`Access denied to calendar ${calendarId}`);
        }
    }

    const nonRecurringEventsResult = await pool.query(
        `SELECT e.*, c.name as calendar_name, c.color as calendar_color
           FROM events e
           JOIN calendars c ON e.calendar_id = c.id
           WHERE e.calendar_id = ANY($1::uuid[])
           AND NOT EXISTS (SELECT 1 FROM recurrence_rules rr WHERE rr.event_id = e.id)
           AND (
             (e.start_time >= $2::timestamp AND e.start_time <= $3::timestamp)
             OR (e.end_time >= $2::timestamp AND e.end_time <= $3::timestamp)
             OR (e.start_time <= $2::timestamp AND e.end_time >= $3::timestamp)
           )`,
        [calendars, start, end]
    );

    const recurringEventsResult = await pool.query(
        `SELECT e.*, c.name as calendar_name, c.color as calendar_color, rr.frequency, rr.interval, rr.count, rr.until, rr.by_day 
           FROM events e
           JOIN calendars c ON e.calendar_id = c.id
           JOIN recurrence_rules rr ON e.id = rr.event_id
           WHERE e.calendar_id = ANY($1::uuid[])
           AND e.start_time <= $3::timestamp`,
        [calendars, start, end]
    );

    const recurringEvents = [];

    for (const event of recurringEventsResult.rows) {
        try {
            let exceptionDates = [];
            if (event.exception_dates) {
                exceptionDates = Array.isArray(event.exception_dates)
                    ? event.exception_dates
                    : JSON.parse(event.exception_dates);
            }

            const startTime = new Date(event.start_time);
            const occurrences = getEventOccurrences(
                event,
                startTime,
                new Date(start),
                new Date(end),
                exceptionDates
            );

            const instancesResult = await pool.query(
                `SELECT * FROM event_instances 
                   WHERE event_id = $1 
                   AND instance_date >= $2::date 
                   AND instance_date <= $3::date`,
                [event.id, start.split('T')[0], end.split('T')[0]]
            );

            const instances = instancesResult.rows;

            for (const occurrenceDate of occurrences) {
                if (!occurrenceDate) {
                    continue;
                }
                const dateStr = occurrenceDate.toISOString().split('T')[0];

                const instance = instances.find(i => i.instance_date === dateStr);

                if (instance) {
                    recurringEvents.push({
                        ...event,
                        id: `${event.id}_${dateStr}`,
                        original_event_id: event.id,
                        start_time: instance.start_time,
                        end_time: instance.end_time,
                        is_recurring_instance: true,
                        is_exception: instance.is_exception,
                        instance_data: instance.exception_data,
                        instance_date: dateStr
                    });
                } else {
                    const instanceStart = new Date(occurrenceDate);
                    instanceStart.setHours(
                        startTime.getHours(),
                        startTime.getMinutes(),
                        startTime.getSeconds(),
                        startTime.getMilliseconds()
                    );

                    const instanceEnd = calculateOccurrenceEnd(
                        instanceStart,
                        new Date(event.start_time),
                        new Date(event.end_time)
                    );

                    recurringEvents.push({
                        ...event,
                        id: `${event.id}_${dateStr}`,
                        original_event_id: event.id,
                        start_time: instanceStart.toISOString(),
                        end_time: instanceEnd.toISOString(),
                        is_recurring_instance: true,
                        is_exception: false,
                        instance_date: dateStr
                    });
                }
            }
        } catch (error) {
            console.error(`Error processing recurring event ${event.id}:`, error);
        }
    }

    const events = [
        ...nonRecurringEventsResult.rows,
        ...recurringEvents
    ];

    return events;
};

const createEvent = async (userId, eventData) => {
    console.log('Event Service: createEvent - User ID:', userId);
    console.log('Event Service: createEvent - Event Data:', eventData);
    const {
        calendarId, title, description, location,
        startTime, endTime, isAllDay, recurrenceRule,
        color, visibility, reminderMinutes, attendees
    } = eventData;

    if (!calendarId || !title || !startTime || !endTime) {
        throw new Error('Calendar ID, title, start time, and end time are required');
    }

    const accessCheck = await pool.query(
        `SELECT c.*, 
          CASE WHEN c.owner_id = $1 THEN 'owner'
               WHEN cs.permission = 'edit' THEN 'edit'
               ELSE 'view'
          END as access_role
       FROM calendars c
       LEFT JOIN calendar_shares cs ON c.id = cs.calendar_id AND cs.user_id = $1
       WHERE c.id = $2`,
        [userId, calendarId]
    );

    if (accessCheck.rows.length === 0) {
        throw new Error('Calendar not found');
    }

    if (accessCheck.rows[0].access_role === 'view') {
        throw new Error('Permission denied');
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const eventId = uuidv4();

        const eventResult = await client.query(
            `INSERT INTO events (
          id, calendar_id, title, description, location, 
          start_time, end_time, is_all_day, 
          color, visibility, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *, created_at`,
            [
                eventId, calendarId, title, description, location,
                startTime, endTime, isAllDay || false,
                color, visibility || 'default', 'confirmed', userId
            ]
        );

        const event = eventResult.rows[0];

        if (recurrenceRule) {
            await client.query(
                `INSERT INTO recurrence_rules (event_id, frequency, interval, count, until, by_day)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [eventId, recurrenceRule.frequency, recurrenceRule.interval, recurrenceRule.count, recurrenceRule.until, recurrenceRule.byDay]
            );
        }

        if (reminderMinutes) {
            await client.query(
                `INSERT INTO reminders
                   (id, event_id, user_id, minutes_before, method, created_at)
                   VALUES ($1, $2, $3, $4, $5, NOW())`,
                [uuidv4(), eventId, userId, reminderMinutes, 'notification']
            );
        }

        if (attendees && attendees.length > 0) {
            for (const attendee of attendees) {
                await client.query(
                    `INSERT INTO event_attendees
                     (id, event_id, user_id, email, name, response_status, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
                    [uuidv4(), eventId, null, attendee.email, attendee.name, 'pending']
                );
            }
        }

        await client.query('COMMIT');

        const calendarResult = await pool.query(
            'SELECT name, color FROM calendars WHERE id = $1',
            [calendarId]
        );

        if (calendarResult.rows.length > 0) {
            event.calendar_name = calendarResult.rows[0].name;
            event.calendar_color = calendarResult.rows[0].color;
        }

        return event;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const getEvent = async (userId, id) => {
    const isRecurringInstance = id.includes('_');

    let eventId = id;
    let instanceDate = null;

    if (isRecurringInstance) {
        [eventId, instanceDate] = id.split('_');
    }

    const eventResult = await pool.query(
        `SELECT e.*, c.name as calendar_name, c.color as calendar_color,
              c.owner_id as calendar_owner_id, rr.frequency, rr.interval, rr.count, rr.until, rr.by_day,
              CASE WHEN c.owner_id = $1 THEN 'owner'
                   WHEN cs.permission = 'edit' THEN 'edit'
                   WHEN cs.permission = 'view' THEN 'view'
                   WHEN e.created_by = $1 THEN 'creator'
                   ELSE 'none'
              END as access_role
       FROM events e
       JOIN calendars c ON e.calendar_id = c.id
       LEFT JOIN recurrence_rules rr ON e.id = rr.event_id
       LEFT JOIN calendar_shares cs ON c.id = cs.calendar_id AND cs.user_id = $1
       WHERE e.id = $2`,
        [userId, eventId]
    );

    if (eventResult.rows.length === 0) {
        return null;
    }

    let event = eventResult.rows[0];

    if (event.access_role === 'none') {
        throw new Error('Access denied');
    }

    if (isRecurringInstance && instanceDate) {
        if (!event.frequency) {
            throw new Error('Event is not recurring');
        }

        const instanceResult = await pool.query(
            `SELECT * FROM event_instances 
             WHERE event_id = $1 AND instance_date = $2::date`,
            [eventId, instanceDate]
        );

        if (instanceResult.rows.length > 0) {
            const instance = instanceResult.rows[0];

            event = {
                ...event,
                id: id,
                original_event_id: eventId,
                start_time: instance.start_time,
                end_time: instance.end_time,
                is_recurring_instance: true,
                is_exception: instance.is_exception,
                instance_data: instance.exception_data,
                instance_date: instanceDate
            };
        } else {
            try {
                const startTime = new Date(event.start_time);
                const parsedDate = new Date(`${instanceDate}T00:00:00Z`);

                const occurrences = getEventOccurrences(
                    event,
                    startTime,
                    new Date(parsedDate.getTime() - 86400000),
                    new Date(parsedDate.getTime() + 86400000),
                    event.exception_dates
                );

                const matchingDate = occurrences.find(d =>
                    d.toISOString().split('T')[0] === instanceDate
                );

                if (!matchingDate) {
                    throw new Error('Event instance not found');
                }

                const instanceStart = new Date(matchingDate);
                instanceStart.setHours(
                    startTime.getHours(),
                    startTime.getMinutes(),
                    startTime.getSeconds(),
                    startTime.getMilliseconds()
                );

                const instanceEnd = calculateOccurrenceEnd(
                    instanceStart,
                    new Date(event.start_time),
                    new Date(event.end_time)
                );

                event = {
                    ...event,
                    id: id,
                    original_event_id: eventId,
                    start_time: instanceStart.toISOString(),
                    end_time: instanceEnd.toISOString(),
                    is_recurring_instance: true,
                    is_exception: false,
                    instance_date: instanceDate
                };
            } catch (error) {
                console.error(`Error processing recurring event ${eventId}:`, error);
                throw new Error('Error processing recurring event');
            }
        }
    }

    const remindersResult = await pool.query(
        'SELECT * FROM reminders WHERE event_id = $1 AND user_id = $2',
        [eventId, userId]
    );

    event.reminders = remindersResult.rows;

    const attendeesResult = await pool.query(
        'SELECT * FROM event_attendees WHERE event_id = $1',
        [eventId]
    );

    event.attendees = attendeesResult.rows;

    return event;
};

const updateEvent = async (userId, eventId, eventData) => {
    const {
        title, description, location, startTime, endTime,
        isAllDay, recurrenceRule, color, visibility, status
    } = eventData;

    if (eventId.includes('_')) {
        throw new Error('Cannot update recurring instance directly. Use /events/:id/instance/:date endpoint');
    }

    const accessCheck = await pool.query(
        `SELECT e.*,
              c.owner_id as calendar_owner_id,
              CASE WHEN c.owner_id = $1 THEN 'owner'
                   WHEN cs.permission = 'edit' THEN 'edit'
                   WHEN e.created_by = $1 THEN 'creator'
                   ELSE 'view'
              END as access_role
       FROM events e
       JOIN calendars c ON e.calendar_id = c.id
       LEFT JOIN calendar_shares cs ON c.id = cs.calendar_id AND cs.user_id = $1
       WHERE e.id = $2`,
        [userId, eventId]
    );

    if (accessCheck.rows.length === 0) {
        return null;
    }

    const event = accessCheck.rows[0];

    if (!['owner', 'edit', 'creator'].includes(event.access_role)) {
        throw new Error('Permission denied');
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        let updateFields = [];
        let values = [];
        let paramCount = 1;

        if (title !== undefined) {
            updateFields.push(`title = ${paramCount}`);
            values.push(title);
            paramCount++;
        }

        if (description !== undefined) {
            updateFields.push(`description = ${paramCount}`);
            values.push(description);
            paramCount++;
        }

        if (location !== undefined) {
            updateFields.push(`location = ${paramCount}`);
            values.push(location);
            paramCount++;
        }

        if (startTime !== undefined) {
            updateFields.push(`start_time = ${paramCount}`);
            values.push(startTime);
            paramCount++;
        }

        if (endTime !== undefined) {
            updateFields.push(`end_time = ${paramCount}`);
            values.push(endTime);
            paramCount++;
        }

        if (isAllDay !== undefined) {
            updateFields.push(`is_all_day = ${paramCount}`);
            values.push(isAllDay);
            paramCount++;
        }

        if (color !== undefined) {
            updateFields.push(`color = ${paramCount}`);
            values.push(color);
            paramCount++;
        }

        if (visibility !== undefined) {
            updateFields.push(`visibility = ${paramCount}`);
            values.push(visibility);
            paramCount++;
        }

        if (status !== undefined) {
            updateFields.push(`status = ${paramCount}`);
            values.push(status);
            paramCount++;
        }

        updateFields.push(`version = version + 1, updated_at = NOW()`);

        if (updateFields.length > 0) {
            values.push(eventId);
            await client.query(
                `UPDATE events SET ${updateFields.join(', ')} WHERE id = ${paramCount}`,
                values
            );
        }

        if (recurrenceRule) {
            // Check if a recurrence rule already exists for this event
            const existingRecurrence = await client.query(
                'SELECT * FROM recurrence_rules WHERE event_id = $1',
                [eventId]
            );

            if (existingRecurrence.rows.length > 0) {
                // Update existing recurrence rule
                await client.query(
                    `UPDATE recurrence_rules SET frequency = $1, interval = $2, count = $3, until = $4, by_day = $5 WHERE event_id = $6`,
                    [recurrenceRule.frequency, recurrenceRule.interval, recurrenceRule.count, recurrenceRule.until, recurrenceRule.byDay, eventId]
                );
            } else {
                // Insert new recurrence rule
                await client.query(
                    `INSERT INTO recurrence_rules (event_id, frequency, interval, count, until, by_day)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [eventId, recurrenceRule.frequency, recurrenceRule.interval, recurrenceRule.count, recurrenceRule.until, recurrenceRule.byDay]
                );
            }
        } else {
            // If recurrenceRule is explicitly null or undefined, delete any existing rule
            await client.query(
                `DELETE FROM recurrence_rules WHERE event_id = $1`,
                [eventId]
            );
        }

        await client.query('COMMIT');

        const result = await pool.query('SELECT * FROM events WHERE id = $1', [eventId]);
        const updatedEvent = result.rows[0];

        const calendarResult = await pool.query(
            'SELECT name, color FROM calendars WHERE id = $1',
            [updatedEvent.calendar_id]
        );

        if (calendarResult.rows.length > 0) {
            updatedEvent.calendar_name = calendarResult.rows[0].name;
            updatedEvent.calendar_color = calendarResult.rows[0].color;
        }

        return updatedEvent;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const updateEventInstance = async (userId, eventId, date, eventData) => {
    const {
        title, description, location, startTime, endTime, color, status
    } = eventData;

    // Validate date format
    const instanceDate = new Date(date);
    if (isNaN(instanceDate.getTime())) {
        throw new Error('Invalid date format');
    }

    // Format date to YYYY-MM-DD
    const formattedDate = instanceDate.toISOString().split('T')[0];

    // Check event access
    const accessCheck = await pool.query(
        `SELECT e.*,
              c.owner_id as calendar_owner_id,
              CASE WHEN c.owner_id = $1 THEN 'owner'
                   WHEN cs.permission = 'edit' THEN 'edit'
                   WHEN e.created_by = $1 THEN 'creator'
                   ELSE 'view'
              END as access_role
       FROM events e
       JOIN calendars c ON e.calendar_id = c.id
       LEFT JOIN calendar_shares cs ON c.id = cs.calendar_id AND cs.user_id = $1
       WHERE e.id = $2`,
        [userId, eventId]
    );

    if (accessCheck.rows.length === 0) {
        return null;
    }

    const event = accessCheck.rows[0];

    if (!['owner', 'edit', 'creator'].includes(event.access_role)) {
        throw new Error('Permission denied');
    }

    if (!event.frequency) {
        throw new Error('Event is not recurring');
    }

    // Begin transaction
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Check if instance already exists
        const instanceCheck = await client.query(
            'SELECT * FROM event_instances WHERE event_id = $1 AND instance_date = $2',
            [eventId, formattedDate]
        );

        let updateFields = [];
        let values = [];
        let paramCount = 1;

        if (startTime !== undefined) {
            updateFields.push(`start_time = $${paramCount}`);
            values.push(startTime);
            paramCount++;
        } else {
            // Use the calculated start time based on the recurrence pattern
            const baseStart = new Date(event.start_time);
            const occurrenceStart = new Date(formattedDate);
            occurrenceStart.setHours(
                baseStart.getHours(),
                baseStart.getMinutes(),
                baseStart.getSeconds(),
                baseStart.getMilliseconds()
            );

            updateFields.push(`start_time = $${paramCount}`);
            values.push(occurrenceStart.toISOString());
            paramCount++;
        }

        if (endTime !== undefined) {
            updateFields.push(`end_time = $${paramCount}`);
            values.push(endTime);
            paramCount++;
        } else {
            // Calculate end time based on duration of original event
            const baseStart = new Date(event.start_time);
            const baseEnd = new Date(event.end_time);
            const duration = baseEnd.getTime() - baseStart.getTime();

            const occurrenceStart = new Date(values[0]); // From startTime
            const occurrenceEnd = new Date(occurrenceStart.getTime() + duration);

            updateFields.push(`end_time = $${paramCount}`);
            values.push(occurrenceEnd.toISOString());
            paramCount++;
        }

        // Prepare exception data
        const exceptionData = {};

        if (title !== undefined) {
            exceptionData.title = title;
        }

        if (description !== undefined) {
            exceptionData.description = description;
        }

        if (location !== undefined) {
            exceptionData.location = location;
        }

        if (color !== undefined) {
            exceptionData.color = color;
        }

        if (status !== undefined) {
            updateFields.push(`status = $${paramCount}`);
            values.push(status);
            paramCount++;
        }

        updateFields.push(`is_exception = true`);

        if (Object.keys(exceptionData).length > 0) {
            updateFields.push(`exception_data = $${paramCount}`);
            values.push(JSON.stringify(exceptionData));
            paramCount++;
        }

        let result;

        if (instanceCheck.rows.length > 0) {
            // Update existing instance
            values.push(eventId);
            values.push(formattedDate);

            result = await client.query(
                `UPDATE event_instances SET 
                   ${updateFields.join(', ')}, 
                   updated_at = NOW() 
                   WHERE event_id = $${paramCount} AND instance_date = $${paramCount + 1}
                   RETURNING *`,
                values
            );
        } else {
            // Create new instance
            const instanceId = uuidv4();

            updateFields.push(`id = $${paramCount}`);
            values.push(instanceId);
            paramCount++;

            updateFields.push(`event_id = $${paramCount}`);
            values.push(eventId);
            paramCount++;

            updateFields.push(`instance_date = $${paramCount}`);
            values.push(formattedDate);
            paramCount++;

            updateFields.push(`created_at = NOW()`);

            result = await client.query(
                `INSERT INTO event_instances (${updateFields.map((_, i) => `$${i + 1}`).join(', ')})
                   VALUES (${Array.from({ length: paramCount - 1 }, (_, i) => `$${i + 1}`).join(', ')})
                   RETURNING *`,
                values
            );
        }

        // Update exception dates in the original event if needed
        let exceptionDates = [];
        if (event.exception_dates) {
            exceptionDates = Array.isArray(event.exception_dates)
                ? event.exception_dates
                : JSON.parse(event.exception_dates);
        }

        if (!exceptionDates.includes(formattedDate)) {
            exceptionDates.push(formattedDate);

            await client.query(
                'UPDATE events SET exception_dates = $1, updated_at = NOW() WHERE id = $2',
                [JSON.stringify(exceptionDates), eventId]
            );
        }

        await client.query('COMMIT');

        // Construct response combining event and instance data
        const instanceData = result.rows[0];

        const response = {
            id: `${eventId}_${formattedDate}`,
            original_event_id: eventId,
            calendar_id: event.calendar_id,
            title: exceptionData.title || event.title,
            description: exceptionData.description || event.description,
            location: exceptionData.location || event.location,
            start_time: instanceData.start_time,
            end_time: instanceData.end_time,
            is_all_day: event.is_all_day,
            color: exceptionData.color || event.color,
            visibility: event.visibility,
            status: instanceData.status || event.status,
            created_by: event.created_by,
            is_recurring_instance: true,
            is_exception: true,
            instance_date: formattedDate,
            exception_data: instanceData.exception_data
        };

        return response;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const deleteEvent = async (userId, eventId, recurringOption) => {
    const isRecurringInstance = eventId.includes('_');

    let originalEventId = eventId;
    let instanceDate = null;

    if (isRecurringInstance) {
        [originalEventId, instanceDate] = eventId.split('_');
    }

    const accessCheck = await pool.query(
        `SELECT e.*, rr.*,
              c.owner_id as calendar_owner_id,
              CASE WHEN c.owner_id = $1 THEN 'owner'
                   WHEN cs.permission = 'edit' THEN 'edit'
                   WHEN e.created_by = $1 THEN 'creator'
                   ELSE 'view'
              END as access_role
       FROM events e
       JOIN calendars c ON e.calendar_id = c.id
       LEFT JOIN recurrence_rules rr ON e.id = rr.event_id
       LEFT JOIN calendar_shares cs ON c.id = cs.calendar_id AND cs.user_id = $1
       WHERE e.id = $2`,
        [userId, originalEventId]
    );

    if (accessCheck.rows.length === 0) {
        throw new Error('Event not found');
    }

    const event = accessCheck.rows[0];

    if (!['owner', 'edit', 'creator'].includes(event.access_role)) {
        throw new Error('Permission denied');
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        if (isRecurringInstance && instanceDate) {
            let exceptionDates = [];

            if (event.exception_dates) {
                exceptionDates = Array.isArray(event.exception_dates)
                    ? event.exception_dates
                    : JSON.parse(event.exception_dates);
            }

            if (!exceptionDates.includes(instanceDate)) {
                exceptionDates.push(instanceDate);
            }

            await client.query(
                'UPDATE events SET exception_dates = $1, updated_at = NOW() WHERE id = $2',
                [JSON.stringify(exceptionDates), originalEventId]
            );

            await client.query(
                'DELETE FROM event_instances WHERE event_id = $1 AND instance_date = $2',
                [originalEventId, instanceDate]
            );
        } else if (event.frequency && recurringOption) {
            if (recurringOption === 'this') {
                let exceptionDates = [];

                if (event.exception_dates) {
                    exceptionDates = Array.isArray(event.exception_dates)
                        ? event.exception_dates
                        : JSON.parse(event.exception_dates);
                }

                const today = new Date().toISOString().split('T')[0];
                if (!exceptionDates.includes(today)) {
                    exceptionDates.push(today);
                }

                await client.query(
                    'UPDATE events SET exception_dates = $1, updated_at = NOW() WHERE id = $2',
                    [JSON.stringify(exceptionDates), originalEventId]
                );
            } else if (recurringOption === 'future') {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);

                await client.query(
                    'UPDATE recurrence_rules SET until = $1 WHERE event_id = $2',
                    [yesterday, originalEventId]
                );
            } else {
                await client.query('DELETE FROM events WHERE id = $1', [originalEventId]);
            }
        } else {
            await client.query('DELETE FROM events WHERE id = $1', [originalEventId]);
        }

        await client.query('COMMIT');

        return { message: 'Event deleted successfully' };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    getEvents,
    createEvent,
    getEvent,
    updateEvent,
    updateEventInstance,
    deleteEvent,
};