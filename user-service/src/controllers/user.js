const pool = require('../db/pool');
const bcrypt = require('bcrypt');
const getCurrentUser = async (req, res) => {
    try {
        const userId = req.user.userId;
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
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
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
        const userResult = await pool.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [userId]
        );
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
const searchUsers = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query || query.length < 3) {
            return res.status(400).json({ error: 'Search query must be at least 3 characters' });
        }
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