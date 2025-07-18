const eventListener = require('../../src/services/eventListener');
const { Kafka } = require('kafkajs');
const notificationController = require('../../src/controllers/notification');
const logger = require('../../src/utils/logger');
const queueService = require('../../src/services/queueService');

jest.mock('kafkajs');
jest.mock('../../src/controllers/notification');
jest.mock('../../src/utils/logger');
jest.mock('../../src/services/queueService');

describe('Event Listener Service', () => {
    let mockConsumer;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.ENABLE_KAFKA = 'true';
        process.env.KAFKA_CLIENT_ID = 'test-client';
        process.env.KAFKA_BROKERS = 'localhost:9092';
        process.env.KAFKA_GROUP_ID = 'test-group';

        mockConsumer = {
            connect: jest.fn(),
            subscribe: jest.fn(),
            run: jest.fn(),
            disconnect: jest.fn(),
        };
        Kafka.mockImplementation(() => ({
            consumer: jest.fn(() => mockConsumer),
        }));
    });

    describe('initialize', () => {
        it('should initialize Kafka consumer and subscribe to topics when enabled', async () => {
            const result = await eventListener.initialize();

            expect(Kafka).toHaveBeenCalledTimes(1);
            expect(mockConsumer.connect).toHaveBeenCalledTimes(1);
            expect(mockConsumer.subscribe).toHaveBeenCalledTimes(3);
            expect(mockConsumer.subscribe).toHaveBeenCalledWith({ topic: 'event-service-events', fromBeginning: false });
            expect(mockConsumer.subscribe).toHaveBeenCalledWith({ topic: 'user-service-events', fromBeginning: false });
            expect(mockConsumer.subscribe).toHaveBeenCalledWith({ topic: 'calendar-service-events', fromBeginning: false });
            expect(mockConsumer.run).toHaveBeenCalledTimes(1);
            expect(logger.info).toHaveBeenCalledWith('Kafka event listener initialized and connected');
            expect(result).toBe(true);
        });

        it('should return false and log info when Kafka is disabled', async () => {
            process.env.ENABLE_KAFKA = 'false';

            const result = await eventListener.initialize();

            expect(Kafka).not.toHaveBeenCalled();
            expect(logger.info).toHaveBeenCalledWith('Kafka event listener is disabled');
            expect(result).toBe(false);
        });

        it('should return false and log error when Kafka initialization fails', async () => {
            mockConsumer.connect.mockRejectedValue(new Error('Kafka connection failed'));

            const result = await eventListener.initialize();

            expect(Kafka).toHaveBeenCalledTimes(1);
            expect(mockConsumer.connect).toHaveBeenCalledTimes(1);
            expect(logger.error).toHaveBeenCalledWith('Error initializing Kafka consumer: Kafka connection failed');
            expect(result).toBe(false);
        });
    });

    describe('processEvent', () => {
        it('should process an event and add to immediate queue', async () => {
            const payload = { eventType: 'event.created', data: { creatorId: 'user1' } };
            notificationController.createFromTemplate.mockResolvedValue({ _id: 'notif1' });

            const result = await eventListener.processEvent(payload);

            expect(notificationController.createFromTemplate).toHaveBeenCalledWith('event_created', 'user1', payload.data);
            expect(queueService.addToQueue).toHaveBeenCalledWith('notif1');
            expect(logger.info).toHaveBeenCalledWith('Created notification notif1 for event event.created');
            expect(result).toBe(true);
        });

        it('should process an event and schedule it', async () => {
            const scheduledTime = new Date(Date.now() + 3600000);
            const payload = { eventType: 'event.reminder', data: { userId: 'user1', reminderTime: scheduledTime.toISOString() } };
            notificationController.createFromTemplate.mockResolvedValue({ _id: 'notif2', scheduledFor: scheduledTime });

            const result = await eventListener.processEvent(payload);

            expect(notificationController.createFromTemplate).toHaveBeenCalledWith('event_reminder', 'user1', payload.data);
            expect(queueService.scheduleInQueue).toHaveBeenCalledWith('notif2', expect.any(Date));
            expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Created notification notif2 for event event.reminder'));
            expect(result).toBe(true);
        });

        it('should log warning if no template mapping found', async () => {
            const payload = { eventType: 'unknown.event', data: {} };

            const result = await eventListener.processEvent(payload);

            expect(notificationController.createFromTemplate).not.toHaveBeenCalled();
            expect(logger.warn).toHaveBeenCalledWith('No template mapping found for event type: unknown.event');
            expect(result).toBe(false);
        });

        it('should log warning if no user ID found', async () => {
            const payload = { eventType: 'event.created', data: {} }; // Missing creatorId
            notificationController.createFromTemplate.mockResolvedValue({ _id: 'notif3' });

            const result = await eventListener.processEvent(payload);

            expect(logger.warn).toHaveBeenCalledWith('No user ID found in event data for: event.created');
            expect(notificationController.createFromTemplate).not.toHaveBeenCalled();
            expect(result).toBe(false);
        });

        it('should log warning if notification creation from template fails', async () => {
            const payload = { eventType: 'event.created', data: { creatorId: 'user1' } };
            notificationController.createFromTemplate.mockResolvedValue(null);

            const result = await eventListener.processEvent(payload);

            expect(notificationController.createFromTemplate).toHaveBeenCalledTimes(1);
            expect(logger.warn).toHaveBeenCalledWith('Failed to create notification for event: event.created');
            expect(result).toBe(false);
        });

        it('should log error if processing event throws an error', async () => {
            const payload = { eventType: 'event.created', data: { creatorId: 'user1' } };
            notificationController.createFromTemplate.mockRejectedValue(new Error('DB error'));

            const result = await eventListener.processEvent(payload);

            expect(logger.error).toHaveBeenCalledWith('Error processing event: DB error');
            expect(result).toBe(false);
        });
    });

    

    describe('disconnect', () => {
        it('should disconnect Kafka consumer if it exists', async () => {
            await eventListener.initialize(); // Initialize to create consumer
            await eventListener.disconnect();

            expect(mockConsumer.disconnect).toHaveBeenCalledTimes(1);
            expect(logger.info).toHaveBeenCalledWith('Kafka event listener disconnected');
        });

        it('should return true if consumer does not exist', async () => {
            // Do not call initialize
            const result = await eventListener.disconnect();
            expect(mockConsumer.disconnect).not.toHaveBeenCalled();
            expect(result).toBe(true);
        });

        it('should log error and return false if disconnection fails', async () => {
            await eventListener.initialize();
            mockConsumer.disconnect.mockRejectedValue(new Error('Disconnection failed'));

            const result = await eventListener.disconnect();

            expect(mockConsumer.disconnect).toHaveBeenCalledTimes(1);
            expect(logger.error).toHaveBeenCalledWith('Error disconnecting Kafka consumer: Disconnection failed');
            expect(result).toBe(false);
        });
    });
});