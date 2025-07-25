require('../setup');
const request = require('supertest');
const app = require('../../src/index');
const pool = require('../../src/db/pool');
const jwt = require('jsonwebtoken');

jest.mock('../../src/db/pool');

describe('Reminder API Integration Tests', () => {
    let userId = 'test-user-id';
    let accessToken;
    let eventId = 'test-event-id';

    beforeAll(() => {
        process.env.JWT_SECRET = 'test_jwt_secret';
        accessToken = jwt.sign({ userId: userId }, process.env.JWT_SECRET);
        jest.spyOn(jwt, 'verify').mockReturnValue({ userId: userId });
        
    });

    beforeEach(() => {
        jest.clearAllMocks();
        pool.query.mockResolvedValue({ rows: [], rowCount: 0 });
    });

    it('should get event reminders', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ id: eventId, access_role: 'owner' }] }); // Event access
        pool.query.mockResolvedValueOnce({ rows: [{ id: 'reminder1', event_id: eventId, user_id: userId }] }); // Reminders

        const res = await request(app)
            .get(`/events/${eventId}/reminders`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0]).toHaveProperty('id', 'reminder1');
    });

    it('should create a reminder', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ id: eventId, access_role: 'owner' }] }); // Event access
        pool.query.mockResolvedValueOnce({ rows: [] }); // Reminder check (not exists)
        pool.query.mockResolvedValueOnce({ rows: [{ id: 'new-reminder-id', event_id: eventId, user_id: userId, minutes_before: 10, method: 'notification' }] }); // Insert reminder

        const res = await request(app)
            .post(`/events/${eventId}/reminders`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                minutesBefore: 10,
                method: 'notification',
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('id', 'new-reminder-id');
    });

    it('should delete a reminder', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ id: 'reminder1', user_id: userId }] }); // Reminder ownership
        pool.query.mockResolvedValueOnce({}); // Delete reminder

        const res = await request(app)
            .delete(`/events/reminders/reminder1`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('message', 'Reminder deleted successfully');
    });
});