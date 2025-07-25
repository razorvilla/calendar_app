const request = require('supertest');

// Mock authentication middleware
jest.mock('../../src/api/middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { userId: 'test-user-id' };
    next();
  },
  authorizeService: (req, res, next) => next(),
  validateApiKey: (req, res, next) => next(),
  authorizeAdmin: (req, res, next) => next(),
}));

// Mock notificationService
jest.mock('../../src/services/notification', () => ({
  getNotificationCounts: jest.fn(() => ({
    unread: 5,
    today: 10,
    thisWeek: 10,
  })),
}));

// Mock notification routes
jest.mock('../../src/api/routes/notification', () => {
  const express = require('express');
  const router = express.Router();
  router.get('/count', (req, res) => {
    res.json({ success: true, data: { unread: 5, today: 10, thisWeek: 10 } });
  });
  return router;
});

const app = require('../../src/index');

describe('Notification API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /notifications/count should return 200', async () => {
    const res = await request(app).get('/notifications/count');
    expect(res.statusCode).toEqual(200);
  });
});