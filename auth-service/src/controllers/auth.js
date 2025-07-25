const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const authService = require('../services/auth');

const register = async (req, res) => {
    try {
        const { email, password, name } = req.body;
        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Email, password, and name are required' });
        }
        const emailRegex = /^[\S]+@[\S]+\.[\S]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }
        const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return res.status(409).json({ error: 'User already exists' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const userId = uuidv4();
        const defaultCalendarId = uuidv4(); // Generate a UUID for the default calendar
        await pool.query(
            'INSERT INTO users (id, email, password_hash, name, created_at) VALUES ($1, $2, $3, $4, NOW())',
            [userId, email, hashedPassword, name]
        );

        // Create a default calendar for the new user
        await pool.query(
            'INSERT INTO calendars (id, owner_id, name, is_default, created_at) VALUES ($1, $2, $3, TRUE, NOW())',
            [defaultCalendarId, userId, 'My Calendar']
        );
        const user = { id: userId, email, name }; // Create user object for token generation

        const accessToken = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );
        const refreshToken = jwt.sign(
            { userId: user.id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: '7d' }
        );
        await pool.query(
            'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL \'7 days\')',
            [uuidv4(), user.id, refreshToken]
        );
        const defaultWorkingHours = JSON.stringify({
            start: '09:00',
            end: '17:00',
            days: [1, 2, 3, 4, 5]
        });
        const defaultNotificationSettings = JSON.stringify({
            event_reminders: true,
            share_notifications: true,
            email_notifications: true
        });
        await pool.query(
            'INSERT INTO user_preferences (id, user_id, default_view, working_hours, notification_settings, default_calendar_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
            [uuidv4(), userId, 'month', defaultWorkingHours, defaultNotificationSettings, defaultCalendarId]
        );
        console.log(`Verification email would be sent to ${email}`);
        res.status(201).json({
            message: 'User created successfully',
            userId: user.id
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const accessToken = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );
        const refreshToken = jwt.sign(
            { userId: user.id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: '7d' }
        );
        await pool.query(
            'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL \'7 days\')',
            [uuidv4(), user.id, refreshToken]
        );
        res.json({
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(401).json({ error: 'Refresh token required' });
        }
        try {
            const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
            const tokenResult = await pool.query(
                'SELECT * FROM refresh_tokens WHERE user_id = $1 AND token = $2 AND expires_at > NOW()',
                [payload.userId, refreshToken]
            );
            if (tokenResult.rows.length === 0) {
                return res.status(401).json({ error: 'Invalid refresh token' });
            }
            const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [payload.userId]);
            if (userResult.rows.length === 0) {
                return res.status(401).json({ error: 'User not found' });
            }
            const user = userResult.rows[0];
            const accessToken = jwt.sign(
                { userId: user.id, email: user.email },
                process.env.JWT_SECRET,
                { expiresIn: '15m' }
            );
            res.json({ accessToken });
        } catch (error) {
            if (error instanceof jwt.JsonWebTokenError) {
                return res.status(401).json({ error: 'Invalid refresh token' });
            }
            throw error;
        }
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
        }
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;
        res.json({ message: 'Email verified successfully' });
    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(200).json({ message: 'If the email exists, a password reset link has been sent' });
        }
        const user = userResult.rows[0];
        const resetToken = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        console.log(`Password reset email would be sent to ${email} with token ${resetToken}`);
        res.status(200).json({ message: 'If the email exists, a password reset link has been sent' });
    } catch (error) {
        console.error('Password reset request error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) {
            return res.status(400).json({ error: 'Token and password are required' });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }
        try {
            const payload = jwt.verify(token, process.env.JWT_SECRET);
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            await pool.query(
                'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
                [hashedPassword, payload.userId]
            );
            res.json({ message: 'Password reset successfully' });
        } catch (error) {
            if (error instanceof jwt.JsonWebTokenError) {
                return res.status(401).json({ error: 'Invalid or expired token' });
            }
            throw error;
        }
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getProfile = async (req, res) => {
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
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const validateToken = async (req, res) => {
    res.json({ valid: true, userId: req.user.userId });
};

const updateProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const updatedUser = await authService.updateProfile(userId, req.body);
        res.json(updatedUser);
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    register,
    login,
    refreshToken,
    logout,
    verifyEmail,
    requestPasswordReset,
    resetPassword,
    getProfile,
    validateToken,
    updateProfile
};