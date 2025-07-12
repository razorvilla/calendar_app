const AppointmentScheduleService = require('../services/appointmentScheduleService');

const AppointmentScheduleController = {
  async createSchedule(req, res, next) {
    try {
      const schedule = await AppointmentScheduleService.createSchedule(req.body);
      res.status(201).json(schedule);
    } catch (error) {
      next(error);
    }
  },

  async getScheduleById(req, res, next) {
    try {
      const { id } = req.params;
      const schedule = await AppointmentScheduleService.getScheduleById(id);
      if (!schedule) {
        return res.status(404).json({ message: 'Appointment schedule not found' });
      }
      res.status(200).json(schedule);
    } catch (error) {
      next(error);
    }
  },

  async getSchedulesByCalendarId(req, res, next) {
    try {
      const { calendarId } = req.params;
      const schedules = await AppointmentScheduleService.getSchedulesByCalendarId(calendarId);
      res.status(200).json(schedules);
    } catch (error) {
      next(error);
    }
  },

  async updateSchedule(req, res, next) {
    try {
      const { id } = req.params;
      const updatedSchedule = await AppointmentScheduleService.updateSchedule(id, req.body);
      if (!updatedSchedule) {
        return res.status(404).json({ message: 'Appointment schedule not found' });
      }
      res.status(200).json(updatedSchedule);
    } catch (error) {
      next(error);
    }
  },

  async deleteSchedule(req, res, next) {
    try {
      const { id } = req.params;
      const deleted = await AppointmentScheduleService.deleteSchedule(id);
      if (!deleted) {
        return res.status(404).json({ message: 'Appointment schedule not found' });
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async createSlot(req, res, next) {
    try {
      const slot = await AppointmentScheduleService.createSlot(req.body);
      res.status(201).json(slot);
    } catch (error) {
      next(error);
    }
  },

  async getSlotsByScheduleId(req, res, next) {
    try {
      const { scheduleId } = req.params;
      const slots = await AppointmentScheduleService.getSlotsByScheduleId(scheduleId);
      res.status(200).json(slots);
    } catch (error) {
      next(error);
    }
  },

  async updateSlot(req, res, next) {
    try {
      const { id } = req.params;
      const updatedSlot = await AppointmentScheduleService.updateSlot(id, req.body);
      if (!updatedSlot) {
        return res.status(404).json({ message: 'Appointment slot not found' });
      }
      res.status(200).json(updatedSlot);
    } catch (error) {
      next(error);
    }
  },

  async deleteSlot(req, res, next) {
    try {
      const { id } = req.params;
      const deleted = await AppointmentScheduleService.deleteSlot(id);
      if (!deleted) {
        return res.status(404).json({ message: 'Appointment slot not found' });
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};

module.exports = AppointmentScheduleController;
