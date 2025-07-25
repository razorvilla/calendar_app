const axios = require('axios');

class UserAPI {
    constructor() {
        this.baseURL = process.env.USER_SERVICE_URL;
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

    async getCurrentUser(token) {
        try {
            const response = await this.client.get('/users/me', this._setAuthHeader(token));
            return response.data;
        } catch (error) {
            console.error('Error fetching current user:', error.response?.data || error.message);
            throw error;
        }
    }

    async getUser(userId, token) {
        try {
            if (!userId) return null;
            const response = await this.client.get(`/users/${userId}`, this._setAuthHeader(token));
            return response.data;
        } catch (error) {
            console.error(`Error fetching user ${userId}:`, error.response?.data || error.message);
            return null;
        }
    }

    async getUserPreferences(userId, token) {
        try {
            const response = await this.client.get(`/users/${userId}/preferences`, this._setAuthHeader(token));
            return response.data;
        } catch (error) {
            console.error(`Error fetching preferences for user ${userId}:`, error.response?.data || error.message);
            return null;
        }
    }

    async updateUser(input, token) {
        try {
            const response = await this.client.patch('/users/me', input, this._setAuthHeader(token));
            return response.data;
        } catch (error) {
            console.error('Error updating user:', error.response?.data || error.message);
            throw error;
        }
    }

    async updatePreferences(input, token) {
        try {
            const response = await this.client.patch('/users/preferences', input, this._setAuthHeader(token));
            return response.data;
        } catch (error) {
            console.error('Error updating preferences:', error.response?.data || error.message);
            throw error;
        }
    }
}

module.exports = UserAPI;