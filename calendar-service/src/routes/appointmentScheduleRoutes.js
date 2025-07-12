const express = require('express');
const AppointmentScheduleController = require('../controllers/appointmentScheduleController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/schedules', authenticate, AppointmentScheduleController.createSchedule);
router.get('/schedules/:id', authenticate, AppointmentScheduleController.getScheduleById);
router.get('/calendars/:calendarId/schedules', authenticate, AppointmentScheduleController.getSchedulesByCalendarId);
router.put('/schedules/:id', authenticate, AppointmentScheduleController.updateSchedule);
router.delete('/schedules/:id', authenticate, AppointmentScheduleController.deleteSchedule);

router.post('/slots', authenticate, AppointmentScheduleController.createSlot);
router.get('/schedules/:scheduleId/slots', authenticate, AppointmentScheduleController.getSlotsByScheduleId);
router.put('/slots/:id', authenticate, AppointmentScheduleController.updateSlot);
router.delete('/slots/:id', authenticate, AppointmentScheduleController.deleteSlot);

module.exports = router;
