const request = require('supertest');
const app = require('../../src/index');
const pool = require('../../src/db/pool');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// Explicitly mock the pool module
jest.mock('../../src/db/pool', () => ({
    query: jest.fn(),
    connect: jest.fn(() => ({
        query: jest.fn(),
        release: jest.fn(),
    })),
}));

jest.mock('axios');

describe('Auth API Integration Tests', () => {
    let userId; // Declare userId here to be accessible across tests
    let accessToken;
    let refreshToken;

    // Store mock data for database simulation
    let mockUsers = {};
    let mockRefreshTokens = {};
    let mockPasswordResetTokens = {};
    let mockUserPreferences = {};

    beforeAll(async () => {
        process.env.JWT_SECRET = 'test_jwt_secret';
        process.env.JWT_REFRESH_SECRET = 'test_jwt_refresh_secret';

        // Mock bcrypt functions directly
        jest.spyOn(bcrypt, 'genSalt').mockResolvedValue('salt');
        jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedPassword');
        jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

        // Mock jwt functions directly
        jest.spyOn(jwt, 'sign').mockImplementation((payload, secret, options) => {
            if (secret === process.env.JWT_SECRET) return 'mockAccessToken';
            if (secret === process.env.JWT_REFRESH_SECRET) return 'mockRefreshToken';
            return 'mockToken';
        });
        jest.spyOn(jwt, 'verify').mockImplementation((token, secret) => {
            if (token === 'mockAccessToken' && secret === process.env.JWT_SECRET) return { userId: userId };
            if (token === 'mockRefreshToken' && secret === process.env.JWT_REFRESH_SECRET) return { userId: userId };
            if (token === 'verificationToken' && secret === process.env.JWT_SECRET) return { userId: userId };
            if (token === 'resetToken' && secret === process.env.JWT_SECRET) return { userId: userId };
            throw new Error('invalid token');
        });

        // Mock axios for notification service calls
        axios.post.mockResolvedValue({});
    });

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset mock data for each test
        mockUsers = {};
        mockRefreshTokens = {};
        mockPasswordResetTokens = {};
        mockUserPreferences = {};

        // Always ensure a user exists for tests that require one
        // For tests that don't involve registration, manually set a user
        if (!userId) { // Only set if userId is not already set by a previous test (e.g., register test)
            userId = 'test-user-id'; 
        }
        mockUsers[userId] = { 
            id: userId, 
            email: 'test@example.com', 
            password_hash: 'hashedPassword', 
            name: 'Test User',
            is_email_verified: true,
            profile_picture: null,
            timezone: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        mockUserPreferences[userId] = {
            id: 'pref1',
            user_id: userId,
            default_view: 'month',
            working_hours: JSON.stringify({
                start: '09:00',
                end: '17:00',
                days: [1, 2, 3, 4, 5]
            }),
            notification_settings: JSON.stringify({
                event_reminders: true,
                share_notifications: true,
                email_notifications: true
            }),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Reset pool.query mock for each test
        pool.query.mockImplementation((sql, params) => {
            // Simulate database operations based on SQL query and current mock data
            if (sql.includes('SELECT * FROM users WHERE email = $1')) {
                const email = params[0];
                const user = Object.values(mockUsers).find(u => u.email === email);
                return Promise.resolve({ rows: user ? [user] : [] });
            } else if (sql.includes('SELECT * FROM users WHERE id = $1')) {
                const id = params[0];
                const user = mockUsers[id];
                return Promise.resolve({ rows: user ? [user] : [] });
            } else if (sql.includes('INSERT INTO users')) {
                const newUser = { id: params[0], email: params[1], password_hash: params[2], name: params[3], created_at: new Date().toISOString() };
                mockUsers[newUser.id] = newUser;
                return Promise.resolve({ rows: [newUser] });
            } else if (sql.includes('INSERT INTO user_preferences')) {
                const newPref = { id: params[0], user_id: params[1], default_view: params[2], working_hours: params[3], notification_settings: params[4], created_at: new Date().toISOString() };
                mockUserPreferences[newPref.user_id] = newPref;
                return Promise.resolve({ rows: [newPref] });
            } else if (sql.includes('INSERT INTO refresh_tokens')) {
                const newToken = { id: params[0], user_id: params[1], token: params[2], expires_at: params[3] };
                mockRefreshTokens[newToken.token] = newToken;
                return Promise.resolve({ rows: [newToken] });
            } else if (sql.includes('SELECT * FROM refresh_tokens WHERE user_id = $1 AND token = $2')) {
                const token = params[1];
                const storedToken = mockRefreshTokens[token];
                return Promise.resolve({ rows: storedToken ? [storedToken] : [] });
            } else if (sql.includes('DELETE FROM refresh_tokens WHERE token = $1')) {
                delete mockRefreshTokens[params[0]];
                return Promise.resolve({});
            } else if (sql.includes('UPDATE users SET is_email_verified = TRUE')) {
                const id = params[0];
                if (mockUsers[id]) {
                    mockUsers[id].is_email_verified = true;
                }
                return Promise.resolve({});
            } else if (sql.includes('INSERT INTO password_reset_tokens')) {
                const newToken = { id: params[0], user_id: params[1], token: params[2], expires_at: params[3] };
                mockPasswordResetTokens[newToken.token] = newToken;
                return Promise.resolve({ rows: [newToken] });
            } else if (sql.includes('SELECT * FROM password_reset_tokens WHERE user_id = $1 AND token = $2')) {
                const token = params[1];
                const storedToken = mockPasswordResetTokens[token];
                return Promise.resolve({ rows: storedToken ? [storedToken] : [] });
            } else if (sql.includes('UPDATE users SET password_hash = $1')) {
                const id = params[1];
                if (mockUsers[id]) {
                    mockUsers[id].password_hash = params[0];
                }
                return Promise.resolve({});
            } else if (sql.includes('DELETE FROM password_reset_tokens WHERE user_id = $1')) {
                // In a real scenario, you'd delete all tokens for the user
                Object.keys(mockPasswordResetTokens).forEach(key => {
                    if (mockPasswordResetTokens[key].user_id === params[0]) {
                        delete mockPasswordResetTokens[key];
                    }
                });
                return Promise.resolve({});
            } else if (sql.includes('SELECT id, email, name, profile_picture, timezone, created_at, updated_at FROM users WHERE id = $1')) {
                const user = mockUsers[params[0]];
                return Promise.resolve({ rows: user ? [user] : [] });
            } else if (sql.includes('UPDATE users SET')) {
                const id = params[params.length - 1]; // userId is the last parameter
                const user = mockUsers[id];
                if (!user) {
                    return Promise.resolve({ rows: [] }); // User not found
                }

                const updatedUser = { ...user };
                let paramIndex = 0;

                // Parse the SET clause to map parameters to fields
                const setClause = sql.split('SET ')[1].split(' WHERE')[0];
                const assignments = setClause.split(', ').map(s => s.trim());

                for (const assignment of assignments) {
                    if (assignment.includes('=')) {
                        const fieldName = assignment.split('=')[0].trim();
                        if (fieldName !== 'updated_at') { // updated_at is handled separately
                            updatedUser[fieldName] = params[paramIndex++];
                        }
                    }
                }
                updatedUser.updated_at = new Date().toISOString(); // Always update timestamp

                mockUsers[id] = updatedUser;
                return Promise.resolve({ rows: [updatedUser] });
            } else if (sql.includes('DELETE FROM users WHERE id = $1')) {
                delete mockUsers[params[0]];
                return Promise.resolve({});
            } else if (sql.includes('SELECT * FROM user_preferences WHERE user_id = $1')) {
                const prefs = mockUserPreferences[params[0]];
                return Promise.resolve({ rows: prefs ? [prefs] : [] });
            } else if (sql.includes('UPDATE user_preferences SET') || sql.includes('INSERT INTO user_preferences')) {
                const userIdToUpdate = params[params.length - 1];
                const existingPrefs = mockUserPreferences[userIdToUpdate];
                if (existingPrefs) {
                    const updatedPrefs = { ...existingPrefs };
                    let paramIndex = 0;
                    if (sql.includes('default_calendar_id')) {
                        updatedPrefs.default_calendar_id = params[paramIndex++];
                    }
                    if (sql.includes('default_view')) {
                        updatedPrefs.default_view = params[paramIndex++];
                    }
                    if (sql.includes('working_hours')) {
                        updatedPrefs.working_hours = JSON.parse(params[paramIndex++]);
                    }
                    if (sql.includes('notification_settings')) {
                        updatedPrefs.notification_settings = JSON.parse(params[paramIndex++]);
                    }
                    updatedPrefs.updated_at = new Date().toISOString();
                    mockUserPreferences[userIdToUpdate] = updatedPrefs;
                    return Promise.resolve({ rows: [updatedPrefs] });
                } else { // Handle insert case if preferences don't exist
                    const newPref = {
                        id: 'new-pref-id',
                        user_id: userIdToUpdate,
                        default_calendar_id: params[0],
                        default_view: params[1],
                        working_hours: JSON.parse(params[2]),
                        notification_settings: JSON.parse(params[3]),
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };
                    mockUserPreferences[userIdToUpdate] = newPref;
                    return Promise.resolve({ rows: [newPref] });
                }
            }
            return Promise.resolve({ rows: [], rowCount: 0 });
        });

        // Reset bcrypt mocks
        jest.spyOn(bcrypt, 'genSalt').mockResolvedValue('salt');
        jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedPassword');
        jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

        // Reset jwt mocks
        jest.spyOn(jwt, 'sign').mockImplementation((payload, secret, options) => {
            if (secret === process.env.JWT_SECRET) return 'mockAccessToken';
            if (secret === process.env.JWT_REFRESH_SECRET) return 'mockRefreshToken';
            return 'mockToken';
        });
        jest.spyOn(jwt, 'verify').mockImplementation((token, secret) => {
            if (token === 'mockAccessToken' && secret === process.env.JWT_SECRET) return { userId: userId };
            if (token === 'mockRefreshToken' && secret === process.env.JWT_REFRESH_SECRET) return { userId: userId };
            if (token === 'verificationToken' && secret === process.env.JWT_SECRET) return { userId: userId };
            if (token === 'resetToken' && secret === process.env.JWT_SECRET) return { userId: userId };
            throw new Error('invalid token');
        });
        axios.post.mockResolvedValue({});
    });

    it('should register a new user', async () => {
        // Clear mock user for this specific test to simulate new registration
        mockUsers = {};
        mockUserPreferences = {};

        const res = await request(app)
            .post('/auth/register')
            .send({
                email: 'register@example.com',
                password: 'password123',
                name: 'Register User',
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('message', 'User created successfully');
        expect(res.body).toHaveProperty('userId');
        userId = res.body.userId; // Update userId for subsequent tests
    });

    it('should log in a user and return tokens', async () => {
        // Ensure user exists for login test
        mockUsers[userId] = { id: userId, email: 'login@example.com', password_hash: 'hashedPassword', name: 'Login User' };

        const res = await request(app)
            .post('/auth/login')
            .send({
                email: 'login@example.com',
                password: 'password123',
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('accessToken', 'mockAccessToken');
        expect(res.body).toHaveProperty('refreshToken', 'mockRefreshToken');
        expect(res.body.user).toHaveProperty('id', userId);
        accessToken = res.body.accessToken;
        refreshToken = res.body.refreshToken;
    });

    it('should refresh access token', async () => {
        // Manually add refresh token to mockRefreshTokens for refresh test
        mockRefreshTokens[refreshToken] = { token: refreshToken, user_id: userId, expires_at: new Date(Date.now() + 100000).toISOString() };
        mockUsers[userId] = { id: userId, email: 'test@example.com' }; // Ensure user exists for refresh

        const res = await request(app)
            .post('/auth/refresh')
            .send({ refreshToken });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('accessToken', 'mockAccessToken');
    });

    it('should log out a user', async () => {
        const res = await request(app)
            .post('/auth/logout')
            .send({ refreshToken });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('message', 'Logged out successfully');
    });

    it('should verify user email', async () => {
        // Ensure user exists for verification
        mockUsers[userId] = { id: userId, is_email_verified: false };

        const res = await request(app)
            .get('/auth/verify-email/verificationToken');

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('message', 'Email verified successfully');
    });

    it('should request password reset', async () => {
        // Ensure user exists for password reset request
        mockUsers[userId] = { id: userId, email: 'reset@example.com' };

        const res = await request(app)
            .post('/auth/request-password-reset')
            .send({ email: 'reset@example.com' });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('message', 'If the email exists, a password reset link has been sent');
    });

    it('should reset password', async () => {
        // Ensure password reset token exists
        mockPasswordResetTokens['resetToken'] = { token: 'resetToken', user_id: userId, expires_at: new Date(Date.now() + 100000).toISOString() };
        mockUsers[userId] = { id: userId, password_hash: 'oldHashedPassword' }; // Ensure user exists

        const res = await request(app)
            .post('/auth/reset-password')
            .send({
                token: 'resetToken',
                password: 'newPassword123',
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('message', 'Password reset successfully');
    });

    it('should get user profile', async () => {
        // Ensure user exists for profile retrieval
        mockUsers[userId] = { id: userId, email: 'profile@example.com', name: 'Profile User' };

        const res = await request(app)
            .get('/auth/profile')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('id', userId);
        expect(res.body).toHaveProperty('email', 'profile@example.com');
    });

    it('should validate token', async () => {
        const res = await request(app)
            .get('/auth/validate-token')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('valid', true);
        expect(res.body).toHaveProperty('userId', userId);
    });

    it('should update user profile', async () => {
        // Ensure user exists for profile update
        mockUsers[userId] = { id: userId, email: 'profile@example.com', name: 'Old Name', timezone: 'Old Timezone' };

        const res = await request(app)
            .patch('/auth/profile')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                name: 'Updated Name',
                timezone: 'America/New_York',
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('name', 'Updated Name');
        expect(res.body).toHaveProperty('timezone', 'America/New_York');
    });

    it('should change user password', async () => {
        // Ensure user exists for password change
        mockUsers[userId] = { id: userId, password_hash: 'oldHashedPassword' };

        const res = await request(app)
            .post('/auth/change-password')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                currentPassword: 'oldPassword',
                newPassword: 'newPassword123',
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('message', 'Password changed successfully');
    });

    it('should delete user account', async () => {
        // Ensure user exists for account deletion
        mockUsers[userId] = { id: userId, password_hash: 'hashedPassword' };

        const res = await request(app)
            .delete('/auth/account')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                password: '123',
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('message', 'Account deleted successfully');
    });

    it('should get user preferences', async () => {
        // Ensure user preferences exist
        mockUserPreferences[userId] = { default_view: 'month', working_hours: {}, notification_settings: {} };

        const res = await request(app)
            .get('/auth/preferences')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('default_view', 'month');
    });

    it('should update user preferences', async () => {
        // Ensure user preferences exist
        mockUserPreferences[userId] = { id: 'pref1', user_id: userId, default_view: 'month' };

        const res = await request(app)
            .patch('/auth/preferences')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ default_view: 'week' });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('default_view', 'week');
    });
});