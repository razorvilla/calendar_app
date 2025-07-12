const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');

const getEventAttendees = async (userId, eventId) => {
    // Check event access
    const accessCheck = await pool.query(
        `SELECT e.*,
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

    if (accessCheck.rows.length === 0) {
        throw new Error('Event not found');
    }

    if (accessCheck.rows[0].access_role === 'none') {
        throw new Error('Access denied');
    }

    // Get attendees
    const attendeesResult = await pool.query(
        'SELECT * FROM event_attendees WHERE event_id = $1 ORDER BY created_at ASC',
        [eventId]
    );

    return attendeesResult.rows;
};

const addAttendee = async (userId, eventId, email, name) => {
    // Validate input
    if (!email) {
        throw new Error('Email is required');
    }

    // Check event access
    const accessCheck = await pool.query(
        `SELECT e.*,
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
        throw new Error('Event not found');
    }

    if (!['owner', 'edit', 'creator'].includes(accessCheck.rows[0].access_role)) {
        throw new Error('Permission denied');
    }

    // Check if attendee already exists
    const attendeeCheck = await pool.query(
        'SELECT * FROM event_attendees WHERE event_id = $1 AND email = $2',
        [eventId, email]
    );

    if (attendeeCheck.rows.length > 0) {
        throw new Error('Attendee already exists');
    }

    // Check if user exists
    const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    const attendeeUserId = userCheck.rows.length > 0 ? userCheck.rows[0].id : null;

    // Create attendee
    const attendeeId = uuidv4();
    const result = await pool.query(
        `INSERT INTO event_attendees (
        id, event_id, user_id, email, name, response_status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *`,
        [attendeeId, eventId, attendeeUserId, email, name || email.split('@')[0], 'pending']
    );

    // TODO: Send invitation email
    console.log(`Event invitation would be sent to ${email}`);

    return result.rows[0];
};

const updateAttendeeResponse = async (userId, eventId, attendeeId, responseStatus) => {
    // Validate input
    if (!responseStatus || !['accepted', 'declined', 'tentative'].includes(responseStatus)) {
        throw new Error('Valid response status required (accepted, declined, tentative)');
    }

    // Check if user is the attendee
    const attendeeCheck = await pool.query(
        'SELECT * FROM event_attendees WHERE id = $1 AND event_id = $2',
        [attendeeId, eventId]
    );

    if (attendeeCheck.rows.length === 0) {
        throw new Error('Attendee not found');
    }

    const attendee = attendeeCheck.rows[0];

    // Check if user has permission to update the response
    if (attendee.user_id !== userId && attendee.email !== userId) { // Assuming userId can be email for unreg users
        // Check if user is event creator
        const eventCheck = await pool.query(
            'SELECT created_by FROM events WHERE id = $1',
            [eventId]
        );

        if (eventCheck.rows.length === 0) {
            throw new Error('Event not found');
        }

        if (eventCheck.rows[0].created_by !== userId) {
            throw new Error('Permission denied');
        }
    }

    // Update response
    const result = await pool.query(
        `UPDATE event_attendees 
       SET response_status = $1, updated_at = NOW() 
       WHERE id = $2 AND event_id = $3
       RETURNING *`,
        [responseStatus, attendeeId, eventId]
    );

    return result.rows[0];
};

const removeAttendee = async (userId, eventId, attendeeId) => {
    // Check event access
    const accessCheck = await pool.query(
        `SELECT e.*,
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
        throw new Error('Event not found');
    }

    // Get attendee
    const attendeeCheck = await pool.query(
        'SELECT * FROM event_attendees WHERE id = $1 AND event_id = $2',
        [attendeeId, eventId]
    );

    if (attendeeCheck.rows.length === 0) {
        throw new Error('Attendee not found');
    }

    const attendee = attendeeCheck.rows[0];

    // Check if user has permission to remove the attendee
    if (
        !['owner', 'edit', 'creator'].includes(accessCheck.rows[0].access_role) &&
        attendee.user_id !== userId &&
        attendee.email !== userId // Assuming userId can be email for unreg users
    ) {
        throw new Error('Permission denied');
    }

    // Remove attendee
    await pool.query(
        'DELETE FROM event_attendees WHERE id = $1 AND event_id = $2',
        [attendeeId, eventId]
    );

    return { message: 'Attendee removed successfully' };
};

module.exports = {
    getEventAttendees,
    addAttendee,
    updateAttendeeResponse,
    removeAttendee
};