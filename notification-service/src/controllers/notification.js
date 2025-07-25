const notificationService = require('../services/notification');
const logger = require('../utils/logger');

const getNotifications = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { limit, offset, read } = req.query;
        const notifications = await notificationService.getNotifications(userId, { limit, offset, read });
        res.json(notifications);
    } catch (error) {
        logger.error('Get notifications error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const markNotificationRead = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const notification = await notificationService.markNotificationRead(userId, id);
        if (!notification) {
            return res.status(404).json({ error: 'Notification not found or not authorized' });
        }
        res.json(notification);
    } catch (error) {
        logger.error('Mark notification read error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const deleteNotification = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const result = await notificationService.deleteNotification(userId, id);
        if (!result) {
            return res.status(404).json({ error: 'Notification not found or not authorized' });
        }
        res.json(result);
    } catch (error) {
        logger.error('Delete notification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const createNotification = async (req, res) => {
    try {
        const notification = await notificationService.createNotification(req.body);
        res.status(201).json(notification);
    } catch (error) {
        logger.error('Create notification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getNotificationCounts = async (req, res) => {
    console.log('getNotificationCounts hit!');
    try {
        const userId = req.user.userId;
        const counts = await notificationService.getNotificationCounts(userId);
        res.json(counts);
    } catch (error) {
        logger.error('Get notification counts error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const markAllNotificationsAsRead = async (req, res) => {
    try {
        const userId = req.user.userId;
        const result = await notificationService.markAllNotificationsAsRead(userId);
        res.json({ message: `Marked ${result} notifications as read` });
    } catch (error) {
        logger.error('Mark all notifications as read error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const cancelNotificationById = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const result = await notificationService.cancelNotificationById(id, userId);
        res.json(result);
    } catch (error) {
        logger.error('Cancel notification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getPreferences = async (req, res) => {
    try {
        const userId = req.user.userId;
        const preferences = await notificationService.getPreferences(userId);
        res.json(preferences);
    } catch (error) {
        logger.error('Get preferences error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updatePreference = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { type } = req.params;
        const updatedPreference = await notificationService.updatePreference(userId, type, req.body);
        res.json(updatedPreference);
    } catch (error) {
        logger.error('Update preference error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const handleDeliveryStatus = async (req, res) => {
    try {
        const { provider, externalId } = req.params;
        const { status, details } = req.body;
        const result = await notificationService.handleDeliveryStatus(provider, externalId, status, details);
        res.json(result);
    } catch (error) {
        logger.error('Handle delivery status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getTemplates = async (req, res) => {
    try {
        const templates = await notificationService.getTemplates();
        res.json(templates);
    } catch (error) {
        logger.error('Get templates error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const createTemplate = async (req, res) => {
    try {
        const template = await notificationService.createTemplate(req.body);
        res.status(201).json(template);
    } catch (error) {
        logger.error('Create template error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedTemplate = await notificationService.updateTemplate(id, req.body);
        if (!updatedTemplate) {
            return res.status(404).json({ error: 'Template not found' });
        }
        res.json(updatedTemplate);
    } catch (error) {
        logger.error('Update template error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getStats = async (req, res) => {
    try {
        const stats = await notificationService.getStats();
        res.json(stats);
    } catch (error) {
        logger.error('Get stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getQueueStats = async (req, res) => {
    try {
        const stats = await notificationService.getQueueStats();
        res.json(stats);
    } catch (error) {
        logger.error('Get queue stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getNotifications,
    markNotificationRead,
    deleteNotification,
    createNotification,
    getNotificationCounts,
    markAllNotificationsAsRead,
    cancelNotificationById,
    getPreferences,
    updatePreference,
    handleDeliveryStatus,
    getTemplates,
    createTemplate,
    updateTemplate,
    getStats,
    getQueueStats
};