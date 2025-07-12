const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');
const { authenticate } = require('../middleware/auth');

// Public auth routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/request-password-reset', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);
router.get('/validate-token', authenticate, authController.validateToken);

// Protected user routes
router.get('/profile', authenticate, authController.getProfile);
router.patch('/profile', authenticate, authController.updateProfile);
router.post('/change-password', authenticate, authController.changePassword);
router.delete('/account', authenticate, authController.deleteAccount);
router.get('/preferences', authenticate, authController.getPreferences);
router.patch('/preferences', authenticate, authController.updatePreferences);

// MFA routes
router.post('/mfa/generate-secret', authenticate, authController.generateMfaSecret);
router.post('/mfa/verify-setup', authenticate, authController.verifyMfaSetup);
router.post('/mfa/enable', authenticate, authController.enableMfa);
router.post('/mfa/disable', authenticate, authController.disableMfa);

module.exports = router;