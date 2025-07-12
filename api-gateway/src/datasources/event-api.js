const { RESTDataSource } = require('apollo-datasource-rest');

class EventAPI extends RESTDataSource {
  constructor() {
    super();
    this.baseURL = process.env.EVENT_SERVICE_URL || 'http://localhost:3004';
  }

  async getEvents(calendarIds, start, end, token, userId) {
    const params = {
      start,
      end,
    };
    if (calendarIds && calendarIds.length > 0) {
      params.calendarIds = calendarIds.join(',');
    }
    return this.get('events', params, { headers: { Authorization: token, 'X-User-ID': userId } });
  }

  async getEvent(id, token, userId) {
    return this.get(`events/${id}`, undefined, { headers: { Authorization: token, 'X-User-ID': userId } });
  }

  async createEvent(input, token, userId) {
    return this.post('events', input, { headers: { Authorization: token, 'X-User-ID': userId } });
  }

  async updateEvent(id, input, token, userId) {
    return this.patch(`events/${id}`, input, { headers: { Authorization: token, 'X-User-ID': userId } });
  }

  async deleteEvent(id, recurring, token, userId) {
    const params = recurring ? { recurring } : undefined;
    return this.delete(`events/${id}`, params, { headers: { Authorization: token, 'X-User-ID': userId } });
  }

  async updateEventInstance(eventId, instanceDate, input, token, userId) {
    return this.patch(`events/${eventId}/instance/${instanceDate}`, input, { headers: { Authorization: token, 'X-User-ID': userId } });
  }

  async createReminder(eventId, minutesBefore, method, token, userId) {
    return this.post(`events/${eventId}/reminders`, { minutesBefore, method }, { headers: { Authorization: token, 'X-User-ID': userId } });
  }

  async deleteReminder(id, token, userId) {
    return this.delete(`events/reminders/${id}`, undefined, { headers: { Authorization: token, 'X-User-ID': userId } });
  }

  async getEventReminders(eventId, token, userId) {
    return this.get(`events/${eventId}/reminders`, undefined, { headers: { Authorization: token, 'X-User-ID': userId } });
  }

  async getEventAttendees(eventId, token, userId) {
    return this.get(`events/${eventId}/attendees`, undefined, { headers: { Authorization: token, 'X-User-ID': userId } });
  }

  // Task methods
  async getTask(id, token, userId) {
    return this.get(`tasks/${id}`, undefined, { headers: { Authorization: token, 'X-User-ID': userId } });
  }

  async getTasks(token, userId) {
    return this.get('tasks', undefined, { headers: { Authorization: token, 'X-User-ID': userId } });
  }

  async createTask(input, token, userId) {
    return this.post('tasks', input, { headers: { Authorization: token, 'X-User-ID': userId } });
  }

  async updateTask(id, input, token, userId) {
    return this.put(`tasks/${id}`, input, { headers: { Authorization: token, 'X-User-ID': userId } });
  }

  async deleteTask(id, token, userId) {
    return this.delete(`tasks/${id}`, undefined, { headers: { Authorization: token, 'X-User-ID': userId } });
  }
}

module.exports = EventAPI;
