const request = require('supertest');
const app = require('../../src/index');
const pool = require('../../src/db/pool');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

jest.mock('../../src/db/pool');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('Auth API Integration Tests (Trimmed)', () => {
    let testUserId;
    let testAccessToken;
    let testRefreshToken;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'test_jwt_secret';
        process.env.JWT_REFRESH_SECRET = 'test_jwt_refresh_secret';

        // Mock bcrypt
        bcrypt.genSalt.mockResolvedValue('mockSalt');
        bcrypt.hash.mockResolvedValue('mockHashedPassword');
        bcrypt.compare.mockResolvedValue(true);

        // Mock jwt
        jwt.sign.mockImplementation((payload, secret, options) => {
            if (secret === process.env.JWT_SECRET) return 'mockAccessToken';
            if (secret === process.env.JWT_REFRESH_SECRET) return 'mockRefreshToken';
            return 'mockToken';
        });
        jwt.verify.mockImplementation((token, secret) => {
            if (token === 'mockAccessToken' && secret === process.env.JWT_SECRET) return { userId: testUserId };
            if (token === 'mockRefreshToken' && secret === process.env.JWT_REFRESH_SECRET) return { userId: testUserId };
            return { userId: 'some-user-id' }; // Default for other tokens
        });

        // Mock pool.query for registration
        pool.query.mockImplementation((sql, params) => {
            if (sql.includes('SELECT * FROM users WHERE email = $1')) {
                return Promise.resolve({ rows: [] }); // User does not exist
            } else if (sql.includes('INSERT INTO users')) {
                testUserId = params[0];
                return Promise.resolve({ rows: [{ id: testUserId, email: params[1], name: params[3] }] });
            } else if (sql.includes('INSERT INTO calendars')) {
                return Promise.resolve({ rows: [{ id: params[0] }] });
            } else if (sql.includes('INSERT INTO refresh_tokens')) {
                return Promise.resolve({ rows: [{ id: params[0] }] });
            } else if (sql.includes('INSERT INTO user_preferences')) {
                return Promise.resolve({ rows: [{ id: params[0] }] });
            }
            return Promise.resolve({ rows: [] });
        });
    });

    it('should register a new user', async () => {
        const res = await request(app)
            .post('/auth/register')
            .send({
                email: 'test@example.com',
                password: 'Password123!',
                name: 'Test User',
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('message', 'User created successfully');
        expect(res.body).toHaveProperty('userId');
    });
});