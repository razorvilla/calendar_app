const authService = require('../../src/services/auth');
const pool = require('../../src/db/pool');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

jest.mock('../../src/db/pool');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('axios');
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'mock-uuid')
}));

describe('Auth Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'test_jwt_secret';
        process.env.JWT_REFRESH_SECRET = 'test_jwt_refresh_secret';
    });

    describe('register', () => {
        it('should register a new user and send verification email', async () => {
            const userData = { email: 'test@example.com', password: 'password123', name: 'Test User' };
            bcrypt.genSalt.mockResolvedValue('salt');
            bcrypt.hash.mockResolvedValue('hashedPassword');
            pool.query.mockResolvedValueOnce({ rows: [] }); // No existing user
            pool.query.mockResolvedValueOnce({ rows: [] }); // Insert user
            pool.query.mockResolvedValueOnce({ rows: [] }); // Insert preferences
            jwt.sign.mockReturnValue('verificationToken');
            axios.post.mockResolvedValue({});

            const result = await authService.register(userData);

            expect(result).toEqual({ message: 'User created successfully', userId: expect.any(String) });
            expect(pool.query).toHaveBeenCalledTimes(3);
            expect(bcrypt.hash).toHaveBeenCalledWith('password123', 'salt');
            expect(axios.post).toHaveBeenCalledTimes(1);
            expect(axios.post).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
                subject: 'Verify your email for Calendar App',
            }));
        });

        it('should throw error if email already exists', async () => {
            const userData = { email: 'test@example.com', password: 'password123', name: 'Test User' };
            pool.query.mockResolvedValueOnce({ rows: [{ id: '1', email: 'test@example.com' }] });

            await expect(authService.register(userData)).rejects.toThrow('User already exists');
        });
    });

    describe('login', () => {
        it('should log in a user and return tokens', async () => {
            const credentials = { email: 'test@example.com', password: 'password123' };
            const mockUser = { id: 'user1', email: 'test@example.com', password_hash: 'hashedPassword' };
            pool.query.mockResolvedValueOnce({ rows: [mockUser] });
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValueOnce('accessToken').mockReturnValueOnce('refreshToken');
            pool.query.mockResolvedValueOnce({}); // Store refresh token

            const result = await authService.login(credentials);

            expect(result).toEqual({
                accessToken: 'accessToken',
                refreshToken: 'refreshToken',
                user: { id: 'user1', email: 'test@example.com', name: undefined }
            });
            expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
            expect(jwt.sign).toHaveBeenCalledTimes(2);
        });

        it('should throw error for invalid credentials', async () => {
            const credentials = { email: 'test@example.com', password: 'wrongpassword' };
            pool.query.mockResolvedValueOnce({ rows: [{ id: 'user1', email: 'test@example.com', password_hash: 'hashedPassword' }] });
            bcrypt.compare.mockResolvedValue(false);

            await expect(authService.login(credentials)).rejects.toThrow('Invalid credentials');
        });
    });

    describe('refreshToken', () => {
        it('should return a new access token', async () => {
            const refreshToken = 'validRefreshToken';
            const payload = { userId: 'user1' };
            const mockUser = { id: 'user1', email: 'test@example.com' };

            jwt.verify.mockReturnValue(payload);
            pool.query.mockResolvedValueOnce({ rows: [{ token: refreshToken }] }); // Refresh token exists
            pool.query.mockResolvedValueOnce({ rows: [mockUser] }); // User exists
            jwt.sign.mockReturnValue('newAccessToken');

            const result = await authService.refreshToken(refreshToken);

            expect(result).toEqual({ accessToken: 'newAccessToken' });
            expect(jwt.verify).toHaveBeenCalledWith(refreshToken, process.env.JWT_REFRESH_SECRET);
            expect(jwt.sign).toHaveBeenCalledWith({ userId: 'user1', email: 'test@example.com' }, process.env.JWT_SECRET, { expiresIn: '15m' });
        });

        it('should throw error for invalid refresh token', async () => {
            jwt.verify.mockImplementation(() => { throw new jwt.JsonWebTokenError('invalid'); });
            await expect(authService.refreshToken('invalidToken')).rejects.toThrow('Invalid refresh token');
        });
    });

    describe('logout', () => {
        it('should delete refresh token if provided', async () => {
            await authService.logout('someRefreshToken');
            expect(pool.query).toHaveBeenCalledWith('DELETE FROM refresh_tokens WHERE token = $1', ['someRefreshToken']);
        });

        it('should not delete refresh token if not provided', async () => {
            await authService.logout(null);
            expect(pool.query).not.toHaveBeenCalled();
        });
    });

    describe('verifyEmail', () => {
        it('should verify user email', async () => {
            const token = 'verificationToken';
            const payload = { userId: 'user1' };
            jwt.verify.mockReturnValue(payload);
            pool.query.mockResolvedValue({});

            const result = await authService.verifyEmail(token);

            expect(result).toEqual({ message: 'Email verified successfully' });
            expect(pool.query).toHaveBeenCalledWith(
                'UPDATE users SET is_email_verified = TRUE, updated_at = NOW() WHERE id = $1',
                [payload.userId]
            );
        });

        it('should throw error for invalid verification token', async () => {
            jwt.verify.mockImplementation(() => { throw new jwt.JsonWebTokenError('invalid'); });
            await expect(authService.verifyEmail('invalidToken')).rejects.toThrow('Invalid or expired verification token');
        });
    });

    describe('requestPasswordReset', () => {
        it('should send password reset email if user exists', async () => {
            const email = 'test@example.com';
            const mockUser = { id: 'user1' };
            pool.query.mockResolvedValueOnce({ rows: [mockUser] }); // User exists
            jwt.sign.mockReturnValue('resetToken');
            pool.query.mockResolvedValueOnce({}); // Insert password reset token
            axios.post.mockResolvedValue({});

            const result = await authService.requestPasswordReset(email);

            expect(result).toEqual({ message: 'If the email exists, a password reset link has been sent' });
            expect(axios.post).toHaveBeenCalledTimes(1);
            expect(axios.post).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
                subject: 'Password Reset Request for Calendar App',
            }));
        });

        it('should return success message even if user does not exist', async () => {
            const email = 'nonexistent@example.com';
            pool.query.mockResolvedValueOnce({ rows: [] }); // User does not exist

            const result = await authService.requestPasswordReset(email);

            expect(result).toEqual({ message: 'If the email exists, a password reset link has been sent' });
            expect(axios.post).not.toHaveBeenCalled();
        });
    });

    describe('resetPassword', () => {
        it('should reset user password', async () => {
            const token = 'resetToken';
            const newPassword = 'newPassword123';
            const payload = { userId: 'user1' };

            jwt.verify.mockReturnValue(payload);
            pool.query.mockResolvedValueOnce({ rows: [{ token }] }); // Password reset token exists
            bcrypt.genSalt.mockResolvedValue('salt');
            bcrypt.hash.mockResolvedValue('hashedNewPassword');
            pool.query.mockResolvedValueOnce({}); // Update user password
            pool.query.mockResolvedValueOnce({}); // Delete password reset token

            const result = await authService.resetPassword(token, newPassword);

            expect(result).toEqual({ message: 'Password reset successfully' });
            expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 'salt');
            expect(pool.query).toHaveBeenCalledWith(
                'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
                ['hashedNewPassword', payload.userId]
            );
        });

        it('should throw error for invalid or expired reset token', async () => {
            jwt.verify.mockImplementation(() => { throw new jwt.JsonWebTokenError('invalid'); });
            await expect(authService.resetPassword('invalidToken', 'newPassword')).rejects.toThrow('Invalid or expired token');
        });
    });

    describe('getProfile', () => {
        it('should return user profile', async () => {
            const userId = 'user1';
            const mockUser = { id: userId, email: 'test@example.com', name: 'Test User' };
            pool.query.mockResolvedValueOnce({ rows: [mockUser] });

            const profile = await authService.getProfile(userId);

            expect(profile).toEqual(mockUser);
        });

        it('should throw error if user not found', async () => {
            const userId = 'nonexistentUser';
            pool.query.mockResolvedValueOnce({ rows: [] });

            await expect(authService.getProfile(userId)).rejects.toThrow('User not found');
        });
    });

    describe('validateToken', () => {
        it('should return valid true for a valid token', () => {
            const token = 'validToken';
            const decodedPayload = { userId: 'user1' };
            jwt.verify.mockReturnValue(decodedPayload);

            const result = authService.validateToken(token);

            expect(result).toEqual({ valid: true, userId: 'user1' });
        });

        it('should return valid false for an invalid token', () => {
            const token = 'invalidToken';
            jwt.verify.mockImplementation(() => { throw new Error('invalid'); });

            const result = authService.validateToken(token);

            expect(result).toEqual({ valid: false, error: 'invalid' });
        });
    });

    describe('updateProfile', () => {
        it('should update user profile', async () => {
            const userId = 'user1';
            const userData = { name: 'New Name', timezone: 'America/New_York' };
            const mockUpdatedUser = { id: userId, email: 'test@example.com', ...userData };
            pool.query.mockResolvedValueOnce({ rows: [mockUpdatedUser] });

            const result = await authService.updateProfile(userId, userData);

            expect(result).toEqual(mockUpdatedUser);
            expect(pool.query).toHaveBeenCalledTimes(1);
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE users'),
                expect.arrayContaining(['New Name', 'America/New_York', userId])
            );
        });

        it('should throw error if no fields to update', async () => {
            const userId = 'user1';
            const userData = {};

            await expect(authService.updateProfile(userId, userData)).rejects.toThrow('No fields to update');
        });

        it('should throw error if user not found', async () => {
            const userId = 'nonexistentUser';
            const userData = { name: 'New Name' };
            pool.query.mockResolvedValueOnce({ rows: [] });

            await expect(authService.updateProfile(userId, userData)).rejects.toThrow('User not found');
        });
    });

    describe('changePassword', () => {
        it('should change user password and invalidate refresh tokens', async () => {
            const userId = 'user1';
            const currentPassword = 'oldPassword';
            const newPassword = 'newPassword123';
            const mockUser = { id: userId, password_hash: 'hashedOldPassword' };

            pool.query.mockResolvedValueOnce({ rows: [mockUser] }); // Get user
            bcrypt.compare.mockResolvedValue(true);
            bcrypt.genSalt.mockResolvedValue('salt');
            bcrypt.hash.mockResolvedValue('hashedNewPassword');
            pool.query.mockResolvedValueOnce({}); // Update password
            pool.query.mockResolvedValueOnce({}); // Delete refresh tokens

            const result = await authService.changePassword(userId, currentPassword, newPassword);

            expect(result).toEqual({ message: 'Password changed successfully' });
            expect(bcrypt.compare).toHaveBeenCalledWith(currentPassword, 'hashedOldPassword');
            expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 'salt');
            expect(pool.query).toHaveBeenCalledWith('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
        });

        it('should throw error for incorrect current password', async () => {
            const userId = 'user1';
            const currentPassword = 'wrongPassword';
            const newPassword = 'newPassword123';
            const mockUser = { id: userId, password_hash: 'hashedOldPassword' };

            pool.query.mockResolvedValueOnce({ rows: [mockUser] });
            bcrypt.compare.mockResolvedValue(false);

            await expect(authService.changePassword(userId, currentPassword, newPassword)).rejects.toThrow('Current password is incorrect');
        });
    });

    describe('deleteAccount', () => {
        it('should delete user account', async () => {
            const userId = 'user1';
            const password = 'userPassword';
            const mockUser = { id: userId, password_hash: 'hashedPassword' };

            pool.query.mockResolvedValueOnce({ rows: [mockUser] }); // Get user
            bcrypt.compare.mockResolvedValue(true);
            pool.query.mockResolvedValueOnce({}); // Delete user

            const result = await authService.deleteAccount(userId, password);

            expect(result).toEqual({ message: 'Account deleted successfully' });
            expect(pool.query).toHaveBeenCalledWith('DELETE FROM users WHERE id = $1', [userId]);
        });

        it('should throw error for incorrect password', async () => {
            const userId = 'user1';
            const password = 'wrongPassword';
            const mockUser = { id: userId, password_hash: 'hashedPassword' };

            pool.query.mockResolvedValueOnce({ rows: [mockUser] });
            bcrypt.compare.mockResolvedValue(false);

            await expect(authService.deleteAccount(userId, password)).rejects.toThrow('Password is incorrect');
        });
    });

    describe('getPreferences', () => {
        it('should return user preferences if found', async () => {
            const userId = 'user1';
            const mockPreferences = { id: 'pref1', user_id: userId, default_view: 'week' };
            pool.query.mockResolvedValueOnce({ rows: [mockPreferences] });

            const result = await authService.getPreferences(userId);

            expect(result).toEqual(mockPreferences);
        });

        it('should return default preferences if not found', async () => {
            const userId = 'user1';
            pool.query.mockResolvedValueOnce({ rows: [] });

            const result = await authService.getPreferences(userId);

            expect(result).toHaveProperty('default_view', 'month');
            expect(result).toHaveProperty('working_hours');
        });
    });

    describe('updatePreferences', () => {
        it('should update existing user preferences', async () => {
            const userId = 'user1';
            const preferencesData = { default_view: 'day' };
            const mockExistingPrefs = { id: 'pref1', user_id: userId, default_view: 'month' };
            const mockUpdatedPrefs = { ...mockExistingPrefs, ...preferencesData };

            pool.query.mockResolvedValueOnce({ rows: [mockExistingPrefs] }); // Check existing
            pool.query.mockResolvedValueOnce({ rows: [mockUpdatedPrefs] }); // Update

            const result = await authService.updatePreferences(userId, preferencesData);

            expect(result).toEqual(mockUpdatedPrefs);
            expect(pool.query).toHaveBeenCalledTimes(2);
        });

        it('should create new preferences if none exist', async () => {
            const userId = 'user1';
            const preferencesData = { default_view: 'day' };
            const mockNewPrefs = { id: 'newPrefId', user_id: userId, default_view: 'day' };

            pool.query.mockResolvedValueOnce({ rows: [] }); // Check existing (none found)
            pool.query.mockResolvedValueOnce({ rows: [mockNewPrefs] }); // Insert new

            const result = await authService.updatePreferences(userId, preferencesData);

            expect(result).toEqual(mockNewPrefs);
            expect(pool.query).toHaveBeenCalledTimes(2);
        });
    });
});