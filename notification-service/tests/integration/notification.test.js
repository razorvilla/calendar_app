const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const Notification = require('../../src/models/notification');
const NotificationTemplate = require('../../src/models/template');
const NotificationPreference = require('../../src/models/preference');
const app = require('../../src/index'); // Assuming your main app file exports the express app

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
});

afterEach(async () => {
    await Notification.deleteMany({});
    await NotificationTemplate.deleteMany({});
    await NotificationPreference.deleteMany({});
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('Notification API Integration Tests', () => {
    it('should create a notification from template', async () => {
        // Create a template first
        const template = await NotificationTemplate.create({
            name: 'test_template',
            type: 'CUSTOM',
            titleTemplate: 'Hello {{name}}',
            messageTemplate: 'Welcome, {{name}}!',
            defaultChannels: ['IN_APP'],
            defaultPriority: 'HIGH',
            variables: ['name'],
        });

        const res = await request(app)
            .post('/api/notifications/template')
            .send({
                templateName: 'test_template',
                userId: '60d5ecf0f1c5e7001c000001',
                data: { name: 'John Doe' },
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('_id');
        expect(res.body.title).toBe('Hello John Doe');
        expect(res.body.message).toBe('Welcome, John Doe!');
        expect(res.body.channel).toEqual(['IN_APP']);
    });

    // Add more integration tests here
});
