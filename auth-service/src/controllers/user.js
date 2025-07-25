const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const pool = require('../db/pool');

const updateProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { name, timezone, profile_picture } = req.body;
        let updateFields = [];
        let values = [];
        let paramCount = 1;
        if (name !== undefined) {
            updateFields.push(`name = $${paramCount}`);
            values.push(name);
            paramCount++;
        }
        if (timezone !== undefined) {
            updateFields.push(`timezone = $${paramCount}`);
            values.push(timezone);
            paramCount++;
        }
        if (profile_picture !== undefined) {
            updateFields.push(`profile_picture = $${paramCount}`);
            values.push(profile_picture);
            paramCount++;
        }
        updateFields.push(`updated_at = NOW()`);
        if (updateFields.length <= 1) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        values.push(userId);
        const queryText = `
            UPDATE users
            SET ${updateFields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING id, email, name, profile_picture, timezone, created_at, updated_at
        `;
        const result = await pool.query(queryText, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const changePassword = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'New password must be at least 8 characters' });
        }
        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userResult.rows[0];
        const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        await pool.query(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
            [hashedPassword, userId]
        );
        await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const deleteAccount = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ error: 'Password is required' });
        }
        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userResult.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Password is incorrect' });
        }
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);
        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getPreferences = async (req, res) => {
    try {
        const userId = req.user.userId;
        const prefsResult = await pool.query(
            'SELECT * FROM user_preferences WHERE user_id = $1',
            [userId]
        );
        if (prefsResult.rows.length === 0) {
            const defaultPrefs = {
                default_view: 'month',
                working_hours: {
                    start: '09:00',
                    end: '17:00',
                    days: [1, 2, 3, 4, 5]
                },
                notification_settings: {
                    event_reminders: true,
                    share_notifications: true,
                    email_notifications: true
                }
            };
            return res.json(defaultPrefs);
        }
        res.json(prefsResult.rows[0]);
    } catch (error) {
        console.error('Get preferences error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updatePreferences = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { default_calendar_id, default_view, working_hours, notification_settings } = req.body;
        const checkResult = await pool.query(
            'SELECT * FROM user_preferences WHERE user_id = $1',
            [userId]
        );
        let query, values;
        if (checkResult.rows.length === 0) {
            query = `
                INSERT INTO user_preferences (
                    id, user_id, default_calendar_id, default_view, working_hours,
                    notification_settings, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
                RETURNING *
            `;
            values = [
                uuidv4(),
                userId,
                default_calendar_id,
                default_view || 'month',
                working_hours ? JSON.stringify(working_hours) : JSON.stringify({
                    start: '09:00',
                    end: '17:00',
                    days: [1, 2, 3, 4, 5]
                }),
                notification_settings ? JSON.stringify(notification_settings) : JSON.stringify({
                    event_reminders: true,
                    share_notifications: true,
                    email_notifications: true
                })
            ];
        } else {
            query = `
                UPDATE user_preferences SET
                    default_calendar_id = COALESCE($1, default_calendar_id),
                    default_view = COALESCE($2, default_view),
                    working_hours = COALESCE($3, working_hours),
                    notification_settings = COALESCE($4, notification_settings),
                    updated_at = NOW()
                WHERE user_id = $5
                RETURNING *
            `;
            values = [
                default_calendar_id,
                default_view,
                working_hours ? JSON.stringify(working_hours) : null,
                notification_settings ? JSON.stringify(notification_settings) : null,
                userId
            ];
        }
        const result = await pool.query(query, values);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update preferences error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    updateProfile,
    changePassword,
    deleteAccount,
    getPreferences,
    updatePreferences
};