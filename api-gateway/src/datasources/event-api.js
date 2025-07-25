const axios = require('axios');

class EventAPI {
    constructor() {
        this.baseURL = process.env.EVENT_SERVICE_URL;
        this.client = axios.create({
            baseURL: this.baseURL,
        });
    }

    _setAuthHeader(token) {
        return {
            headers: {
                Authorization: `Bearer ${token}`
            }
        };
    }

    async getEvents(calendarIds, start, end, token) {
        try {
            let url = `/events?start=${start}&end=${end}`;
            if (calendarIds && calendarIds.length > 0) {
                url += `&calendarIds=${calendarIds.join(',')}`;
            }
            const response = await this.client.get(url, this._setAuthHeader(token));
            return response.data;
        } catch (error) {
            console.error('Error fetching events:', error.response?.data || error.message);
            return [];
        }
    }

    async getCalendarEvents(calendarId, start, end, token) {
        try {
            let url = `/events?calendarIds=${calendarId}`;
            if (start && end) {
                url += `&start=${start}&end=${end}`;
            }
            const response = await this.client.get(url, this._setAuthHeader(token));
            return response.data;
        } catch (error) {
            console.error(`Error fetching events for calendar ${calendarId}:`, error.response?.data || error.message);
            return [];
        }
    }

    async getEvent(eventId, token) {
        try {
            const response = await this.client.get(`/events/${eventId}`, this._setAuthHeader(token));
            return response.data;
        } catch (error) {
            console.error(`Error fetching event ${eventId}:`, error.response?.data || error.message);
            return null;
        }
    }

    async createEvent(input, token) {
        console.log('EventAPI: createEvent called with input:', input, 'and token:', token);
        try {
            const response = await this.client.post('/events', input, this._setAuthHeader(token));
            return response.data;
        } catch (error) {
            console.error('Error creating event:', error.response?.data || error.message);
            throw error;
        }
    }

    async updateEvent(id, input, token) {
        try {
            const response = await this.client.patch(`/events/${id}`, input, this._setAuthHeader(token));
            return response.data;
        } catch (error) {
            console.error(`Error updating event ${id}:`, error.response?.data || error.message);
            throw error;
        }
    }

    async updateEventInstance(eventId, instanceDate, input, token) {
        try {
            const response = await this.client.patch(
                `/events/${eventId}/instances/${instanceDate}`,
                input,
                this._setAuthHeader(token)
            );
            return response.data;
        } catch (error) {
            console.error(`Error updating event instance ${eventId}/${instanceDate}:`, error.response?.data || error.message);
            throw error;
        }
    }

    async deleteEvent(id, recurring, token) {
        try {
            let url = `/events/${id}`;
            if (recurring) {
                url += `?recurring=${recurring}`;
            }
            await this.client.delete(url, this._setAuthHeader(token));
            return true;
        } catch (error) {
            console.error(`Error deleting event ${id}:`, error.response?.data || error.message);
            return false;
        }
    }

    async getEventReminders(eventId, token) {
        try {
            const response = await this.client.get(`/events/${eventId}/reminders`, this._setAuthHeader(token));
            return response.data;
        } catch (error) {
            console.error(`Error fetching reminders for event ${eventId}:`, error.response?.data || error.message);
            return [];
        }
    }

    async createReminder(eventId, minutesBefore, method, token) {
        try {
            const response = await this.client.post(
                `/events/${eventId}/reminders`,
                { minutesBefore, method },
                this._setAuthHeader(token)
            );
            return response.data;
        } catch (error) {
            console.error(`Error creating reminder for event ${eventId}:`, error.response?.data || error.message);
            throw error;
        }
    }

    async deleteReminder(id, token) {
        try {
            await this.client.delete(`/reminders/${id}`, this._setAuthHeader(token));
            return true;
        } catch (error) {
            console.error(`Error deleting reminder ${id}:`, error.response?.data || error.message);
            return false;
        }
    }

    async getEventAttendees(eventId, token) {
        try {
            const response = await this.client.get(`/events/${eventId}/attendees`, this._setAuthHeader(token));
            return response.data;
        } catch (error) {
            console.error(`Error fetching attendees for event ${eventId}:`, error.response?.data || error.message);
            return [];
        }
    }

    async getRecurrenceRule(recurrenceRuleId, token) {
        try {
            const response = await this.client.get(`/recurrence-rules/${recurrenceRuleId}`, this._setAuthHeader(token));
            return response.data;
        } catch (error) {
            console.error(`Error fetching recurrence rule ${recurrenceRuleId}:`, error.response?.data || error.message);
            return null;
        }
    }
}

module.exports = EventAPI;