const { RESTDataSource } = require('apollo-datasource-rest');

class AuthAPI extends RESTDataSource {
  constructor() {
    super();
    this.baseURL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
  }

  async login(input) {
    console.log(`AuthAPI: Sending login request to ${this.baseURL}/auth/login with data:`, input);
    try {
      return await this.post('auth/login', input);
    } catch (error) {
      console.error('AuthAPI: Error during login request:', error.message);
      if (error.extensions && error.extensions.response) {
        console.error('AuthAPI: Auth Service response data:', error.extensions.response.body);
      }
      throw error; // Re-throw to be caught by resolver
    }
  }

  async register(input) {
    console.log(`AuthAPI: Sending register request to ${this.baseURL}/auth/register with data:`, input);
    console.log('AuthAPI: Attempting to make HTTP POST request to auth-service...');
    try {
      return await this.post('auth/register', input);
    } catch (error) {
      console.error('AuthAPI: Error during register request:', error.message);
      if (error.extensions && error.extensions.response) {
        console.error('AuthAPI: Auth Service response data:', error.extensions.response.body);
      }
      throw error; // Re-throw to be caught by resolver
    }
  }

  async refreshToken() {
    const refreshToken = this.context.req.cookies.refreshToken;
    if (!refreshToken) {
      throw new Error('Refresh token not found in cookies');
    }
    return this.post('auth/refresh', { refreshToken });
  }

  async logout() {
    const refreshToken = this.context.req.cookies.refreshToken;
    if (!refreshToken) {
      // If no refresh token, consider it a successful logout from client perspective
      return { message: 'Logged out successfully' };
    }
    return this.post('auth/logout', { refreshToken });
  }

  async generateMfaSecret(userId) {
    return this.post('auth/mfa/generate-secret', { userId });
  }

  async verifyMfaSetup(userId, token, secret) {
    return this.post('auth/mfa/verify-setup', { userId, token, secret });
  }

  async enableMfa(userId, secret) {
    return this.post('auth/mfa/enable', { userId, secret });
  }

  async disableMfa(userId) {
    return this.post('auth/mfa/disable', { userId });
  }
}

module.exports = AuthAPI;
