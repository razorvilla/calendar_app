const express = require('express');
const router = express.Router();
const userController = require('../controllers/user');
const preferenceController = require('../controllers/preference');
const { authenticate } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticate);

// User routes
router.get('/me', userController.getCurrentUser);
router.get('/search', userController.searchUsers);
router.get('/:id', userController.getUserById);
router.patch('/profile', userController.updateProfile);
router.post('/change-password', userController.changePassword);

// Preferences routes
router.get('/preferences/me', preferenceController.getUserPreferences);
router.patch('/preferences', preferenceController.updatePreferences);
router.get('/preferences/:id', preferenceController.getUserPreferencesById);

module.exports = router;