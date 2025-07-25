const axios = require('axios');

class AuthAPI {
    constructor() {
        this.baseURL = process.env.AUTH_SERVICE_URL;
        this.client = axios.create({
            baseURL: this.baseURL,
        });
    }

    async register(input) {
        try {
            const response = await this.client.post('/auth/register', input);
            return response.data;
        } catch (error) {
            console.error('Error registering user:', error.response?.data || error.message);
            throw error;
        }
    }

    async login(input) {
        try {
            const response = await this.client.post('/auth/login', input);
            return response.data;
        } catch (error) {
            console.error('Error logging in:', error.response?.data || error.message);
            throw error;
        }
    }

    async refreshToken(refreshToken) {
        try {
            const response = await this.client.post('/auth/refresh', { refreshToken });
            return response.data;
        } catch (error) {
            console.error('Error refreshing token:', error.response?.data || error.message);
            throw error;
        }
    }

    async logout(refreshToken) {
        try {
            await this.client.post('/auth/logout', { refreshToken });
            return true;
        } catch (error) {
            console.error('Error logging out:', error.response?.data || error.message);
            return false;
        }
    }
}

module.exports = AuthAPI;