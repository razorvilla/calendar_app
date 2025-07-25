const notificationService = require('../../src/services/notification');
const logger = require('../../src/utils/logger');

jest.mock('../../src/services/notification');
jest.mock('../../src/utils/logger');

const notificationController = require('../../src/controllers/notification');

describe('Notification Controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getNotifications', () => {
        it('should return notifications', async () => {
            const mockNotifications = [{ id: 'notif1', userId: 'user1' }];
            notificationService.getNotifications.mockResolvedValue(mockNotifications);

            const req = { user: { userId: 'user1' }, query: {} };
            const res = { json: jest.fn(), status: jest.fn(() => res) };

            await notificationController.getNotifications(req, res);

            expect(notificationService.getNotifications).toHaveBeenCalledWith('user1', {});
            expect(res.json).toHaveBeenCalledWith(mockNotifications);
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should handle errors when getting notifications', async () => {
            notificationService.getNotifications.mockRejectedValue(new Error('DB Error'));

            const req = { user: { userId: 'user1' }, query: {} };
            const res = { json: jest.fn(), status: jest.fn(() => res) };

            await notificationController.getNotifications(req, res);

            expect(logger.error).toHaveBeenCalledWith('Get notifications error:', expect.any(Error));
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
        });
    });

    describe('markNotificationRead', () => {
        it('should mark a notification as read', async () => {
            const mockNotification = { id: 'notif1', is_read: true };
            notificationService.markNotificationRead.mockResolvedValue(mockNotification);

            const req = { user: { userId: 'user1' }, params: { id: 'notif1' } };
            const res = { json: jest.fn(), status: jest.fn(() => res) };

            await notificationController.markNotificationRead(req, res);

            expect(notificationService.markNotificationRead).toHaveBeenCalledWith('user1', 'notif1');
            expect(res.json).toHaveBeenCalledWith(mockNotification);
        });

        it('should return 404 if notification not found', async () => {
            notificationService.markNotificationRead.mockResolvedValue(null);

            const req = { user: { userId: 'user1' }, params: { id: 'notif1' } };
            const res = { json: jest.fn(), status: jest.fn(() => res) };

            await notificationController.markNotificationRead(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: 'Notification not found or not authorized' });
        });
    });

    describe('deleteNotification', () => {
        it('should delete a notification', async () => {
            notificationService.deleteNotification.mockResolvedValue({ message: 'Notification deleted successfully' });

            const req = { user: { userId: 'user1' }, params: { id: 'notif1' } };
            const res = { json: jest.fn(), status: jest.fn(() => res) };

            await notificationController.deleteNotification(req, res);

            expect(notificationService.deleteNotification).toHaveBeenCalledWith('user1', 'notif1');
            expect(res.json).toHaveBeenCalledWith({ message: 'Notification deleted successfully' });
        });

        it('should return 404 if notification not found', async () => {
            notificationService.deleteNotification.mockResolvedValue(null);

            const req = { user: { userId: 'user1' }, params: { id: 'notif1' } };
            const res = { json: jest.fn(), status: jest.fn(() => res) };

            await notificationController.deleteNotification(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: 'Notification not found or not authorized' });
        });
    });

    describe('createNotification', () => {
        it('should create a notification', async () => {
            const mockNotification = { id: 'notif1', type: 'GENERIC' };
            notificationService.createNotification.mockResolvedValue(mockNotification);

            const req = { body: { userId: 'user1', type: 'GENERIC', message: 'Test' } };
            const res = { json: jest.fn(), status: jest.fn(() => res) };

            await notificationController.createNotification(req, res);

            expect(notificationService.createNotification).toHaveBeenCalledWith(req.body);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(mockNotification);
        });
    });

    describe('getNotificationCounts', () => {
        it('should return notification counts', async () => {
            const mockCounts = { unread: 5, total: 10 };
            notificationService.getNotificationCounts.mockResolvedValue(mockCounts);

            const req = { user: { userId: 'user1' } };
            const res = { json: jest.fn(), status: jest.fn(() => res) };

            await notificationController.getNotificationCounts(req, res);

            expect(notificationService.getNotificationCounts).toHaveBeenCalledWith('user1');
            expect(res.json).toHaveBeenCalledWith(mockCounts);
        });
    });

    describe('markAllNotificationsAsRead', () => {
        it('should mark all notifications as read', async () => {
            notificationService.markAllNotificationsAsRead.mockResolvedValue(3);

            const req = { user: { userId: 'user1' } };
            const res = { json: jest.fn(), status: jest.fn(() => res) };

            await notificationController.markAllNotificationsAsRead(req, res);

            expect(notificationService.markAllNotificationsAsRead).toHaveBeenCalledWith('user1');
            expect(res.json).toHaveBeenCalledWith({ message: 'Marked 3 notifications as read' });
        });
    });

    describe('cancelNotificationById', () => {
        it('should cancel a notification by ID', async () => {
            notificationService.cancelNotificationById.mockResolvedValue({ message: 'Notification canceled' });

            const req = { user: { userId: 'user1' }, params: { id: 'notif1' } };
            const res = { json: jest.fn(), status: jest.fn(() => res) };

            await notificationController.cancelNotificationById(req, res);

            expect(notificationService.cancelNotificationById).toHaveBeenCalledWith('notif1', 'user1');
            expect(res.json).toHaveBeenCalledWith({ message: 'Notification canceled' });
        });
    });

    describe('getPreferences', () => {
        it('should return user preferences', async () => {
            const mockPreferences = { default: true };
            notificationService.getPreferences.mockResolvedValue(mockPreferences);

            const req = { user: { userId: 'user1' } };
            const res = { json: jest.fn(), status: jest.fn(() => res) };

            await notificationController.getPreferences(req, res);

            expect(notificationService.getPreferences).toHaveBeenCalledWith('user1');
            expect(res.json).toHaveBeenCalledWith(mockPreferences);
        });
    });

    describe('updatePreference', () => {
        it('should update a preference', async () => {
            const mockPreference = { type: 'EMAIL', enabled: true };
            notificationService.updatePreference.mockResolvedValue(mockPreference);

            const req = { user: { userId: 'user1' }, params: { type: 'EMAIL' }, body: { enabled: true } };
            const res = { json: jest.fn(), status: jest.fn(() => res) };

            await notificationController.updatePreference(req, res);

            expect(notificationService.updatePreference).toHaveBeenCalledWith('user1', 'EMAIL', { enabled: true });
            expect(res.json).toHaveBeenCalledWith(mockPreference);
        });
    });

    describe('handleDeliveryStatus', () => {
        it('should handle delivery status', async () => {
            notificationService.handleDeliveryStatus.mockResolvedValue(true);

            const req = { params: { provider: 'twilio', externalId: '123' }, body: { status: 'delivered', details: {} } };
            const res = { json: jest.fn(), status: jest.fn(() => res) };

            await notificationController.handleDeliveryStatus(req, res);

            expect(notificationService.handleDeliveryStatus).toHaveBeenCalledWith('twilio', '123', 'delivered', req.body.details);
            expect(res.json).toHaveBeenCalledWith(true);
        });
    });

    describe('getTemplates', () => {
        it('should return templates', async () => {
            const mockTemplates = [{ name: 'welcome' }];
            notificationService.getTemplates.mockResolvedValue(mockTemplates);

            const req = {};
            const res = { json: jest.fn(), status: jest.fn(() => res) };

            await notificationController.getTemplates(req, res);

            expect(notificationService.getTemplates).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(mockTemplates);
        });
    });

    describe('createTemplate', () => {
        it('should create a template', async () => {
            const mockTemplate = { name: 'new_template' };
            notificationService.createTemplate.mockResolvedValue(mockTemplate);

            const req = { body: { name: 'new_template' } };
            const res = { json: jest.fn(), status: jest.fn(() => res) };

            await notificationController.createTemplate(req, res);

            expect(notificationService.createTemplate).toHaveBeenCalledWith(req.body);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(mockTemplate);
        });
    });

    describe('updateTemplate', () => {
        it('should update a template', async () => {
            const mockTemplate = { id: 'temp1', name: 'updated_template' };
            notificationService.updateTemplate.mockResolvedValue(mockTemplate);

            const req = { params: { id: 'temp1' }, body: { name: 'updated_template' } };
            const res = { json: jest.fn(), status: jest.fn(() => res) };

            await notificationController.updateTemplate(req, res);

            expect(notificationService.updateTemplate).toHaveBeenCalledWith('temp1', req.body);
            expect(res.json).toHaveBeenCalledWith(mockTemplate);
        });

        it('should return 404 if template not found', async () => {
            notificationService.updateTemplate.mockResolvedValue(null);

            const req = { params: { id: 'temp1' }, body: { name: 'updated_template' } };
            const res = { json: jest.fn(), status: jest.fn(() => res) };

            await notificationController.updateTemplate(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: 'Template not found' });
        });
    });

    describe('getStats', () => {
        it('should return stats', async () => {
            const mockStats = { total: 10 };
            notificationService.getStats.mockResolvedValue(mockStats);

            const req = {};
            const res = { json: jest.fn(), status: jest.fn(() => res) };

            await notificationController.getStats(req, res);

            expect(notificationService.getStats).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(mockStats);
        });
    });

    describe('getQueueStats', () => {
        it('should return queue stats', async () => {
            const mockStats = { active: 2 };
            notificationService.getQueueStats.mockResolvedValue(mockStats);

            const req = {};
            const res = { json: jest.fn(), status: jest.fn(() => res) };

            await notificationController.getQueueStats(req, res);

            expect(notificationService.getQueueStats).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(mockStats);
        });
    });
});