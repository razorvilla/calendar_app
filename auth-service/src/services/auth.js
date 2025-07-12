const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const axios = require('axios');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004';

const register = async (userData) => {
    console.log('Auth Service: Registering user with data:', userData);
    const { email, password, name } = userData;

    if (!email || !password || !name) {
        throw new Error('Email, password, and name are required');
    }

    const emailRegex = /^[\S]+@[\S]+\.[\S]+$/;
    if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!passwordRegex.test(password)) {
        throw new Error('Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.');
    }

    const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
        throw new Error('User already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userId = uuidv4();
    await pool.query(
        'INSERT INTO users (id, email, password_hash, name, created_at) VALUES ($1, $2, $3, $4, NOW())',
        [userId, email, hashedPassword, name]
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
        'INSERT INTO user_preferences (id, user_id, default_view, working_hours, notification_settings, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
        [uuidv4(), userId, 'month', defaultWorkingHours, defaultNotificationSettings]
    );

    // Send verification email
    try {
        const verificationToken = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1d' });
        await axios.post(`${NOTIFICATION_SERVICE_URL}/v1/notifications/send-email`, {
            to: email,
            subject: 'Verify your email for Calendar App',
            template: 'email-verification',
            context: {
                verificationLink: `http://localhost:5173/verify-email/${verificationToken}`
            }
        });
    } catch (error) {
        console.error('Error sending verification email:', error.message);
    }

    return { message: 'User created successfully', userId };
};

    const login = async (credentials, res) => {
    const { email, password, mfaToken } = credentials;

    if (!email || !password) {
        throw new Error('Email and password are required');
    }

    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
        throw new Error('Invalid credentials');
    }

    const user = userResult.rows[0];

    // Check for account lockout
    if (user.lockout_until && new Date(user.lockout_until) > new Date()) {
        const remainingTime = Math.ceil((new Date(user.lockout_until).getTime() - new Date().getTime()) / (1000 * 60));
        throw new Error(`Account locked. Please try again in ${remainingTime} minutes.`);
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
        // Increment failed login attempts
        const newAttempts = user.failed_login_attempts + 1;
        let lockoutUntil = null;

        if (newAttempts >= 5) { // Lock after 5 failed attempts
            lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
            await pool.query(
                'UPDATE users SET failed_login_attempts = $1, lockout_until = $2 WHERE id = $3',
                [newAttempts, lockoutUntil, user.id]
            );
            throw new Error(`Too many failed login attempts. Account locked for 15 minutes.`);
        } else {
            await pool.query(
                'UPDATE users SET failed_login_attempts = $1 WHERE id = $2',
                [newAttempts, user.id]
            );
            throw new Error('Invalid credentials');
        }
    }

    // Reset failed login attempts and lockout on successful login
    await pool.query(
        'UPDATE users SET failed_login_attempts = 0, lockout_until = NULL WHERE id = $1',
        [user.id]
    );

    // MFA Check
    if (user.mfa_enabled) {
        if (!mfaToken) {
            return { requiresMfa: true, userId: user.id };
        }

        const verified = speakeasy.totp.verify({
            secret: user.mfa_secret,
            encoding: 'base32',
            token: mfaToken,
        });

        if (!verified) {
            throw new Error('Invalid MFA token');
        }
    }

    const accessToken = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
    );

    // Invalidate any existing refresh tokens for the user on new login
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [user.id]);

    const refreshToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
    );

    await pool.query(
        "INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL '7 days')",
        [uuidv4(), user.id, refreshToken]
    );

    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    return {
        accessToken,
        user: {
            id: user.id,
            email: user.email,
            name: user.name
        }
    };
};

const refreshToken = async (token) => {
    if (!token) {
        throw new Error('Refresh token required');
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

        const tokenResult = await pool.query(
            'SELECT * FROM refresh_tokens WHERE user_id = $1 AND token = $2 AND expires_at > NOW()',
            [payload.userId, token]
        );

        if (tokenResult.rows.length === 0) {
            throw new Error('Invalid refresh token');
        }

        // Invalidate the used refresh token
        await pool.query('DELETE FROM refresh_tokens WHERE id = $1', [tokenResult.rows[0].id]);

        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [payload.userId]);
        if (userResult.rows.length === 0) {
            throw new Error('User not found');
        }

        const user = userResult.rows[0];

        const accessToken = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        const newRefreshToken = jwt.sign(
            { userId: user.id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: '7d' }
        );

        await pool.query(
            "INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL '7 days')",
            [uuidv4(), user.id, newRefreshToken]
        );

        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        });

        return { accessToken };
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            throw new Error('Invalid refresh token');
        }
        throw error;
    }
};

const logout = async (refreshToken) => {
    if (refreshToken) {
        await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    }
    return { message: 'Logged out successfully' };
};

const verifyEmail = async (token) => {
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        await pool.query(
            'UPDATE users SET is_email_verified = TRUE, updated_at = NOW() WHERE id = $1',
            [payload.userId]
        );

        return { message: 'Email verified successfully' };
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            throw new Error('Invalid or expired verification token');
        }
        throw error;
    }
};

const requestPasswordReset = async (email) => {
    if (!email) {
        throw new Error('Email is required');
    }

    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
        return { message: 'If the email exists, a password reset link has been sent' };
    }

    const user = userResult.rows[0];

    const resetToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    await pool.query(
        'INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL \'1 hour\')',
        [uuidv4(), user.id, resetToken]
    );

    try {
        await axios.post(`${NOTIFICATION_SERVICE_URL}/v1/notifications/send-email`, {
            to: email,
            subject: 'Password Reset Request for Calendar App',
            template: 'password-reset',
            context: {
                resetLink: `http://localhost:5173/reset-password/${resetToken}`
            }
        });
    } catch (error) {
        console.error('Error sending password reset email:', error.message);
    }

    return { message: 'If the email exists, a password reset link has been sent' };
};

