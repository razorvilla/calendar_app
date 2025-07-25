const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendar');
const shareController = require('../controllers/share');
const { authenticate } = require('../middleware/auth');
router.get('/share/accept/:token', shareController.acceptShareInvitation);

router.use(authenticate);

router.get('/', calendarController.getCalendars);
router.post('/', calendarController.createCalendar);
router.get('/:id', calendarController.getCalendar);
router.patch('/:id', calendarController.updateCalendar);
router.delete('/:id', calendarController.deleteCalendar);

router.post('/:id/share', shareController.shareCalendar);
router.get('/:id/shares', shareController.getCalendarShares);
router.patch('/:id/shares/:shareId', shareController.updateShare);
router.delete('/:id/shares/:shareId', shareController.deleteShare);
router.post('/:calendarId/shares/:shareId/resend', shareController.resendShareInvitation);
module.exports = router;