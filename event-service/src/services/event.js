const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const { getEventOccurrences, calculateOccurrenceEnd } = require('../utils/recurrence');

const getEvents = async (userId, start, end, calendarIds) => {
    // Validate date range
    if (!start || !end) {
        throw new Error('Start and end dates are required');
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date format');
    }

    // Get accessible calendars if none specified
    let calendars = [];

    if (calendarIds) {
        calendars = calendarIds.split(',');
    } else {
        // Get all accessible calendars
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

    // Check calendar access permissions
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

    // Get non-recurring events
    const nonRecurringEventsResult = await pool.query(
        `SELECT e.*, c.name as calendar_name, c.color as calendar_color
           FROM events e
           JOIN calendars c ON e.calendar_id = c.id
           WHERE e.calendar_id = ANY($1::uuid[])
           AND e.recurrence_rule IS NULL
           AND (
             (e.start_time >= $2::timestamp AND e.start_time <= $3::timestamp)
             OR (e.end_time >= $2::timestamp AND e.end_time <= $3::timestamp)
             OR (e.start_time <= $2::timestamp AND e.end_time >= $3::timestamp)
           )`,
        [calendars, start, end]
    );

    // Get recurring events
    const recurringEventsResult = await pool.query(
        `SELECT e.*, c.name as calendar_name, c.color as calendar_color
           FROM events e
           JOIN calendars c ON e.calendar_id = c.id
           WHERE e.calendar_id = ANY($1::uuid[])
           AND e.recurrence_rule IS NOT NULL
           AND e.start_time <= $3::timestamp`,
        [calendars, start, end]
    );

    // Process recurring events to generate occurrences
    const recurringEvents = [];

    for (const event of recurringEventsResult.rows) {
        try {
            // Parse exception dates
            let exceptionDates = [];
            if (event.exception_dates) {
                exceptionDates = Array.isArray(event.exception_dates)
                    ? event.exception_dates
                    : JSON.parse(event.exception_dates);
            }

            // Get occurrences within range
            const startTime = new Date(event.start_time);
            const occurrences = getEventOccurrences(
                event.recurrence_rule,
                startTime,
                new Date(start),
                new Date(end),
                exceptionDates
            );

            // Get modified instances for this event
            const instancesResult = await pool.query(
                `SELECT * FROM event_instances 
                   WHERE event_id = $1 
                   AND instance_date >= $2::date 
                   AND instance_date <= $3::date`,
                [event.id, start.split('T')[0], end.split('T')[0]]
            );

            const instances = instancesResult.rows;

            // Generate event instances
            for (const occurrenceDate of occurrences) {
                // Format the date for instance lookup
                const dateStr = occurrenceDate.toISOString().split('T')[0];

                // Check if there's a modified instance
                const instance = instances.find(i => i.instance_date === dateStr);

                if (instance) {
                    // Use modified instance data
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
                    // Calculate start and end times for this occurrence
                    const instanceStart = new Date(occurrenceDate);
                    // Match the time component from the original event
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
            // Skip this event if there's an error processing the recurrence
        }
    }

    // Combine all events
    const events = [
        ...nonRecurringEventsResult.rows,
        ...recurringEvents
    ];

    return events;
};

const createEvent = async (userId, eventData) => {
    console.log('Event Service: createEvent received eventData:', eventData);
    const {
        calendarId, title, description, location,
        startTime, endTime, isAllDay, recurrenceRule,
        color, visibility, reminderMinutes, attendees
    } = eventData;

    console.log('Event Service: createEvent - userId:', userId);
    console.log('Event Service: createEvent - calendarId:', calendarId);
    console.log('Event Service: createEvent - title:', title);
    console.log('Event Service: createEvent - startTime:', startTime);
    console.log('Event Service: createEvent - endTime:', endTime);

    // Validate required fields
    if (!calendarId || !title || !startTime || !endTime) {
        throw new Error('Calendar ID, title, start time, and end time are required');
    }

    // Check calendar access
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
        console.error('Event Service: Calendar not found for ID:', calendarId, 'and User ID:', userId);
        throw new Error('Calendar not found');
    }

    if (accessCheck.rows[0].access_role === 'view') {
        console.error('Event Service: Permission denied for calendar:', calendarId, 'user:', userId, 'role:', accessCheck.rows[0].access_role);
        throw new Error('Permission denied');
    }

    // Begin transaction
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Create event
        const eventId = uuidv4();

        console.log('Event Service: Executing INSERT query for event:', {
            eventId, calendarId, title, description, location,
            startTime, endTime, isAllDay, recurrenceRule,
            color, visibility: visibility || 'default', status: 'confirmed', createdBy: userId
        });
        const eventResult = await client.query(
            `INSERT INTO events (
          id, calendar_id, title, description, location, 
          start_time, end_time, is_all_day, recurrence_rule,
          color, visibility, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *, created_at`,
            [
                eventId, calendarId, title, description, location,
                startTime, endTime, isAllDay || false, recurrenceRule,
                color, visibility || 'default', 'confirmed', userId
            ]
        );

        const event = eventResult.rows[0];
        console.log('Event Service: INSERT query result for event:', event);

        // Create reminder if requested
        if (reminderMinutes) {
            await client.query(
                `INSERT INTO reminders
                   (id, event_id, user_id, minutes_before, method, created_at)
                   VALUES ($1, $2, $3, $4, $5, NOW())`,
                [uuidv4(), eventId, userId, reminderMinutes, 'notification']
            );
        }

        // Create attendees if provided
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

        // Fetch calendar information
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
    // Check if it's a recurring instance
    const isRecurringInstance = id.includes('_');

    let eventId = id;
    let instanceDate = null;

    if (isRecurringInstance) {
        [eventId, instanceDate] = id.split('_');
    }

    // Check event access
    const eventResult = await pool.query(
        `SELECT e.*, c.name as calendar_name, c.color as calendar_color,
              c.owner_id as calendar_owner_id,
              CASE WHEN c.owner_id = $1 THEN 'owner'
                   WHEN cs.permission = 'edit' THEN 'edit'
                   WHEN cs.permission = 'view' THEN 'view'
                   WHEN e.created_by = $1 THEN 'creator'
                   ELSE 'none'
              END as access_role
       FROM events e
       JOIN calendars c ON e.calendar_id = c.id
       LEFT JOIN calendar_shares cs ON c.id = cs.calendar_id AND cs.user_id = $1
       WHERE e.id = $2`,
        [userId, eventId]
    );

    if (eventResult.rows.length === 0) {
        return null;
    }

    let event = eventResult.rows[0];

    // Check access permissions
    if (event.access_role === 'none') {
        throw new Error('Access denied');
    }

    // If it's a recurring instance, get the instance data
    if (isRecurringInstance && instanceDate) {
        if (!event.recurrence_rule) {
            throw new Error('Event is not recurring');
        }

        // Check if it's an exception
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
            // Calculate instance times based on recurrence rule
            try {
                const startTime = new Date(event.start_time);
                const parsedDate = new Date(`${instanceDate}T00:00:00Z`);

                // Verify this date is in the recurrence pattern
                const occurrences = getEventOccurrences(
                    event.recurrence_rule,
                    startTime,
                    new Date(parsedDate.getTime() - 86400000), // 1 day before
                    new Date(parsedDate.getTime() + 86400000), // 1 day after
                    event.exception_dates
                );

                const matchingDate = occurrences.find(d =>
                    d.toISOString().split('T')[0] === instanceDate
                );

                if (!matchingDate) {
                    throw new Error('Event instance not found');
                }

                // Calculate start and end times for this occurrence
                const instanceStart = new Date(matchingDate);
                // Match the time component from the original event
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

    // Get reminders for this user
    const remindersResult = await pool.query(
        'SELECT * FROM reminders WHERE event_id = $1 AND user_id = $2',
        [eventId, userId]
    );

    event.reminders = remindersResult.rows;

    // Get attendees
    const attendeesResult = await pool.query(
        'SELECT * FROM event_attendees WHERE event_id = $1',
        [eventId]
    );

    event.attendees = attendeesResult.rows;

    return event;
};

const updateEvent = async (userId, eventId, eventData) => {
    console.log('Event Service: updateEvent received eventId:', eventId, 'eventData:', eventData);
    const {
        title, description, location, startTime, endTime,
        isAllDay, recurrenceRule, color, visibility, status
    } = eventData;

    // Check if it's a recurring instance
    if (eventId.includes('_')) {
        throw new Error('Cannot update recurring instance directly. Use /events/:id/instance/:date endpoint');
    }

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

    // Build update query
    let updateFields = [];
    let values = [];
    let paramCount = 1;

    if (title !== undefined) {
        updateFields.push(`title = $${paramCount}`);
        values.push(title);
        paramCount++;
    }

    if (description !== undefined) {
        updateFields.push(`description = $${paramCount}`);
        values.push(description);
        paramCount++;
    }

    if (location !== undefined) {
        updateFields.push(`location = $${paramCount}`);
        values.push(location);
        paramCount++;
    }

    if (startTime !== undefined) {
        updateFields.push(`start_time = $${paramCount}`);
        values.push(startTime);
        paramCount++;
    }

    if (endTime !== undefined) {
        updateFields.push(`end_time = $${paramCount}`);
        values.push(endTime);
        paramCount++;
    }

    if (isAllDay !== undefined) {
        updateFields.push(`is_all_day = $${paramCount}`);
        values.push(isAllDay);
        paramCount++;
    }

    if (recurrenceRule !== undefined) {
        updateFields.push(`recurrence_rule = $${paramCount}`);
        values.push(recurrenceRule);
        paramCount++;
    }

    if (color !== undefined) {
        updateFields.push(`color = $${paramCount}`);
        values.push(color);
        paramCount++;
    }

    if (visibility !== undefined) {
        updateFields.push(`visibility = $${paramCount}`);
        values.push(visibility);
        paramCount++;
    }

    if (status !== undefined) {
        updateFields.push(`status = $${paramCount}`);
        values.push(status);
        paramCount++;
    }

    // Add version increment and updated_at
    updateFields.push(`version = version + 1, updated_at = NOW()`);

    // Return if no fields to update
    if (updateFields.length <= 1) {
        return event;
    }

    // Add ID to values
    values.push(eventId);

    // Update event
    console.log('Event Service: Executing UPDATE query for event:', {
        eventId, updateFields, values
    });
    const result = await pool.query(
        `UPDATE events SET ${updateFields.join(', ')} WHERE id = ${paramCount} RETURNING *`,
        values
    );

    console.log('Event Service: UPDATE query result for event:', result.rows[0]);

    // Get updated calendar info
    const calendarResult = await pool.query(
        'SELECT name, color FROM calendars WHERE id = $1',
        [result.rows[0].calendar_id]
    );

    const updatedEvent = result.rows[0];

    if (calendarResult.rows.length > 0) {
        updatedEvent.calendar_name = calendarResult.rows[0].name;
        updatedEvent.calendar_color = calendarResult.rows[0].color;
    }

    return updatedEvent;
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

    if (!event.recurrence_rule) {
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
    // Check if it's a recurring instance
    const isRecurringInstance = eventId.includes('_');

    let originalEventId = eventId;
    let instanceDate = null;

    if (isRecurringInstance) {
        [originalEventId, instanceDate] = eventId.split('_');
    }

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
        [userId, originalEventId]
    );

    if (accessCheck.rows.length === 0) {
        throw new Error('Event not found');
    }

    const event = accessCheck.rows[0];

    if (!['owner', 'edit', 'creator'].includes(event.access_role)) {
        throw new Error('Permission denied');
    }

    // Begin transaction
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Handle recurring event deletions
        if (isRecurringInstance && instanceDate) {
            // Add an exception date for this instance
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

            // Delete any instance record if it exists
            await client.query(
                'DELETE FROM event_instances WHERE event_id = $1 AND instance_date = $2',
                [originalEventId, instanceDate]
            );
        } else if (event.recurrence_rule && recurringOption) {
            // Handle recurring event deletion options
            if (recurringOption === 'this') {
                // Add today as exception date
                let exceptionDates = [];

                if (event.exception_dates) {
                    exceptionDates = Array.isArray(event.exception_dates)
                        ? event.exception_dates
                        : JSON.parse(event.exception_dates);
                }

                // Add today's date (or event date) as exception
                const today = new Date().toISOString().split('T')[0];
                if (!exceptionDates.includes(today)) {
                    exceptionDates.push(today);
                }

                await client.query(
                    'UPDATE events SET exception_dates = $1, updated_at = NOW() WHERE id = $2',
                    [JSON.stringify(exceptionDates), originalEventId]
                );
            } else if (recurringOption === 'future') {
                // Modify the recurrence rule to end yesterday
                try {
                    const { rrulestr, RRule } = require('rrule');
                    const rrule = rrulestr(event.recurrence_rule);
                    const options = rrule.options;

                    // Set until to yesterday
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    options.until = yesterday;

                    const newRule = new (require('rrule').RRule)(options).toString();

                    await client.query(
                        'UPDATE events SET recurrence_rule = $1, updated_at = NOW() WHERE id = $2',
                        [newRule, originalEventId]
                    );
                } catch (error) {
                    console.error(`Error modifying recurrence rule for ${originalEventId}:`, error);
                    throw new Error('Error modifying recurrence rule');
                }
            } else {
                // Delete the entire recurring event series
                await client.query('DELETE FROM events WHERE id = $1', [originalEventId]);
            }
        } else {
            // Delete normal event
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
