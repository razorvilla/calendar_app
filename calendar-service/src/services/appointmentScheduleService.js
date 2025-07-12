const AppointmentScheduleRepository = require('../db/appointmentScheduleRepository');

const AppointmentScheduleService = {
  async createSchedule(scheduleData) {
    return AppointmentScheduleRepository.createSchedule(scheduleData);
  },

  async getScheduleById(scheduleId) {
    return AppointmentScheduleRepository.findScheduleById(scheduleId);
  },

  async getSchedulesByCalendarId(calendarId) {
    return AppointmentScheduleRepository.findSchedulesByCalendarId(calendarId);
  },

  async updateSchedule(scheduleId, updateData) {
    return AppointmentScheduleRepository.updateSchedule(scheduleId, updateData);
  },

  async deleteSchedule(scheduleId) {
    return AppointmentScheduleRepository.deleteSchedule(scheduleId);
  },

  async createSlot(slotData) {
    return AppointmentScheduleRepository.createSlot(slotData);
  },

  async getSlotsByScheduleId(scheduleId) {
    return AppointmentScheduleRepository.findSlotsByScheduleId(scheduleId);
  },

  async updateSlot(slotId, updateData) {
    return AppointmentScheduleRepository.updateSlot(slotId, updateData);
  },

  async deleteSlot(slotId) {
    return AppointmentScheduleRepository.deleteSlot(slotId);
  },
};

module.exports = AppointmentScheduleService;
