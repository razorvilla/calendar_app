const request = require('supertest');
const app = require('../../src/index');
const pool = require('../../src/db/pool');
const { generateToken } = require('../../src/utils/auth');
const axios = require('axios');

jest.mock('../../src/db/pool');
jest.mock('axios');

describe('Calendar Share API Integration Tests', () => {
    let user1Token, user2Token;
    let user1Id = 'user1-id';
    let user2Id = 'user2-id';
    let calendarId = 'test-calendar-id';

    beforeAll(async () => {
        user1Token = generateToken(user1Id);
        user2Token = generateToken(user2Id);

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

        // Mock axios for notification service calls
        axios.post.mockResolvedValue({ data: { message: 'Email sent' } });
    });

    afterAll(async () => {
        jest.clearAllMocks();
    });

    let shareId;
    let inviteToken;

    it('should allow owner to share a calendar with another user', async () => {
        // Mock calendar ownership check
        pool.query.mockResolvedValueOnce({ rows: [{ id: calendarId, owner_id: user1Id, name: "User1's Calendar" }] });
        // Mock user check (user2 exists)
        pool.query.mockResolvedValueOnce({ rows: [{ id: user2Id, email: 'user2@example.com' }] });
        // Mock share check (no existing share)
        pool.query.mockResolvedValueOnce({ rows: [] });
        // Mock insert share
        const mockShare = { id: 'share-id-1', calendar_id: calendarId, user_id: user2Id, email: 'user2@example.com', permission: 'view', status: 'accepted', invite_token: 'token123' };
        pool.query.mockResolvedValueOnce({ rows: [mockShare] });

        const res = await request(app)
            .post(`/calendars/${calendarId}/share`)
            .set('Authorization', `Bearer ${user1Token}`)
            .send({
                email: 'user2@example.com',
                permission: 'view',
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body.email).toEqual('user2@example.com');
        shareId = res.body.id;
        inviteToken = res.body.invite_token;
    });

    it('should allow the invited user to accept the share invitation', async () => {
        // Mock token check
        pool.query.mockResolvedValueOnce({ rows: [{ id: shareId, invite_token: inviteToken, status: 'pending' }] });
        // Mock update share status
        pool.query.mockResolvedValueOnce({ rows: [{ id: shareId, status: 'accepted' }] });

        const res = await request(app)
            .get(`/calendars/share/accept/${inviteToken}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.message).toEqual('Calendar share accepted successfully');
        expect(res.body.share.status).toEqual('accepted');
    });

    it('should allow owner to get calendar shares', async () => {
        // Mock calendar ownership check
        pool.query.mockResolvedValueOnce({ rows: [{ id: calendarId, owner_id: user1Id }] });
        // Mock get all shares
        pool.query.mockResolvedValueOnce({ rows: [{ id: shareId, email: 'user2@example.com' }] });

        const res = await request(app)
            .get(`/calendars/${calendarId}/shares`)
            .set('Authorization', `Bearer ${user1Token}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.length).toBeGreaterThan(0);
        expect(res.body[0].email).toEqual('user2@example.com');
    });

    it('should allow owner to update a calendar share', async () => {
        // Mock calendar ownership check
        pool.query.mockResolvedValueOnce({ rows: [{ id: calendarId, owner_id: user1Id }] });
        // Mock share check
        pool.query.mockResolvedValueOnce({ rows: [{ id: shareId, calendar_id: calendarId, user_id: user2Id }] });
        // Mock update share
        pool.query.mockResolvedValueOnce({ rows: [{ id: shareId, permission: 'edit' }] });

        const res = await request(app)
            .patch(`/calendars/${calendarId}/shares/${shareId}`)
            .set('Authorization', `Bearer ${user1Token}`)
            .send({
                permission: 'edit',
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body.permission).toEqual('edit');
    });

    it('should allow owner to delete a calendar share', async () => {
        // Mock calendar ownership check
        pool.query.mockResolvedValueOnce({ rows: [{ id: calendarId, owner_id: user1Id }] });
        // Mock share check
        pool.query.mockResolvedValueOnce({ rows: [{ id: shareId, calendar_id: calendarId, user_id: user2Id }] });
        // Mock delete share
        pool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

        const res = await request(app)
            .delete(`/calendars/${calendarId}/shares/${shareId}`)
            .set('Authorization', `Bearer ${user1Token}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.message).toEqual('Share deleted successfully');
    });

    it('should allow owner to resend a pending share invitation', async () => {
        // Mock calendar ownership check
        pool.query.mockResolvedValueOnce({ rows: [{ id: calendarId, owner_id: user1Id, name: "User1's Calendar" }] });
        // Mock share check (pending invitation)
        pool.query.mockResolvedValueOnce({ rows: [{ id: 'new-share-id', calendar_id: calendarId, email: 'user2@example.com', status: 'pending', invite_token: 'newtoken123' }] });

        const res = await request(app)
            .post(`/calendars/${calendarId}/shares/new-share-id/resend`)
            .set('Authorization', `Bearer ${user1Token}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.message).toEqual('Invitation resent successfully');
    });
});