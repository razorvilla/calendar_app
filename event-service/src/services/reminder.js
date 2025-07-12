const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');

const getEventReminders = async (userId, eventId) => {
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

    // Get reminders for user
    const remindersResult = await pool.query(
        'SELECT * FROM reminders WHERE event_id = $1 AND user_id = $2 ORDER BY minutes_before ASC',
        [eventId, userId]
    );

    return remindersResult.rows;
};

const createReminder = async (userId, eventId, minutesBefore, method) => {
    // Validate input
    if (!minutesBefore || !method) {
        throw new Error('Minutes before and method are required');
    }

    if (!['notification', 'email'].includes(method)) {
        throw new Error('Method must be notification or email');
    }

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

    // Check if reminder already exists
    const reminderCheck = await pool.query(
        'SELECT * FROM reminders WHERE event_id = $1 AND user_id = $2 AND minutes_before = $3 AND method = $4',
        [eventId, userId, minutesBefore, method]
    );

    if (reminderCheck.rows.length > 0) {
        throw new Error('Reminder already exists');
    }

    // Create reminder
    const reminderId = uuidv4();
    const result = await pool.query(
        `INSERT INTO reminders (
        id, event_id, user_id, minutes_before, method, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *`,
        [reminderId, eventId, userId, minutesBefore, method]
    );

    return result.rows[0];
};

const deleteReminder = async (userId, id) => {
    // Check reminder ownership
    const reminderCheck = await pool.query(
        'SELECT * FROM reminders WHERE id = $1 AND user_id = $2',
        [id, userId]
    );

    if (reminderCheck.rows.length === 0) {
        throw new Error('Reminder not found');
    }

    // Delete reminder
    await pool.query('DELETE FROM reminders WHERE id = $1', [id]);

    return { message: 'Reminder deleted successfully' };
};

module.exports = {
    getEventReminders,
    createReminder,
    deleteReminder
};