const resetPassword = async (token, newPassword) => {
    if (!token || !newPassword) {
        throw new Error('Token and new password are required');
    }

    if (newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters');
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        const tokenResult = await pool.query(
            'SELECT * FROM password_reset_tokens WHERE user_id = $1 AND token = $2 AND expires_at > NOW()',
            [payload.userId, token]
        );

        if (tokenResult.rows.length === 0) {
            throw new Error('Invalid or expired token');
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await pool.query(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
            [hashedPassword, payload.userId]
        );

        await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [payload.userId]);

        return { message: 'Password reset successfully' };
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            throw new Error('Invalid or expired token');
        }
        throw error;
    }
};

const getProfile = async (userId) => {
    const userResult = await pool.query(
        'SELECT id, email, name, profile_picture, timezone, created_at, updated_at FROM users WHERE id = $1',
        [userId]
    );

    if (userResult.rows.length === 0) {
        throw new Error('User not found');
    }

    return userResult.rows[0];
};

const validateToken = (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return { valid: true, userId: decoded.userId };
    } catch (error) {
        return { valid: false, error: error.message };
    }
};

const updateProfile = async (userId, userData) => {
    const { name, timezone, profile_picture } = userData;

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
        throw new Error('No fields to update');
    }

    values.push(userId);

    const queryText = `\n        UPDATE users\n        SET ${updateFields.join(', ')}\n        WHERE id = $${paramCount}\n        RETURNING id, email, name, profile_picture, timezone, created_at, updated_at\n    `;

    const result = await pool.query(queryText, values);

    if (result.rows.length === 0) {
        throw new Error('User not found');
    }

    return result.rows[0];
};

const changePassword = async (userId, currentPassword, newPassword) => {
    if (!currentPassword || !newPassword) {
        throw new Error('Current password and new password are required');
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
        throw new Error('Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.');
    }

    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);

    if (userResult.rows.length === 0) {
        throw new Error('User not found');
    }

    const user = userResult.rows[0];

    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!validPassword) {
        throw new Error('Current password is incorrect');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await pool.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [hashedPassword, userId]
    );

    // Invalidate all refresh tokens for the user
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);

    return { message: 'Password changed successfully' };
};

const deleteAccount = async (userId, password) => {
    if (!password) {
        throw new Error('Password is required');
    }

    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);

    if (userResult.rows.length === 0) {
        throw new Error('User not found');
    }

    const user = userResult.rows[0];

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
        throw new Error('Password is incorrect');
    }

    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    return { message: 'Account deleted successfully' };
};

const getPreferences = async (userId) => {
    const prefsResult = await pool.query(
        'SELECT * FROM user_preferences WHERE user_id = $1',
        [userId]
    );

    if (prefsResult.rows.length === 0) {
        return {
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
    }

    return prefsResult.rows[0];
};

const updatePreferences = async (userId, preferencesData) => {
    const { default_calendar_id, default_view, working_hours, notification_settings } = preferencesData;

    const checkResult = await pool.query(
        'SELECT * FROM user_preferences WHERE user_id = $1',
        [userId]
    );

    let query, values;

    if (checkResult.rows.length === 0) {
        query = `\n            INSERT INTO user_preferences (\n                id, user_id, default_calendar_id, default_view, working_hours, notification_settings, created_at\n            ) VALUES ($1, $2, $3, $4, $5, $6, NOW())\n            RETURNING *\n        `;

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
        query = `\n            UPDATE user_preferences SET\n                default_calendar_id = COALESCE($1, default_calendar_id),\n                default_view = COALESCE($2, default_view),\n                working_hours = COALESCE($3, working_hours),\n                notification_settings = COALESCE($4, notification_settings),\n                updated_at = NOW()\n            WHERE user_id = $5\n            RETURNING *\n        `;

        values = [
            default_calendar_id,
            default_view,
            working_hours ? JSON.stringify(working_hours) : null,
            notification_settings ? JSON.stringify(notification_settings) : null,
            userId
        ];
    }

    const result = await pool.query(query, values);
    return result.rows[0];
};

const generateMfaSecret = async (userId) => {
    const secret = speakeasy.generateSecret({
        length: 20,
        name: `CalendarApp (${userId})`,
    });

    await pool.query(
        'UPDATE users SET mfa_secret = $1 WHERE id = $2',
        [secret.base32, userId]
    );

    const qrcodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    return { secret: secret.base32, qrcodeUrl };
};

const verifyMfaToken = async (userId, token) => {
    const userResult = await pool.query('SELECT mfa_secret FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
        throw new Error('User not found');
    }

    const { mfa_secret } = userResult.rows[0];
    if (!mfa_secret) {
        throw new Error('MFA not set up for this user');
    }

    const verified = speakeasy.totp.verify({
        secret: mfa_secret,
        encoding: 'base32',
        token: token,
    });

    return { verified };
};

const enableMfa = async (userId, secret) => {
    await pool.query(
        'UPDATE users SET mfa_enabled = TRUE, mfa_secret = $1 WHERE id = $2',
        [secret, userId]
    );
    return { message: 'MFA enabled successfully' };
};

const disableMfa = async (userId) => {
    await pool.query(
        'UPDATE users SET mfa_enabled = FALSE, mfa_secret = NULL WHERE id = $1',
        [userId]
    );
    return { message: 'MFA disabled successfully' };
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
    updateProfile,
    changePassword,
    deleteAccount,
    getPreferences,
    updatePreferences,
    generateMfaSecret,
    verifyMfaToken,
    enableMfa,
    disableMfa
};
