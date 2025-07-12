const authService = require('../services/auth');

const register = async (req, res) => {
    console.log('Auth Controller: Register request received', req.body);
    try {
        const result = await authService.register(req.body);
        res.status(201).json(result);
    } catch (error) {
        console.error('Auth Controller: Registration error:', error.message);
        if (error.message === 'Email, password, and name are required' ||
            error.message === 'Invalid email format' ||
            error.message.startsWith('Password must be at least 8 characters')) {
            return res.status(400).json({ error: error.message });
        }
        if (error.message === 'User already exists') {
            return res.status(409).json({ error: error.message });
        }
        console.error('Auth Controller: Unhandled registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const login = async (req, res) => {
    try {
        const result = await authService.login(req.body, res);
        res.json(result);
    } catch (error) {
        console.error('Login error:', error);
        if (error.message === 'Email and password are required' ||
            error.message === 'Invalid credentials') {
            return res.status(401).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

const refreshToken = async (req, res) => {
    try {
        const { accessToken } = await authService.refreshToken(req.body.refreshToken, res);
        res.json({ accessToken });
    } catch (error) {
        console.error('Token refresh error:', error);
        if (error.message === 'Refresh token required' ||
            error.message === 'Invalid refresh token' ||
            error.message === 'User not found') {
            return res.status(401).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

const logout = async (req, res) => {
    try {
        const result = await authService.logout(req.body.refreshToken);
        res.json(result);
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const verifyEmail = async (req, res) => {
    try {
        const result = await authService.verifyEmail(req.params.token);
        res.json(result);
    } catch (error) {
        console.error('Email verification error:', error);
        if (error.message === 'Invalid or expired verification token') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

const requestPasswordReset = async (req, res) => {
    try {
        const result = await authService.requestPasswordReset(req.body.email);
        res.status(200).json(result);
    } catch (error) {
        console.error('Password reset request error:', error);
        if (error.message === 'Email is required') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const result = await authService.resetPassword(req.body.token, req.body.password);
        res.json(result);
    } catch (error) {
        console.error('Password reset error:', error);
        if (error.message === 'Token and password are required' ||
            error.message === 'Password must be at least 8 characters' ||
            error.message === 'Invalid or expired token') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getProfile = async (req, res) => {
    try {
        const userProfile = await authService.getProfile(req.user.userId);
        res.json(userProfile);
    } catch (error) {
        console.error('Get profile error:', error);
        if (error.message === 'User not found') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

const validateToken = async (req, res) => {
    try {
        const { valid, userId } = authService.validateToken(req.headers.authorization.split(' ')[1]);
        if (valid) {
            res.json({ valid: true, userId });
        } else {
            res.status(401).json({ valid: false, error: 'Invalid token' });
        }
    } catch (error) {
        console.error('Token validation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateProfile = async (req, res) => {
    try {
        const updatedUser = await authService.updateProfile(req.user.userId, req.body);
        res.json(updatedUser);
    } catch (error) {
        console.error('Update profile error:', error);
        if (error.message === 'No fields to update' || error.message === 'User not found') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const result = await authService.changePassword(req.user.userId, currentPassword, newPassword);
        res.json(result);
    } catch (error) {
        console.error('Change password error:', error);
        if (error.message === 'Current password and new password are required' ||
            error.message === 'New password must be at least 8 characters' ||
            error.message === 'User not found' ||
            error.message === 'Current password is incorrect') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

const deleteAccount = async (req, res) => {
    try {
        const { password } = req.body;
        const result = await authService.deleteAccount(req.user.userId, password);
        res.json(result);
    } catch (error) {
        console.error('Delete account error:', error);
        if (error.message === 'Password is required' ||
            error.message === 'User not found' ||
            error.message === 'Password is incorrect') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getPreferences = async (req, res) => {
    try {
        const preferences = await authService.getPreferences(req.user.userId);
        res.json(preferences);
    } catch (error) {
        console.error('Get preferences error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updatePreferences = async (req, res) => {
    try {
        const updatedPreferences = await authService.updatePreferences(req.user.userId, req.body);
        res.json(updatedPreferences);
    } catch (error) {
        console.error('Update preferences error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const generateMfaSecret = async (req, res) => {
    try {
        const { secret, qrcodeUrl } = await authService.generateMfaSecret(req.user.userId);
        res.json({ secret, qrcodeUrl });
    } catch (error) {
        console.error('Generate MFA secret error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const verifyMfaSetup = async (req, res) => {
    try {
        const { token, secret } = req.body;
        const result = await authService.verifyMfaToken(req.user.userId, token);
        if (result.verified) {
            await authService.enableMfa(req.user.userId, secret);
            res.json({ message: 'MFA setup verified and enabled successfully' });
        } else {
            res.status(400).json({ error: 'Invalid MFA token' });
        }
    } catch (error) {
        console.error('Verify MFA setup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const enableMfa = async (req, res) => {
    try {
        const { secret } = req.body;
        const result = await authService.enableMfa(req.user.userId, secret);
        res.json(result);
    } catch (error) {
        console.error('Enable MFA error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const disableMfa = async (req, res) => {
    try {
        const result = await authService.disableMfa(req.user.userId);
        res.json(result);
    } catch (error) {
        console.error('Disable MFA error:', error);
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
    updateProfile,
    changePassword,
    deleteAccount,
    getPreferences,
    updatePreferences,
    generateMfaSecret,
    verifyMfaSetup,
    enableMfa,
    disableMfa
};