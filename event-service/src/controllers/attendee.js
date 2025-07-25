const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const getEventAttendees = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { eventId } = req.params;
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
            return res.status(404).json({ error: 'Event not found' });
        }
        if (accessCheck.rows[0].access_role === 'none') {
            return res.status(403).json({ error: 'Access denied' });
        }
        const attendeesResult = await pool.query(
            'SELECT * FROM event_attendees WHERE event_id = $1 ORDER BY created_at ASC',
            [eventId]
        );
        res.json(attendeesResult.rows);
    } catch (error) {
        console.error('Get attendees error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
const addAttendee = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { eventId } = req.params;
        const { email, name } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
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
            return res.status(404).json({ error: 'Event not found' });
        }
        if (!['owner', 'edit', 'creator'].includes(accessCheck.rows[0].access_role))
        {
            return res.status(403).json({ error: 'Permission denied' });
        }
        const attendeeCheck = await pool.query(
            'SELECT * FROM event_attendees WHERE event_id = $1 AND email = $2',
            [eventId, email]
        );
        if (attendeeCheck.rows.length > 0) {
            return res.status(409).json({ error: 'Attendee already exists' });
        }
        const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        const attendeeUserId = userCheck.rows.length > 0 ? userCheck.rows[0].id : null;
        const attendeeId = uuidv4();
        const result = await pool.query(
            `INSERT INTO event_attendees (
                id, event_id, user_id, email, name, response_status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
            RETURNING *`,
            [attendeeId, eventId, attendeeUserId, email, name || email.split(' @')[0],
            'pending']
        );
        console.log(`Event invitation would be sent to ${email}`);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Add attendee error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
const updateAttendeeResponse = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { eventId, attendeeId } = req.params;
        const { responseStatus } = req.body;
        if (!responseStatus || !['accepted', 'declined',
            'tentative'].includes(responseStatus)) {
            return res.status(400).json({ error: 'Valid response status required (accepted, declined, tentative)' });
        }
        const attendeeCheck = await pool.query(
            'SELECT * FROM event_attendees WHERE id = $1 AND event_id = $2',
            [attendeeId, eventId]
        );
        if (attendeeCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Attendee not found' });
        }
        const attendee = attendeeCheck.rows[0];
        if (attendee.user_id !== userId && attendee.email !== req.user.email) {
            const eventCheck = await pool.query(
                'SELECT created_by FROM events WHERE id = $1',
                [eventId]
            );
            if (eventCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Event not found' });
            }
            if (eventCheck.rows[0].created_by !== userId) {
                return res.status(403).json({ error: 'Permission denied' });
            }
        }
        const result = await pool.query(
            `UPDATE event_attendees
            SET response_status = $1, updated_at = NOW()
            WHERE id = $2 AND event_id = $3
            RETURNING *`,
            [responseStatus, attendeeId, eventId]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update attendee response error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
const removeAttendee = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { eventId, attendeeId } = req.params;
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
            return res.status(404).json({ error: 'Event not found' });
        }
        const attendeeCheck = await pool.query(
            'SELECT * FROM event_attendees WHERE id = $1 AND event_id = $2',
            [attendeeId, eventId]
        );
        if (attendeeCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Attendee not found' });
        }
        const attendee = attendeeCheck.rows[0];
        if (
            !['owner', 'edit', 'creator'].includes(accessCheck.rows[0].access_role) &&
            attendee.user_id !== userId &&
            attendee.email !== req.user.email
        ) {
            return res.status(403).json({ error: 'Permission denied' });
        }
        await pool.query(
            'DELETE FROM event_attendees WHERE id = $1 AND event_id = $2',
            [attendeeId, eventId]
        );
        res.json({ message: 'Attendee removed successfully' });
    } catch (error) {
        console.error('Remove attendee error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
module.exports = {
    getEventAttendees,
    addAttendee,
    updateAttendeeResponse,
    removeAttendee
};