const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendar');
const shareController = require('../controllers/share');
const { authenticate } = require('../middleware/auth');

router.get('/share/accept/:token', shareController.acceptShareInvitation);

// Apply authentication middleware to all routes
router.use(authenticate);

// Calendar routes
router.get('/', calendarController.getCalendars);
router.post('/', calendarController.createCalendar);
router.get('/:id', calendarController.getCalendar);
router.patch('/:id', calendarController.updateCalendar);
router.delete('/:id', calendarController.deleteCalendar);

// Share routes
router.post('/:id/share', shareController.shareCalendar);
router.get('/:id/shares', shareController.getCalendarShares);
router.patch('/:id/shares/:shareId', shareController.updateShare);
router.delete('/:id/shares/:shareId', shareController.deleteShare);
router.post('/:id/shares/:shareId/resend', shareController.resendShareInvitation);

module.exports = router;