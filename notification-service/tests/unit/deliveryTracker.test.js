const deliveryTracker = require('@services/deliveryTracker');
const Notification = require('@models/notification');
const logger = require('@utils/logger');

jest.mock('@models/notification');
jest.mock('@utils/logger');

describe('Delivery Tracker Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('trackDeliveryStatus', () => {
        it('should update notification status to DELIVERED and add log', async () => {
            const mockNotification = {
                _id: 'notif1',
                status: 'PENDING',
                channel: ['EMAIL'],
                deliveryLogs: [],
                save: jest.fn(),
            };
            Notification.findById.mockResolvedValue(mockNotification);

            const result = await deliveryTracker.trackDeliveryStatus('notif1', 'EMAIL', 'DELIVERED', { success: true });

            expect(mockNotification.status).toBe('DELIVERED');
            expect(mockNotification.deliveredAt).toBeInstanceOf(Date);
            expect(mockNotification.deliveryLogs).toHaveLength(1);
            expect(mockNotification.deliveryLogs[0].channel).toBe('EMAIL');
            expect(mockNotification.deliveryLogs[0].status).toBe('DELIVERED');
            expect(mockNotification.save).toHaveBeenCalledTimes(1);
            expect(result).toBe(true);
        });

        it('should update notification status to FAILED and add log if all channels fail', async () => {
            const mockNotification = {
                _id: 'notif2',
                status: 'PENDING',
                channel: ['EMAIL'],
                deliveryLogs: [],
                save: jest.fn(),
            };
            Notification.findById.mockResolvedValue(mockNotification);

            const result = await deliveryTracker.trackDeliveryStatus('notif2', 'EMAIL', 'FAILED', { error: 'Network error' });

            expect(mockNotification.status).toBe('FAILED');
            expect(mockNotification.lastError).toBeDefined();
            expect(mockNotification.deliveryLogs).toHaveLength(1);
            expect(mockNotification.deliveryLogs[0].channel).toBe('EMAIL');
            expect(mockNotification.deliveryLogs[0].status).toBe('FAILED');
            expect(mockNotification.save).toHaveBeenCalledTimes(1);
            expect(result).toBe(true);
        });

        it('should return false if notification not found', async () => {
            Notification.findById.mockResolvedValue(null);

            const result = await deliveryTracker.trackDeliveryStatus('nonexistent', 'EMAIL', 'DELIVERED', {});

            expect(result).toBe(false);
            expect(logger.warn).toHaveBeenCalledWith('Notification not found for tracking: nonexistent');
        });
    });

    describe('trackNotificationRead', () => {
        it('should mark a notification as read and add log', async () => {
            const mockNotification = {
                _id: 'notif3',
                userId: 'user1',
                readAt: null,
                deliveryLogs: [],
                save: jest.fn(),
            };
            Notification.findById.mockResolvedValue(mockNotification);

            const result = await deliveryTracker.trackNotificationRead('notif3', { source: 'API' });

            expect(mockNotification.readAt).toBeInstanceOf(Date);
            expect(mockNotification.deliveryLogs).toHaveLength(1);
            expect(mockNotification.deliveryLogs[0].channel).toBe('USER');
            expect(mockNotification.deliveryLogs[0].status).toBe('READ');
            expect(mockNotification.save).toHaveBeenCalledTimes(1);
            expect(result).toBe(true);
        });

        it('should return false if notification not found', async () => {
            Notification.findById.mockResolvedValue(null);

            const result = await deliveryTracker.trackNotificationRead('nonexistent', {});

            expect(result).toBe(false);
            expect(logger.warn).toHaveBeenCalledWith('Notification not found for read tracking: nonexistent');
        });
    });

    describe('trackDeliveryFailure', () => {
        it('should mark a notification as failed and add log', async () => {
            const mockNotification = {
                _id: 'notif4',
                status: 'PENDING',
                channel: ['EMAIL'],
                deliveryLogs: [],
                save: jest.fn(),
            };
            Notification.findById.mockResolvedValue(mockNotification);

            const result = await deliveryTracker.trackDeliveryFailure('notif4', 'EMAIL', new Error('SMTP error'));

            expect(mockNotification.status).toBe('FAILED');
            expect(mockNotification.lastError).toBe('SMTP error');
            expect(mockNotification.deliveryLogs).toHaveLength(1);
            expect(mockNotification.deliveryLogs[0].channel).toBe('EMAIL');
            expect(mockNotification.deliveryLogs[0].status).toBe('FAILED');
            expect(mockNotification.save).toHaveBeenCalledTimes(1);
            expect(result).toBe(true);
        });

        it('should return false if notification not found', async () => {
            Notification.findById.mockResolvedValue(null);

            const result = await deliveryTracker.trackDeliveryFailure('nonexistent', 'EMAIL', new Error('Error'));

            expect(result).toBe(false);
            expect(logger.warn).toHaveBeenCalledWith('Notification not found for failure tracking: nonexistent');
        });
    });

    describe('trackExternalConfirmation', () => {
        it('should track external delivery confirmation and update status', async () => {
            const mockNotification = {
                _id: 'notif5',
                status: 'SENT',
                channel: ['EMAIL'],
                deliveryLogs: [{ channel: 'EMAIL', status: 'SENT', details: { externalId: 'ext1' } }],
                save: jest.fn(),
            };
            Notification.findOne.mockResolvedValue(mockNotification);

            const result = await deliveryTracker.trackExternalConfirmation('ext1', 'DELIVERED', { provider: 'sendgrid' });

            expect(mockNotification.status).toBe('DELIVERED');
            expect(mockNotification.deliveredAt).toBeInstanceOf(Date);
            expect(mockNotification.deliveryLogs).toHaveLength(2);
            expect(mockNotification.deliveryLogs[1].status).toBe('DELIVERED');
            expect(mockNotification.deliveryLogs[1].details.externalId).toBe('ext1');
            expect(mockNotification.save).toHaveBeenCalledTimes(1);
            expect(result).toBe(true);
        });

        it('should return false if no notification found for external ID', async () => {
            Notification.findOne.mockResolvedValue(null);

            const result = await deliveryTracker.trackExternalConfirmation('nonexistent-ext', 'DELIVERED', {});

            expect(result).toBe(false);
            expect(logger.warn).toHaveBeenCalledWith('No notification found for external ID: nonexistent-ext');
        });
    });

    describe('getDeliveryStats', () => {
        it('should return delivery statistics', async () => {
            const mockNotifications = [
                { status: 'DELIVERED', createdAt: new Date(), sentAt: new Date(Date.now() - 1000), deliveredAt: new Date() },
                { status: 'DELIVERED', createdAt: new Date(), sentAt: new Date(Date.now() - 2000), deliveredAt: new Date() },
                { status: 'FAILED', createdAt: new Date() },
                { status: 'PENDING', createdAt: new Date() },
                { status: 'CANCELED', createdAt: new Date() },
            ];
            Notification.countDocuments.mockResolvedValueOnce(5); // total
            Notification.aggregate.mockResolvedValueOnce([{ _id: 'DELIVERED', count: 2 }, { _id: 'FAILED', count: 1 }, { _id: 'PENDING', count: 1 }, { _id: 'CANCELED', count: 1 }]); // statusCounts
            Notification.aggregate.mockResolvedValueOnce([{ _id: 'EMAIL', count: 3 }]); // channelCounts
            Notification.countDocuments.mockResolvedValueOnce(1); // readCount
            Notification.aggregate.mockResolvedValueOnce([{ _id: null, avgDeliveryTime: 1500, minDeliveryTime: 1000, maxDeliveryTime: 2000 }]); // deliveryTimes

            const startDate = new Date(Date.now() - 3600000);
            const endDate = new Date();
            const stats = await deliveryTracker.getDeliveryStats(startDate, endDate);

            expect(stats).toHaveProperty('total', 5);
            expect(stats.status).toEqual({
                delivered: 2,
                failed: 1,
                pending: 1,
                canceled: 1,
            });
            expect(stats.channels).toEqual({
                email: 3,
            });
            expect(stats.readRate).toBeCloseTo(20); // 1 read out of 5 total
            expect(stats.deliveryTimes.average).toBe(1500);
        });
    });
});