const deliveryTracker = require('../../src/services/deliveryTracker');
const Notification = require('../../src/models/notification');
const logger = require('../../src/utils/logger');

jest.mock('../../src/models/notification');
jest.mock('../../src/utils/logger');

describe('Delivery Tracker Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('trackDeliveryStatus', () => {
        it('should update notification status to SENT and add log', async () => {
            const mockNotification = {
                _id: 'notif1',
                status: 'PENDING',
                deliveryLogs: [],
                save: jest.fn(),
            };
            Notification.findById.mockResolvedValue(mockNotification);

            const result = await deliveryTracker.trackDeliveryStatus('notif1', 'EMAIL', 'SENT', { success: true });

            expect(mockNotification.status).toBe('SENT');
            expect(mockNotification.sentAt).toBeInstanceOf(Date);
            expect(mockNotification.deliveryLogs).toHaveLength(1);
            expect(mockNotification.deliveryLogs[0].channel).toBe('EMAIL');
            expect(mockNotification.deliveryLogs[0].status).toBe('SENT');
            expect(mockNotification.save).toHaveBeenCalledTimes(1);
            expect(result).toBe(true);
        });

        it('should return false if notification not found', async () => {
            Notification.findById.mockResolvedValue(null);

            const result = await deliveryTracker.trackDeliveryStatus('notif1', 'EMAIL', 'SENT', { success: true });

            expect(result).toBe(false);
            expect(logger.warn).toHaveBeenCalledWith('Notification not found for tracking: notif1');
        });
    });

    describe('trackNotificationDelivered', () => {
        it('should update notification status to DELIVERED and add log', async () => {
            const mockNotification = {
                _id: 'notif1',
                status: 'SENT',
                deliveredAt: null,
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

        it('should return false if notification not found', async () => {
            Notification.findById.mockResolvedValue(null);

            const result = await deliveryTracker.trackDeliveryStatus('notif1', 'EMAIL', 'DELIVERED', { success: true });

            expect(result).toBe(false);
            expect(logger.warn).toHaveBeenCalledWith('Notification not found for tracking: notif1');
        });
    });

    describe('trackNotificationFailed', () => {
        it('should update notification status to FAILED and add log', async () => {
            const mockNotification = {
                _id: 'notif1',
                status: 'SENT',
                deliveryLogs: [],
                save: jest.fn(),
            };
            Notification.findById.mockResolvedValue(mockNotification);

            const result = await deliveryTracker.trackDeliveryFailure('notif1', 'EMAIL', new Error('Error message'));

            expect(mockNotification.status).toBe('FAILED');
            expect(mockNotification.lastError).toBe('Error message');
            expect(mockNotification.deliveryLogs).toHaveLength(1);
            expect(mockNotification.deliveryLogs[0].channel).toBe('EMAIL');
            expect(mockNotification.deliveryLogs[0].status).toBe('FAILED');
            expect(mockNotification.save).toHaveBeenCalledTimes(1);
            expect(result).toBe(true);
        });

        it('should return false if notification not found', async () => {
            Notification.findById.mockResolvedValue(null);

            const result = await deliveryTracker.trackDeliveryFailure('notif1', 'EMAIL', new Error('Error message'));

            expect(result).toBe(false);
            expect(logger.warn).toHaveBeenCalledWith('Notification not found for failure tracking: notif1');
        });
    });

    describe('trackNotificationRead', () => {
        it('should update notification readAt and add log', async () => {
            const mockNotification = {
                _id: 'notif1',
                readAt: null,
                deliveryLogs: [],
                save: jest.fn(),
            };
            Notification.findById.mockResolvedValue(mockNotification);

            const result = await deliveryTracker.trackNotificationRead('notif1', { source: 'API' });

            
            expect(mockNotification.deliveryLogs).toHaveLength(1);
            expect(mockNotification.deliveryLogs[0].channel).toBe('USER');
            expect(mockNotification.deliveryLogs[0].status).toBe('READ');
            expect(mockNotification.save).toHaveBeenCalledTimes(1);
            expect(result).toBe(true);
        });

        it('should return false if notification not found', async () => {
            Notification.findById.mockResolvedValue(null);

            const result = await deliveryTracker.trackNotificationRead('notif1', { source: 'API' });

            expect(result).toBe(false);
            expect(logger.warn).toHaveBeenCalledWith('Notification not found for read tracking: notif1');
        });
    });

    describe('trackExternalConfirmation', () => {
        it('should update notification status and add log for external confirmation', async () => {
            const mockNotification = {
                _id: 'notif1',
                status: 'SENT',
                deliveryLogs: [],
                save: jest.fn(),
            };
            Notification.findOne.mockResolvedValue(mockNotification);

            const result = await deliveryTracker.trackExternalConfirmation('external1', 'DELIVERED', { provider: 'twilio' });

            expect(mockNotification.status).toBe('DELIVERED');
            expect(mockNotification.deliveredAt).toBeInstanceOf(Date);
            expect(mockNotification.deliveryLogs).toHaveLength(1);
            expect(mockNotification.deliveryLogs[0].channel).toBe('EXTERNAL');
            expect(mockNotification.deliveryLogs[0].status).toBe('DELIVERED');
            expect(mockNotification.save).toHaveBeenCalledTimes(1);
            expect(result).toBe(true);
        });

        it('should return false if notification not found for external confirmation', async () => {
            Notification.findOne.mockResolvedValue(null);

            const result = await deliveryTracker.trackExternalConfirmation('external1', 'DELIVERED', { provider: 'twilio' });

            expect(result).toBe(false);
            expect(logger.warn).toHaveBeenCalledWith('No notification found for external ID: external1');
        });
    });

    describe('getDeliveryStats', () => {
        it('should return delivery statistics', async () => {
            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-01-31');
            const filter = { type: 'EMAIL' };

            Notification.countDocuments.mockResolvedValueOnce(17);
            Notification.countDocuments.mockResolvedValueOnce(17);
            Notification.aggregate.mockResolvedValueOnce([
                { _id: 'DELIVERED', count: 10 },
                { _id: 'FAILED', count: 2 },
                { _id: 'SENT', count: 5 }
            ]);
            Notification.aggregate.mockResolvedValueOnce([
                { _id: 'EMAIL', count: 17 }
            ]);
            Notification.countDocuments.mockResolvedValueOnce(17); // For readCount // For readCount
            Notification.aggregate.mockResolvedValueOnce([
                { _id: null, avgDeliveryTime: 60, minDeliveryTime: 30, maxDeliveryTime: 90 }
            ]);

            const stats = await deliveryTracker.getDeliveryStats(startDate, endDate, filter);

            expect(stats).toEqual({
                period: {
                    start: startDate,
                    end: endDate
                },
                total: 17,
                status: {
                    delivered: 10,
                    failed: 2,
                    sent: 5
                },
                channels: {
                    email: 17
                },
                readRate: 100,
                deliveryTimes: {
                    average: 60,
                    min: 30,
                    max: 90
                }
            });
        });
    });
});