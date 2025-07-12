const knex = require('../../../shared/knexfile');
const { v4: uuidv4 } = require('uuid');

const SCHEDULE_TABLE = 'appointment_schedules';
const SLOTS_TABLE = 'appointment_slots';

const AppointmentScheduleRepository = {
  async createSchedule(schedule) {
    const [newSchedule] = await knex(SCHEDULE_TABLE).insert({
      id: uuidv4(),
      calendar_id: schedule.calendarId,
      name: schedule.name,
      description: schedule.description || null,
      duration_minutes: schedule.durationMinutes,
      slot_interval_minutes: schedule.slotIntervalMinutes,
      availability_rules: JSON.stringify(schedule.availabilityRules),
    }).returning('*');
    return newSchedule;
  },

  async findScheduleById(id) {
    return knex(SCHEDULE_TABLE).where({ id }).first();
  },

  async findSchedulesByCalendarId(calendarId) {
    return knex(SCHEDULE_TABLE).where({ calendar_id: calendarId });
  },

  async updateSchedule(id, updates) {
    const [updatedSchedule] = await knex(SCHEDULE_TABLE).where({ id }).update({
      name: updates.name,
      description: updates.description,
      duration_minutes: updates.durationMinutes,
      slot_interval_minutes: updates.slotIntervalMinutes,
      availability_rules: updates.availabilityRules ? JSON.stringify(updates.availabilityRules) : undefined,
      updated_at: knex.fn.now(),
    }).returning('*');
    return updatedSchedule;
  },

  async deleteSchedule(id) {
    return knex(SCHEDULE_TABLE).where({ id }).del();
  },

  async createSlot(slot) {
    const [newSlot] = await knex(SLOTS_TABLE).insert({
      id: uuidv4(),
      schedule_id: slot.scheduleId,
      start_time: slot.startTime,
      end_time: slot.endTime,
      is_booked: slot.isBooked || false,
      booked_by_user_id: slot.bookedByUserId || null,
    }).returning('*');
    return newSlot;
  },

  async findSlotsByScheduleId(scheduleId) {
    return knex(SLOTS_TABLE).where({ schedule_id: scheduleId });
  },

  async updateSlot(id, updates) {
    const [updatedSlot] = await knex(SLOTS_TABLE).where({ id }).update({
      is_booked: updates.isBooked,
      booked_by_user_id: updates.bookedByUserId,
      updated_at: knex.fn.now(),
    }).returning('*');
    return updatedSlot;
  },

  async deleteSlot(id) {
    return knex(SLOTS_TABLE).where({ id }).del();
  },
};

module.exports = AppointmentScheduleRepository;
