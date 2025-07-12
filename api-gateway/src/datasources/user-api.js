const { RESTDataSource } = require('apollo-datasource-rest');

class UserAPI extends RESTDataSource {
  constructor() {
    super();
    this.baseURL = process.env.USER_SERVICE_URL || 'http://localhost:3002';
  }

  async getUser(id, token, userId) {
    return this.get(`users/${id}`, undefined, { headers: { Authorization: token, 'X-User-ID': userId } });
  }

  async getCurrentUser(token, userId) {
    return this.get('users/me', undefined, { headers: { Authorization: token, 'X-User-ID': userId } });
  }

  async updateUser(input, token, userId) {
    return this.put('users/me', input, { headers: { Authorization: token, 'X-User-ID': userId } });
  }

  async getUserPreferences(id, token, userId) {
    return this.get(`users/${id}/preferences`, undefined, { headers: { Authorization: token, 'X-User-ID': userId } });
  }

  async updatePreferences(input, token, userId) {
    return this.put('users/me/preferences', input, { headers: { Authorization: token, 'X-User-ID': userId } });
  }

  
}

module.exports = UserAPI;
