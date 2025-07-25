const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const getEventReminders = async (req, res) => {
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
        const remindersResult = await pool.query(
            'SELECT * FROM reminders WHERE event_id = $1 AND user_id = $2 ORDER BY minutes_before ASC',
            [eventId, userId]
        );
        res.json(remindersResult.rows);
    } catch (error) {
        console.error('Get reminders error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
const createReminder = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { eventId } = req.params;
        const { minutesBefore, method } = req.body;
        if (!minutesBefore || !method) {
            return res.status(400).json({ error: 'Minutes before and method are required' });
        }
        if (!['notification', 'email'].includes(method)) {
            return res.status(400).json({ error: 'Method must be notification or email' });
        }
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
        const reminderCheck = await pool.query(
            'SELECT * FROM reminders WHERE event_id = $1 AND user_id = $2 AND minutes_before = $3 AND method = $4',
            [eventId, userId, minutesBefore, method]
        );
        if (reminderCheck.rows.length > 0) {
            return res.status(409).json({ error: 'Reminder already exists' });
        }
        const reminderId = uuidv4();
        const result = await pool.query(
            `INSERT INTO reminders (
                id, event_id, user_id, minutes_before, method, created_at
            ) VALUES ($1, $2, $3, $4, $5, NOW())
            RETURNING *`,
            [reminderId, eventId, userId, minutesBefore, method]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create reminder error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
const deleteReminder = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const reminderCheck = await pool.query(
            'SELECT * FROM reminders WHERE id = $1 AND user_id = $2',
            [id, userId]
        );
        if (reminderCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Reminder not found' });
        }
        await pool.query('DELETE FROM reminders WHERE id = $1', [id]);
        res.json({ message: 'Reminder deleted successfully' });
    } catch (error) {
        console.error('Delete reminder error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
module.exports = {
    getEventReminders,
    createReminder,
    deleteReminder
};