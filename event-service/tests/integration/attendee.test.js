require('../setup');
const request = require('supertest');
const app = require('../../src/index');
const pool = require('../../src/db/pool');
const jwt = require('jsonwebtoken');

jest.mock('../../src/db/pool');

describe('Attendee API Integration Tests', () => {
    let userId = 'test-user-id';
    let accessToken;
    let eventId = 'test-event-id';
    let attendeeId = 'test-attendee-id';

    beforeAll(() => {
        process.env.JWT_SECRET = 'test_jwt_secret';
        accessToken = jwt.sign({ userId: userId }, process.env.JWT_SECRET);
        jest.spyOn(jwt, 'verify').mockReturnValue({ userId: userId });
        
    });

    beforeEach(() => {
        jest.clearAllMocks();
        pool.query.mockResolvedValue({ rows: [], rowCount: 0 });
    });

    it('should get event attendees', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ id: eventId, access_role: 'owner' }] }); // Event access
        pool.query.mockResolvedValueOnce({ rows: [{ id: attendeeId, event_id: eventId, user_id: userId, email: 'attendee@example.com' }] }); // Attendees

        const res = await request(app)
            .get(`/events/${eventId}/attendees`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0]).toHaveProperty('id', attendeeId);
    });

    it('should add an attendee', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ id: eventId, access_role: 'owner' }] }); // Event access
        pool.query.mockResolvedValueOnce({ rows: [] }); // Attendee check (not exists)
        pool.query.mockResolvedValueOnce({ rows: [{ id: 'user2', email: 'attendee@example.com' }] }); // User check
        pool.query.mockResolvedValueOnce({ rows: [{ id: attendeeId, event_id: eventId, user_id: 'user2', email: 'attendee@example.com' }] }); // Insert attendee

        const res = await request(app)
            .post(`/events/${eventId}/attendees`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                email: 'attendee@example.com',
                name: 'Test Attendee',
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('id', attendeeId);
    });

    it('should update attendee response', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ id: attendeeId, event_id: eventId, user_id: userId, email: 'attendee@example.com' }] }); // Attendee check
        pool.query.mockResolvedValueOnce({ rows: [{ id: attendeeId, response_status: 'accepted' }] }); // Update attendee

        const res = await request(app)
            .patch(`/events/${eventId}/attendees/${attendeeId}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                responseStatus: 'accepted',
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('response_status', 'accepted');
    });

    it('should remove an attendee', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ id: eventId, access_role: 'owner' }] }); // Event access
        pool.query.mockResolvedValueOnce({ rows: [{ id: attendeeId, event_id: eventId, user_id: userId }] }); // Attendee check
        pool.query.mockResolvedValueOnce({}); // Delete attendee

        const res = await request(app)
            .delete(`/events/${eventId}/attendees/${attendeeId}`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('message', 'Attendee removed successfully');
    });
});