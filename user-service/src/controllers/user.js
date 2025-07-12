const pool = require('../db/pool');
const bcrypt = require('bcrypt');

/**
 * Get current user profile
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getCurrentUser = async (req, res) => {
    try {
        const userId = req.user.userId;

        // Get user profile
        const userResult = await pool.query(
            'SELECT id, email, name, profile_picture, timezone, created_at, updated_at FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(userResult.rows[0]);
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get user by ID
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        // Get user profile (limited info for other users)
        const userResult = await pool.query(
            'SELECT id, name, profile_picture FROM users WHERE id = $1',
            [id]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(userResult.rows[0]);
    } catch (error) {
        console.error('Get user by ID error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Update user profile
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { name, timezone, profile_picture } = req.body;

        // Build update query dynamically based on provided fields
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

        // Add update timestamp
        updateFields.push(`updated_at = NOW()`);

        // Return if no fields to update
        if (updateFields.length <= 1) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        // Add the user ID to the values array
        values.push(userId);

        // Construct the query
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

/**
 * Change password
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
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

        // Get current user with password hash
        const userResult = await pool.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];

        // Verify current password
        const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password
        await pool.query(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
            [hashedPassword, userId]
        );

        // Invalidate all refresh tokens (for security)
        await pool.query(
            'DELETE FROM refresh_tokens WHERE user_id = $1',
            [userId]
        );

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get users by email for search/autocomplete
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const searchUsers = async (req, res) => {
    try {
        const { query } = req.query;

        if (!query || query.length < 3) {
            return res.status(400).json({ error: 'Search query must be at least 3 characters' });
        }

        // Search users by email or name
        const searchResult = await pool.query(
            `SELECT id, email, name, profile_picture 
       FROM users 
       WHERE email ILIKE $1 OR name ILIKE $1
       LIMIT 10`,
            [`%${query}%`]
        );

        res.json(searchResult.rows);
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getCurrentUser,
    getUserById,
    updateProfile,
    changePassword,
    searchUsers
};