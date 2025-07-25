
const request = require('supertest');
const express = require('express');
const userRoutes = require('@/routes/user');
const userController = require('@/controllers/user');
const preferenceController = require('@/controllers/preference');

// Mock the authenticate middleware
jest.mock('@/middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 'test-user-id', email: 'test@example.com' }; // Mock authenticated user
    next();
  },
}));

// Mock the userController.getCurrentUser
jest.mock('@/controllers/user', () => ({
  getCurrentUser: jest.fn((req, res) => {
    res.status(200).json(req.user);
  }),
  searchUsers: jest.fn(),
  getUserById: jest.fn(),
  updateProfile: jest.fn(),
  changePassword: jest.fn(),
}));

// Mock the preferenceController (if needed for other tests, but not for /me)
jest.mock('@/controllers/preference', () => ({
  getUserPreferences: jest.fn(),
  updatePreferences: jest.fn(),
  getUserPreferencesById: jest.fn(),
}));

const app = express();
app.use(express.json());
app.use('/users', userRoutes);

describe('User API', () => {
  it('GET /users/me should return the current user', async () => {
    const res = await request(app).get('/users/me');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({ id: 'test-user-id', email: 'test@example.com' });
    expect(userController.getCurrentUser).toHaveBeenCalledTimes(1);
  });
});
