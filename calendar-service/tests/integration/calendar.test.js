const request = require('supertest');
const app = require('../../src/index'); // Your Express app
const pool = require('../../src/db/pool');
const { generateToken } = require('../../src/utils/auth');

jest.mock('../../src/db/pool');

describe('Calendar API Integration Tests', () => {
    let authToken;
    let userId = 'test-user-id';

    beforeAll(async () => {
        authToken = generateToken(userId);

        // Mock pool.query for setup
        pool.query.mockResolvedValue({
            rows: [],
            rowCount: 0
        });

        // Mock pool.connect and client.query for transactions
        const mockClient = {
            query: jest.fn().mockResolvedValue({ rows: [] }),
            release: jest.fn(),
        };
        pool.connect.mockResolvedValue(mockClient);
    });

    afterAll(async () => {
        jest.clearAllMocks();
    });

    let calendarId;

    it('should create a new calendar', async () => {
        const mockCalendar = {
            id: 'new-calendar-id',
            owner_id: userId,
            name: 'My Test Calendar',
            description: 'A calendar for testing',
            color: '#FF0000',
            is_default: true,
            is_visible: true,
            created_at: new Date().toISOString(),
            is_owner: true,
            role: 'owner'
        };

        pool.connect.mockResolvedValueOnce({
            query: jest.fn(sql => {
                if (sql.includes('BEGIN')) return Promise.resolve();
                if (sql.includes('INSERT INTO calendars')) return Promise.resolve({ rows: [mockCalendar] });
                if (sql.includes('UPDATE calendars SET is_default')) return Promise.resolve();
                if (sql.includes('COMMIT')) return Promise.resolve();
                return Promise.reject(new Error('Unexpected query'));
            }),
            release: jest.fn(),
        });

        const res = await request(app)
            .post('/calendars')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                name: 'My Test Calendar',
                description: 'A calendar for testing',
                color: '#FF0000',
                isDefault: true,
                isVisible: true,
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body.name).toEqual('My Test Calendar');
        calendarId = res.body.id;
    });

    it('should get all calendars for the user', async () => {
        const mockCalendars = [{
            id: calendarId,
            owner_id: userId,
            name: 'My Test Calendar',
            is_owner: true,
            role: 'owner'
        }];
        pool.query.mockResolvedValueOnce({ rows: mockCalendars });

        const res = await request(app)
            .get('/calendars')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.length).toBeGreaterThan(0);
        expect(res.body[0].name).toEqual('My Test Calendar');
    });

    it('should get a specific calendar by ID', async () => {
        const mockCalendar = {
            id: calendarId,
            owner_id: userId,
            name: 'My Test Calendar',
            is_owner: true,
            role: 'owner'
        };
        pool.query.mockResolvedValueOnce({ rows: [mockCalendar] }); // For access check
        pool.query.mockResolvedValueOnce({ rows: [] }); // For shares (if owner)

        const res = await request(app)
            .get(`/calendars/${calendarId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.id).toEqual(calendarId);
        expect(res.body.name).toEqual('My Test Calendar');
    });

    it('should update a calendar', async () => {
        const updatedCalendar = {
            id: calendarId,
            owner_id: userId,
            name: 'Updated Calendar Name',
            color: '#00FF00',
            is_owner: true,
            role: 'owner'
        };

        pool.query.mockResolvedValueOnce({ rows: [{ owner_id: userId, role: 'owner' }] }); // Access check
        pool.connect.mockResolvedValueOnce({
            query: jest.fn(sql => {
                if (sql.includes('BEGIN')) return Promise.resolve();
                if (sql.includes('UPDATE calendars SET')) return Promise.resolve({ rows: [updatedCalendar] });
                if (sql.includes('COMMIT')) return Promise.resolve();
                return Promise.reject(new Error('Unexpected query'));
            }),
            release: jest.fn(),
        });

        const res = await request(app)
            .patch(`/calendars/${calendarId}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                name: 'Updated Calendar Name',
                color: '#00FF00',
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body.name).toEqual('Updated Calendar Name');
        expect(res.body.color).toEqual('#00FF00');
    });

    it('should delete a calendar', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ owner_id: userId }] }); // Owner check
        pool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Delete operation

        const res = await request(app)
            .delete(`/calendars/${calendarId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.message).toEqual('Calendar deleted successfully');

        // Verify it's deleted (mocking 404 response)
        pool.query.mockResolvedValueOnce({ rows: [] }); // For getCalendarById after delete
        const getRes = await request(app)
            .get(`/calendars/${calendarId}`)
            .set('Authorization', `Bearer ${authToken}`);
        expect(getRes.statusCode).toEqual(404);
    });
});