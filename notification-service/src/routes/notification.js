const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', notificationController.getNotifications);
router.patch('/:id/read', notificationController.markNotificationRead);
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;