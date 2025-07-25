const axios = require('axios');

class CalendarAPI {
    constructor() {
        this.baseURL = process.env.CALENDAR_SERVICE_URL;
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

    async getCalendars(token) {
        try {
            const response = await this.client.get('/calendars', this._setAuthHeader(token));
            return response.data;
        } catch (error) {
            console.error('Error fetching calendars:', error.response?.data || error.message);
            return [];
        }
    }

    async getCalendar(calendarId, token) {
        try {
            const response = await this.client.get(`/calendars/${calendarId}`, this._setAuthHeader(token));
            return response.data;
        } catch (error) {
            console.error(`Error fetching calendar ${calendarId}:`, error.response?.data || error.message);
            return null;
        }
    }

    async createCalendar(input, token) {
        try {
            const response = await this.client.post('/calendars', input, this._setAuthHeader(token));
            return response.data;
        } catch (error) {
            console.error('Error creating calendar:', error.response?.data || error.message);
            throw error;
        }
    }

    async updateCalendar(id, input, token) {
        try {
            const response = await this.client.patch(`/calendars/${id}`, input, this._setAuthHeader(token));
            return response.data;
        } catch (error) {
            console.error(`Error updating calendar ${id}:`, error.response?.data || error.message);
            throw error;
        }
    }

    async deleteCalendar(id, token) {
        try {
            await this.client.delete(`/calendars/${id}`, this._setAuthHeader(token));
            return true;
        } catch (error) {
            console.error(`Error deleting calendar ${id}:`, error.response?.data || error.message);
            return false;
        }
    }

    async shareCalendar(input, token) {
        try {
            const response = await this.client.post(`/calendars/${input.calendarId}/share`, {
                email: input.email,
                permission: input.permission
            }, this._setAuthHeader(token));
            return response.data;
        } catch (error) {
            console.error('Error sharing calendar:', error.response?.data || error.message);
            throw error;
        }
    }

    async getCalendarShares(calendarId, token) {
        try {
            const response = await this.client.get(`/calendars/${calendarId}/shares`, this._setAuthHeader(token));
            return response.data;
        } catch (error) {
            console.error(`Error fetching shares for calendar ${calendarId}:`, error.response?.data || error.message);
            return [];
        }
    }
}

module.exports = CalendarAPI;