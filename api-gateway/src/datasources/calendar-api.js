const { RESTDataSource } = require('apollo-datasource-rest');

class CalendarAPI extends RESTDataSource {
  constructor() {
    super();
    this.baseURL = process.env.CALENDAR_SERVICE_URL || 'http://localhost:3003';
  }

  async getCalendar(id, token, userId) {
    return this.get(`calendars/${id}`, undefined, { headers: { Authorization: token, 'X-User-ID': userId } });
  }

  async getCalendars(token, userId) {
    return this.get('calendars', undefined, { headers: { Authorization: token, 'X-User-ID': userId } });
  }

  async createCalendar(input, token, userId) {
    return this.post('calendars', input, { headers: { Authorization: token, 'X-User-ID': userId } });
  }

  async updateCalendar(id, input, token, userId) {
    return this.put(`calendars/${id}`, input, { headers: { Authorization: token, 'X-User-ID': userId } });
  }

  async deleteCalendar(id, token, userId) {
    return this.delete(`calendars/${id}`, undefined, { headers: { Authorization: token, 'X-User-ID': userId } });
  }

  async shareCalendar(input, token, userId) {
    return this.post('calendar-shares', input, { headers: { Authorization: token, 'X-User-ID': userId } });
  }

  async getCalendarShares(calendarId, token, userId) {
    return this.get(`calendars/${calendarId}/shares`, undefined, { headers: { Authorization: token, 'X-User-ID': userId } });
  }

  // Appointment Schedule methods
  async getAppointmentSchedule(id, token, userId) {
    return this.get(`appointments/schedules/${id}`, undefined, { headers: { Authorization: token, 'X-User-ID': userId } });
  }

  async getAppointmentSchedules(calendarId, token, userId) {
    return this.get(`appointments/calendars/${calendarId}/schedules`, undefined, { headers: { Authorization: token, 'X-User-ID': userId } });
  }

  async createAppointmentSchedule(input, token, userId) {
    return this.post('appointments/schedules', input, { headers: { Authorization: token, 'X-User-ID': userId } });
  }

  async updateAppointmentSchedule(id, input, token, userId) {
    return this.put(`appointments/schedules/${id}`, input, { headers: { Authorization: token, 'X-User-ID': userId } });
  }

  async deleteAppointmentSchedule(id, token, userId) {
    return this.delete(`appointments/schedules/${id}`, undefined, { headers: { Authorization: token, 'X-User-ID': userId } });
  }

  async createAppointmentSlot(input, token, userId) {
    return this.post('appointments/slots', input, { headers: { Authorization: token, 'X-User-ID': userId } });
  }

  async getAppointmentSlot(id, token, userId) {
    return this.get(`appointments/slots/${id}`, undefined, { headers: { Authorization: token, 'X-User-ID': userId } });
  }

  async getAppointmentSlots(scheduleId, token, userId) {
    return this.get(`appointments/schedules/${scheduleId}/slots`, undefined, { headers: { Authorization: token, 'X-User-ID': userId } });
  }

  async updateAppointmentSlot(id, input, token, userId) {
    return this.put(`appointments/slots/${id}`, input, { headers: { Authorization: token, 'X-User-ID': userId } });
  }

  async deleteAppointmentSlot(id, token, userId) {
    return this.delete(`appointments/slots/${id}`, undefined, { headers: { Authorization: token, 'X-User-ID': userId } });
  }
}

module.exports = CalendarAPI;
