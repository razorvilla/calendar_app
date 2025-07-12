const notificationController = require('../../src/controllers/notification');
const Notification = require('../../src/models/notification');
const NotificationTemplate = require('../../src/models/template');
const NotificationPreference = require('../../src/models/preference');
const logger = require('../../src/utils/logger');
const queueService = require('../../src/services/queueService');
const deliveryTracker = require('../../src/services/deliveryTracker');
const emailHandler = require('../../src/controllers/channels/email');
const pushHandler = require('../../src/controllers/channels/push');
const smsHandler = require('../../src/controllers/channels/sms');
const inAppHandler = require('../../src/controllers/channels/inApp');

jest.mock('../../src/models/notification');
jest.mock('../../src/models/template');
jest.mock('../../src/models/preference');
jest.mock('../../src/utils/logger');
jest.mock('../../src/services/queueService');
jest.mock('../../src/services/deliveryTracker');
jest.mock('../../src/controllers/channels/email');
jest.mock('../../src/controllers/channels/push');
jest.mock('../../src/controllers/channels/sms');
jest.mock('../../src/controllers/channels/inApp');

describe('Notification Controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('processNotification', () => {
        it('should process and deliver notification successfully', async () => {
            const mockNotification = {
                _id: 'notif1',
                status: 'PENDING',
                channel: ['EMAIL', 'IN_APP'],
                deliveryLogs: [],
                save: jest.fn(),
            };
            Notification.findById.mockResolvedValue(mockNotification);
            emailHandler.send.mockResolvedValue({ success: true, message: 'Email sent' });
            inAppHandler.send.mockResolvedValue({ success: true, message: 'In-app sent' });

            const result = await notificationController.processNotification(mockNotification);

            expect(mockNotification.status).toBe('DELIVERED');
            expect(mockNotification.deliveredAt).toBeInstanceOf(Date);
            expect(mockNotification.deliveryLogs).toHaveLength(2);
            expect(mockNotification.save).toHaveBeenCalledTimes(1);
            expect(result).toBe(mockNotification);
        });

        it('should mark notification as FAILED if all channels fail', async () => {
            const mockNotification = {
                _id: 'notif2',
                status: 'PENDING',
                channel: ['EMAIL'],
                deliveryLogs: [],
                save: jest.fn(),
            };
            Notification.findById.mockResolvedValue(mockNotification);
            emailHandler.send.mockRejectedValue(new Error('Email failed'));

            await expect(notificationController.processNotification(mockNotification)).rejects.toThrow('Email failed');

            expect(mockNotification.status).toBe('FAILED');
            expect(mockNotification.lastError).toBe('Email failed');
            expect(mockNotification.deliveryLogs).toHaveLength(1);
            expect(mockNotification.deliveryLogs[0].status).toBe('FAILED');
            expect(mockNotification.save).toHaveBeenCalledTimes(1);
        });
    });

    describe('createFromTemplate', () => {
        it('should create notification from template and return it', async () => {
            const mockTemplate = {
                name: 'welcome',
                type: 'USER_ONBOARDING',
                titleTemplate: 'Welcome, {{userName}}!',
                messageTemplate: 'Thank you for joining, {{userName}}.',
                defaultChannels: ['EMAIL'],
                defaultPriority: 'HIGH',
                variables: ['userName'],
            };
            NotificationTemplate.findOne.mockResolvedValue(mockTemplate);
            NotificationPreference.findOne.mockResolvedValue(null); // No preferences
            Notification.mockImplementation((data) => {
                const mock = {
                    ...data,
                    _id: 'notif3',
                    save: jest.fn().mockImplementation(function() {
                        return Promise.resolve(this);
                    }),
                };
                return mock;
            });

            const notification = await notificationController.createFromTemplate('welcome', 'user1', { userName: 'John Doe' });

            expect(notification).toHaveProperty('_id', 'notif3');
            expect(notification).toHaveProperty('title', 'Welcome, John Doe!');
            expect(notification).toHaveProperty('message', 'Thank you for joining, John Doe.');
            expect(notification).toHaveProperty('channel', ['EMAIL']);
            expect(notification).toHaveProperty('priority', 'HIGH');
        });

        it('should return null if notification type is disabled', async () => {
            const mockTemplate = { name: 'welcome', type: 'USER_ONBOARDING', defaultChannels: ['EMAIL'] };
            const mockPreference = { enabled: false };
            NotificationTemplate.findOne.mockResolvedValue(mockTemplate);
            NotificationPreference.findOne.mockResolvedValue(mockPreference);

            const notification = await notificationController.createFromTemplate('welcome', 'user1', {});

            expect(notification).toBeNull();
            expect(logger.info).toHaveBeenCalledWith('Notification type USER_ONBOARDING is disabled for user user1');
        });

        it('should apply quiet period logic', async () => {
            const mockTemplate = { name: 'welcome', type: 'USER_ONBOARDING', defaultChannels: ['EMAIL', 'SMS'] };
            const mockPreference = {
                enabled: true,
                quiet: true,
                quietStartTime: '00:00',
                quietEndTime: '23:59',
                channels: [] // User has no specific channels, so template defaults apply
            };
            NotificationTemplate.findOne.mockResolvedValue(mockTemplate);
            NotificationPreference.findOne.mockResolvedValue(mockPreference);
            Notification.mockImplementation((data) => {
                const mock = {
                    ...data,
                    _id: 'notif4',
                    save: jest.fn().mockImplementation(function() {
                        return Promise.resolve(this);
                    }),
                };
                return mock;
            });

            const notification = await notificationController.createFromTemplate('welcome', 'user1', {});

            expect(notification).toHaveProperty('channel', ['IN_APP']);
        });
    });

    describe('sendNotification', () => {
        it('should create and queue an immediate notification', async () => {
            const params = { userId: 'user1', type: 'GENERIC', title: 'Test', message: 'Hello', channels: ['IN_APP'] };
            NotificationPreference.findOne.mockResolvedValue(null);
            Notification.mockImplementation((data) => ({
                ...data,
                _id: 'notif5',
                save: jest.fn().mockImplementation(function() {
                    return Promise.resolve(this);
                }),
            }));
            queueService.addToQueue.mockResolvedValue({});

            const notification = await notificationController.sendNotification(params);

            expect(notification).toHaveProperty('_id', 'notif5');
            expect(queueService.addToQueue).toHaveBeenCalledWith('notif5');
        });

        it('should return null if notification type is disabled', async () => {
            const params = { userId: 'user1', type: 'GENERIC', title: 'Test', message: 'Hello', channels: ['IN_APP'] };
            NotificationPreference.findOne.mockResolvedValue({ enabled: false });

            const notification = await notificationController.sendNotification(params);

            expect(notification).toBeNull();
        });
    });

    describe('scheduleNotification', () => {
        it('should create and schedule a future notification', async () => {
            const scheduledFor = new Date(Date.now() + 3600000);
            const params = { userId: 'user1', type: 'REMINDER', title: 'Meeting', message: 'Soon', channels: ['EMAIL'], scheduledFor: scheduledFor.toISOString() };
            NotificationPreference.findOne.mockResolvedValue(null);
            Notification.mockImplementation((data) => ({
                ...data,
                _id: 'notif6',
                save: jest.fn().mockImplementation(function() {
                    return Promise.resolve(this);
                }),
            }));
            queueService.scheduleInQueue.mockResolvedValue({});

            const notification = await notificationController.scheduleNotification(params);

            expect(notification).toHaveProperty('_id', 'notif6');
            expect(notification).toHaveProperty('scheduledFor', scheduledFor);
            expect(queueService.scheduleInQueue).toHaveBeenCalledWith('notif6', scheduledFor);
        });

        it('should throw error if scheduled time is in the past', async () => {
            const scheduledFor = new Date(Date.now() - 3600000);
            const params = { userId: 'user1', type: 'REMINDER', title: 'Meeting', message: 'Soon', channels: ['EMAIL'], scheduledFor: scheduledFor.toISOString() };

            await expect(notificationController.scheduleNotification(params)).rejects.toThrow('Scheduled time must be in the future');
        });
    });

    describe('cancelNotification', () => {
        it('should cancel a pending notification', async () => {
            const mockNotification = {
                _id: 'notif7',
                status: 'PENDING',
                save: jest.fn(),
            };
            Notification.findById.mockResolvedValue(mockNotification);
            queueService.removeFromQueue.mockResolvedValue(true);

            const result = await notificationController.cancelNotification('notif7');

            expect(mockNotification.status).toBe('CANCELED');
            expect(mockNotification.save).toHaveBeenCalledTimes(1);
            expect(queueService.removeFromQueue).toHaveBeenCalledWith('notif7');
            expect(result).toBe(true);
        });

        it('should throw error if notification not found', async () => {
            Notification.findById.mockResolvedValue(null);

            await expect(notificationController.cancelNotification('notif8')).rejects.toThrow('Notification not found');
        });

        it('should throw error if notification is not pending', async () => {
            const mockNotification = {
                _id: 'notif9',
                status: 'SENT',
                save: jest.fn(),
            };
            Notification.findById.mockResolvedValue(mockNotification);

            await expect(notificationController.cancelNotification('notif9')).rejects.toThrow('Cannot cancel notification with status: SENT');
        });
    });

    describe('getNotificationsByUser', () => {
        it('should return notifications for a user with filters', async () => {
            const mockNotifications = [{ _id: 'notif10', userId: 'user1' }];
            Notification.find.mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue(mockNotifications),
            });

            const notifications = await notificationController.getNotificationsByUser('user1', { status: 'DELIVERED', type: 'ALERT', read: true });

            expect(notifications).toEqual(mockNotifications);
            expect(Notification.find).toHaveBeenCalledWith({
                userId: 'user1',
                status: 'DELIVERED',
                type: 'ALERT',
                readAt: { '$ne': null }
            });
        });
    });

    describe('getNotificationById', () => {
        it('should return a notification by ID', async () => {
            const mockNotification = { _id: 'notif11', userId: 'user1' };
            Notification.findById.mockResolvedValue(mockNotification);

            const notification = await notificationController.getNotificationById('notif11', 'user1');

            expect(notification).toEqual(mockNotification);
        });

        it('should return null if notification not found', async () => {
            Notification.findById.mockResolvedValue(null);

            const notification = await notificationController.getNotificationById('notif12', 'user1');

            expect(notification).toBeNull();
        });

        it('should throw error if not authorized to access notification', async () => {
            const mockNotification = { _id: 'notif13', userId: 'otherUser' };
            Notification.findById.mockResolvedValue(mockNotification);

            await expect(notificationController.getNotificationById('notif13', 'user1')).rejects.toThrow('Not authorized to access this notification');
        });
    });

    describe('getNotificationCounts', () => {
        it('should return notification counts', async () => {
            Notification.countDocuments.mockResolvedValueOnce(5); // unread
            Notification.countDocuments.mockResolvedValueOnce(10); // today
            Notification.countDocuments.mockResolvedValueOnce(20); // thisWeek

            const counts = await notificationController.getNotificationCounts('user1');

            expect(counts).toEqual({
                unread: 5,
                today: 10,
                thisWeek: 20,
            });
        });
    });

    describe('markNotificationAsRead', () => {
        it('should mark a notification as read', async () => {
            const mockNotification = { _id: 'notif14', userId: 'user1', readAt: null, save: jest.fn() };
            Notification.findById.mockResolvedValue(mockNotification);
            deliveryTracker.trackNotificationRead.mockResolvedValue(true);

            const notification = await notificationController.markNotificationAsRead('notif14', 'user1');

            expect(notification.readAt).toBeInstanceOf(Date);
            expect(notification.save).toHaveBeenCalledTimes(1);
            expect(deliveryTracker.trackNotificationRead).toHaveBeenCalledWith('notif14', { source: 'API', userId: 'user1' });
        });

        it('should throw error if not authorized to modify notification', async () => {
            const mockNotification = { _id: 'notif15', userId: 'otherUser', readAt: null, save: jest.fn() };
            Notification.findById.mockResolvedValue(mockNotification);

            await expect(notificationController.markNotificationAsRead('notif15', 'user1')).rejects.toThrow('Not authorized to modify this notification');
        });
    });

    describe('markAllNotificationsAsRead', () => {
        it('should mark all notifications as read for a user', async () => {
            Notification.updateMany.mockResolvedValue({ modifiedCount: 3 });

            const result = await notificationController.markAllNotificationsAsRead('user1');

            expect(result).toEqual({ modifiedCount: 3 });
            expect(Notification.updateMany).toHaveBeenCalledWith(
                { userId: 'user1', readAt: null },
                { readAt: expect.any(Date) }
            );
        });
    });

    describe('cancelNotificationById', () => {
        it('should cancel a pending notification', async () => {
            const mockNotification = { _id: 'notif16', userId: 'user1', status: 'PENDING', save: jest.fn() };
            Notification.findById.mockResolvedValue(mockNotification);
            queueService.removeFromQueue.mockResolvedValue(true);

            const result = await notificationController.cancelNotificationById('notif16', 'user1');

            expect(mockNotification.status).toBe('CANCELED');
            expect(mockNotification.save).toHaveBeenCalledTimes(1);
            expect(queueService.removeFromQueue).toHaveBeenCalledWith('notif16');
            expect(result).toBe(true);
        });

        it('should throw error if notification not found', async () => {
            Notification.findById.mockResolvedValue(null);

            await expect(notificationController.cancelNotificationById('notif17', 'user1')).rejects.toThrow('Notification not found');
        });

        it('should throw error if not authorized to cancel notification', async () => {
            const mockNotification = { _id: 'notif18', userId: 'otherUser', status: 'PENDING', save: jest.fn() };
            Notification.findById.mockResolvedValue(mockNotification);

            await expect(notificationController.cancelNotificationById('notif18', 'user1')).rejects.toThrow('Not authorized to cancel this notification');
        });

        it('should throw error if notification is not pending', async () => {
            const mockNotification = { _id: 'notif19', userId: 'user1', status: 'SENT', save: jest.fn() };
            Notification.findById.mockResolvedValue(mockNotification);

            await expect(notificationController.cancelNotificationById('notif19', 'user1')).rejects.toThrow('Cannot cancel notification with status: SENT');
        });
    });

    describe('getPreferences', () => {
        it('should return user preferences', async () => {
            const mockPreferences = [{ userId: 'user1', type: 'EMAIL' }];
            NotificationPreference.find.mockResolvedValue(mockPreferences);

            const preferences = await notificationController.getPreferences('user1');

            expect(preferences).toEqual(mockPreferences);
        });
    });

    describe('updatePreference', () => {
        it('should update or create a preference', async () => {
            const preferenceData = { channels: ['SMS'], enabled: true };
            const mockPreference = { userId: 'user1', type: 'REMINDER', ...preferenceData };
            NotificationPreference.findOneAndUpdate.mockResolvedValue(mockPreference);

            const preference = await notificationController.updatePreference('user1', 'REMINDER', preferenceData);

            expect(preference).toEqual(mockPreference);
            expect(NotificationPreference.findOneAndUpdate).toHaveBeenCalledWith(
                { userId: 'user1', type: 'REMINDER' },
                preferenceData,
                { new: true, upsert: true }
            );
        });
    });

    describe('handleDeliveryStatus', () => {
        it('should track external delivery confirmation', async () => {
            deliveryTracker.trackExternalConfirmation.mockResolvedValue(true);

            const result = await notificationController.handleDeliveryStatus('twilio', 'external1', 'delivered', {});

            expect(result).toBe(true);
            expect(deliveryTracker.trackExternalConfirmation).toHaveBeenCalledWith(
                'external1',
                'DELIVERED',
                { provider: 'twilio', originalStatus: 'delivered' }
            );
        });
    });

    describe('getTemplates', () => {
        it('should return notification templates', async () => {
            const mockTemplates = [{ name: 'welcome' }];
            NotificationTemplate.find.mockResolvedValue(mockTemplates);

            const templates = await notificationController.getTemplates();

            expect(templates).toEqual(mockTemplates);
        });
    });

    describe('createTemplate', () => {
        it('should create a new template', async () => {
            const templateData = { name: 'new_template', type: 'GENERIC', titleTemplate: 'Hi', messageTemplate: 'Hello' };
            NotificationTemplate.findOne.mockResolvedValue(null);
            NotificationTemplate.mockImplementation((data) => ({
                ...data,
                _id: 'template1',
                save: jest.fn().mockImplementation(function() {
                    return Promise.resolve(this);
                }),
            }));

            const template = await notificationController.createTemplate(templateData);

            expect(template).toHaveProperty('_id', 'template1');
            expect(template).toHaveProperty('name', 'new_template');
        });

        it('should throw error if template name already exists', async () => {
            NotificationTemplate.findOne.mockResolvedValue({ name: 'existing_template' });

            await expect(notificationController.createTemplate({ name: 'existing_template' })).rejects.toThrow('Template with this name already exists');
        });
    });

    describe('updateTemplate', () => {
        it('should update an existing template', async () => {
            const templateData = { titleTemplate: 'Updated Title' };
            const mockTemplate = { _id: 'template1', name: 'test', ...templateData };
            NotificationTemplate.findByIdAndUpdate.mockResolvedValue(mockTemplate);

            const template = await notificationController.updateTemplate('template1', templateData);

            expect(template).toEqual(mockTemplate);
        });

        it('should return null if template not found', async () => {
            NotificationTemplate.findByIdAndUpdate.mockResolvedValue(null);

            const template = await notificationController.updateTemplate('nonexistent', {});

            expect(template).toBeNull();
        });
    });

    describe('getStats', () => {
        it('should return delivery statistics', async () => {
            const mockStats = { total: 10, delivered: 8 };
            deliveryTracker.getDeliveryStats.mockResolvedValue(mockStats);

            const stats = await notificationController.getStats();

            expect(stats).toEqual(mockStats);
        });
    });

    describe('getQueueStats', () => {
        it('should return queue statistics', async () => {
            const mockStats = { processing: { active: 2 }, scheduled: { delayed: 1 } };
            queueService.getQueueStats.mockResolvedValue(mockStats);

            const stats = await notificationController.getQueueStats();

            expect(stats).toEqual(mockStats);
        });
    });
});