const request = require('supertest');
const createServer = require('../../src/index');
const app = createServer();
const pool = require('../../src/db/pool');
const jwt = require('jsonwebtoken');

jest.mock('../../src/db/pool');

describe('Event API Integration Tests', () => {
    let userId = 'test-user-id';
    let accessToken;

    beforeAll(() => {
        process.env.JWT_SECRET = 'test_jwt_secret';
        accessToken = jwt.sign({ userId: userId }, process.env.JWT_SECRET);
    });

    beforeEach(() => {
        jest.clearAllMocks();
        pool.query.mockResolvedValue({ rows: [], rowCount: 0 });
        pool.connect.mockResolvedValue({
            query: jest.fn().mockResolvedValue({}),
            release: jest.fn(),
        });
    });

    it('should create a new event', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ id: 'cal1', access_role: 'owner' }] }); // Calendar access
        pool.query.mockResolvedValueOnce({ rows: [{ name: 'Calendar 1', color: 'blue' }] }); // Calendar info
        pool.connect.mockResolvedValue({
            query: jest.fn(sql => {
                if (sql.includes('INSERT INTO events')) {
                    return Promise.resolve({ rows: [{ id: 'event1', calendar_id: 'cal1', title: 'Test Event' }] }); // Include title in mock response
                }
                return Promise.resolve({});
            }),
            release: jest.fn()
        });

        const res = await request(createServer())
            .post('/events')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                calendarId: 'cal1',
                title: 'Test Event',
                startTime: '2024-01-01T10:00:00Z',
                endTime: '2024-01-01T11:00:00Z',
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('title', 'Test Event');
    });

    it('should get events', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ id: 'cal1' }] }); // Accessible calendars
        pool.query.mockResolvedValueOnce({ rows: [{ count: '1' }] }); // Calendar access check
        pool.query.mockResolvedValueOnce({ rows: [{ id: 'event1', title: 'Test Event', recurrence_rule: null }] }); // Non-recurring events
        pool.query.mockResolvedValueOnce({ rows: [] }); // Recurring events

        const res = await request(createServer())
            .get('/events?start=2024-01-01T00:00:00Z&end=2024-01-31T23:59:59Z')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0]).toHaveProperty('title', 'Test Event');
    });

    it('should get a single event', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ id: 'event1', title: 'Test Event', access_role: 'owner' }] }); // Event access
        pool.query.mockResolvedValueOnce({ rows: [] }); // Reminders
        pool.query.mockResolvedValueOnce({ rows: [] }); // Attendees

        const res = await request(createServer())
            .get('/events/event1')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('title', 'Test Event');
    });

    it('should update an event', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ id: 'event1', calendar_id: 'cal1', access_role: 'owner' }] }); // Event access
        pool.query.mockResolvedValueOnce({ rows: [{ id: 'event1', title: 'Updated Event', calendar_id: 'cal1' }] }); // Update event
        pool.query.mockResolvedValueOnce({ rows: [{ name: 'Calendar 1', color: 'blue' }] }); // Calendar info

        const res = await request(createServer())
            .patch('/events/event1')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ title: 'Updated Event' });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('title', 'Updated Event');
    });

    it('should delete an event', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ id: 'event1', access_role: 'owner' }] }); // Event access
        pool.connect.mockResolvedValue({
            query: jest.fn().mockResolvedValueOnce({}), // Delete event
            release: jest.fn()
        });

        const res = await request(createServer())
            .delete('/events/event1')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('message', 'Event deleted successfully');
    });
});