const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');
const userController = require('../controllers/user');
const { authenticate } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/request-password-reset', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);
router.get('/validate-token', authenticate, authController.validateToken);

router.get('/profile', authenticate, authController.getProfile);
router.patch('/profile', authenticate, authController.updateProfile);
router.post('/change-password', authenticate, userController.changePassword);
router.delete('/account', authenticate, userController.deleteAccount);
router.get('/preferences', authenticate, userController.getPreferences);
router.patch('/preferences', authenticate, userController.updatePreferences);

module.exports = router;