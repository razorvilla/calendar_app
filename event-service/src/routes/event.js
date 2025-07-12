const express = require('express');
const router = express.Router();
const eventController = require('../controllers/event');
const reminderController = require('../controllers/reminder');
const attendeeController = require('../controllers/attendee');
const { authenticate } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticate);

// Event routes
router.get('/', eventController.getEvents);
router.post('/', eventController.createEvent);
router.get('/:id', eventController.getEvent);
router.patch('/:id', eventController.updateEvent);
router.patch('/:id/instance/:date', eventController.updateEventInstance);
router.delete('/:id', eventController.deleteEvent);

// Reminder routes
router.get('/:eventId/reminders', reminderController.getEventReminders);
router.post('/:eventId/reminders', reminderController.createReminder);
router.delete('/reminders/:id', reminderController.deleteReminder);

// Attendee routes
router.get('/:eventId/attendees', attendeeController.getEventAttendees);
router.post('/:eventId/attendees', attendeeController.addAttendee);
router.patch('/:eventId/attendees/:attendeeId', attendeeController.updateAttendeeResponse);
router.delete('/:eventId/attendees/:attendeeId', attendeeController.removeAttendee);

module.exports = router;