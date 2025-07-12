const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');

/**
 * Get user preferences
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUserPreferences = async (req, res) => {
    try {
        const userId = req.user.userId;

        // Get user preferences
        const prefsResult = await pool.query(
            'SELECT * FROM user_preferences WHERE user_id = $1',
            [userId]
        );

        // If no preferences found, return default values
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

/**
 * Update user preferences
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updatePreferences = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { default_calendar_id, default_view, working_hours, notification_settings } = req.body;

        // Check if preferences exist
        const checkResult = await pool.query(
            'SELECT id FROM user_preferences WHERE user_id = $1',
            [userId]
        );

        let result;

        if (checkResult.rows.length === 0) {
            // Create new preferences
            const prefsId = uuidv4();

            result = await pool.query(
                `INSERT INTO user_preferences (
          id, user_id, default_calendar_id, default_view, working_hours, notification_settings, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING *`,
                [
                    prefsId,
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
                ]
            );
        } else {
            // Update existing preferences
            const updates = [];
            const values = [];
            let paramCount = 1;

            if (default_calendar_id !== undefined) {
                updates.push(`default_calendar_id = $${paramCount}`);
                values.push(default_calendar_id);
                paramCount++;
            }

            if (default_view !== undefined) {
                updates.push(`default_view = $${paramCount}`);
                values.push(default_view);
                paramCount++;
            }

            if (working_hours !== undefined) {
                updates.push(`working_hours = $${paramCount}`);
                values.push(JSON.stringify(working_hours));
                paramCount++;
            }

            if (notification_settings !== undefined) {
                updates.push(`notification_settings = $${paramCount}`);
                values.push(JSON.stringify(notification_settings));
                paramCount++;
            }

            updates.push(`updated_at = NOW()`);

            if (updates.length <= 1) {
                return res.status(400).json({ error: 'No fields to update' });
            }

            values.push(userId);

            result = await pool.query(
                `UPDATE user_preferences 
         SET ${updates.join(', ')} 
         WHERE user_id = $${paramCount}
         RETURNING *`,
                values
            );
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update preferences error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get user preferences for another user (admin only)
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUserPreferencesById = async (req, res) => {
    try {
        const { id } = req.params;

        // Only allow this for the user's own preferences
        if (id !== req.user.userId) {
            return res.status(403).json({ error: 'Permission denied' });
        }

        // Get user preferences
        const prefsResult = await pool.query(
            'SELECT * FROM user_preferences WHERE user_id = $1',
            [id]
        );

        if (prefsResult.rows.length === 0) {
            return res.status(404).json({ error: 'Preferences not found' });
        }

        res.json(prefsResult.rows[0]);
    } catch (error) {
        console.error('Get preferences by ID error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getUserPreferences,
    updatePreferences,
    getUserPreferencesById
};