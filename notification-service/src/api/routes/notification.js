const express = require('express');
const router = express.Router();
const Notification = require('../../models/notification');
const NotificationTemplate = require('../../models/template');
const NotificationPreference = require('../../models/preference');
const notificationController = require('../../controllers/notification');
const deliveryTracker = require('../../services/deliveryTracker');
const queueService = require('../../services/queueService');
const authMiddleware = require('../middleware/auth');
const validationMiddleware = require('../middleware/validation');
const logger = require('../../utils/logger');

// Get all notifications for the current user
router.get(
  '/',
  authMiddleware.authenticate,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { status, type, read, limit = 10, offset = 0, sort = 'createdAt', order = 'desc' } = req.query;

      const notifications = await notificationController.getNotificationsByUser(
        userId,
        {
          status,
          type,
          read: read === 'true',
          limit: parseInt(limit),
          offset: parseInt(offset),
          sortBy: sort,
          sortOrder: order.toUpperCase()
        }
      );

      res.json({
        success: true,
        count: notifications.length,
        data: notifications
      });
    } catch (error) {
      logger.error(`Error fetching notifications: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch notifications'
      });
    }
  }
);

// Get a single notification by ID
router.get(
  '/:id',
  authMiddleware.authenticate,
  async (req, res) => {
    try {
      const notificationId = req.params.id;
      const userId = req.user.id;

      const notification = await Notification.findById(notificationId);

      if (!notification) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found'
        });
      }

      // Check if the notification belongs to the current user
      if (notification.userId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to access this notification'
        });
      }

      res.json({
        success: true,
        data: notification
      });
    } catch (error) {
      logger.error(`Error fetching notification: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch notification'
      });
    }
  }
);

// Get notification count for the current user
router.get(
  '/count',
  authMiddleware.authenticate,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const now = new Date();

      // Count unread notifications
      const unread = await Notification.countDocuments({
        userId,
        readAt: null
      });

      // Count today's notifications
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const today = await Notification.countDocuments({
        userId,
        createdAt: { $gte: startOfDay }
      });

      // Count this week's notifications
      const startOfWeek = new Date(now);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const thisWeek = await Notification.countDocuments({
        userId,
        createdAt: { $gte: startOfWeek }
      });

      res.json({
        success: true,
        data: {
          unread,
          today,
          thisWeek
        }
      });
    } catch (error) {
      logger.error(`Error fetching notification count: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch notification count'
      });
    }
  }
);

// Send a notification
router.post(
  '/',
  authMiddleware.authenticate,
  authMiddleware.authorizeService,
  validationMiddleware.validateNotification,
  async (req, res) => {
    try {
      const { userId, type, title, message, channels, priority, metadata } = req.body;

      const notification = await notificationController.sendNotification({
        userId,
        type,
        title,
        message,
        channels,
        priority,
        metadata
      });

      res.status(201).json({
        success: true,
        data: notification
      });
    } catch (error) {
      logger.error(`Error sending notification: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to send notification'
      });
    }
  }
);

// Schedule a notification
router.post(
  '/schedule',
  authMiddleware.authenticate,
  authMiddleware.authorizeService,
  validationMiddleware.validateScheduledNotification,
  async (req, res) => {
    try {
      const { userId, type, title, message, channels, scheduledFor, priority, metadata } = req.body;

      const notification = await notificationController.scheduleNotification({
        userId,
        type,
        title,
        message,
        channels,
        scheduledFor,
        priority,
        metadata
      });

      res.status(201).json({
        success: true,
        data: notification
      });
    } catch (error) {
      logger.error(`Error scheduling notification: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to schedule notification'
      });
    }
  }
);

// Send notification using a template
router.post(
  '/template',
  authMiddleware.authenticate,
  authMiddleware.authorizeService,
  validationMiddleware.validateTemplateNotification,
  async (req, res) => {
    try {
      const { templateName, userId, data } = req.body;

      const notification = await notificationController.createFromTemplate(
        templateName,
        userId,
        data
      );

      if (!notification) {
        return res.status(400).json({
          success: false,
          error: 'Failed to create notification from template'
        });
      }

      // Add to processing queue
      await queueService.addToQueue(notification._id);

      res.status(201).json({
        success: true,
        data: notification
      });
    } catch (error) {
      logger.error(`Error creating notification from template: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to create notification from template'
      });
    }
  }
);

// Mark a notification as read
router.patch(
  '/:id/read',
  authMiddleware.authenticate,
  async (req, res) => {
    try {
      const notificationId = req.params.id;
      const userId = req.user.id;

      const notification = await Notification.findById(notificationId);

      if (!notification) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found'
        });
      }

      // Check if the notification belongs to the current user
      if (notification.userId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to modify this notification'
        });
      }

      notification.readAt = new Date();
      await notification.save();

      // Track read status
      await deliveryTracker.trackNotificationRead(notificationId, {
        source: 'API',
        userId
      });

      res.json({
        success: true,
        data: notification
      });
    } catch (error) {
      logger.error(`Error marking notification as read: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to mark notification as read'
      });
    }
  }
);

// Mark all notifications as read
router.patch(
  '/read-all',
  authMiddleware.authenticate,
  async (req, res) => {
    try {
      const userId = req.user.id;

      const result = await Notification.updateMany(
        { userId: userId, readAt: null },
        { readAt: new Date() }
      );

      res.json({
        success: true,
        data: {
          modifiedCount: result.modifiedCount
        }
      });
    } catch (error) {
      logger.error(`Error marking all notifications as read: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to mark all notifications as read'
      });
    }
  }
);

// Cancel a scheduled notification
router.delete(
  '/:id',
  authMiddleware.authenticate,
  async (req, res) => {
    try {
      const notificationId = req.params.id;
      const userId = req.user.id;

      const notification = await Notification.findById(notificationId);

      if (!notification) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found'
        });
      }

      // Check if the notification belongs to the current user
      if (notification.userId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to cancel this notification'
        });
      }

      // Check if notification is already sent
      if (notification.status !== 'PENDING') {
        return res.status(400).json({
          success: false,
          error: `Cannot cancel notification with status: ${notification.status}`
        });
      }

      // Cancel notification
      const canceled = await notificationController.cancelNotification(notificationId);

      if (!canceled) {
        return res.status(500).json({
          success: false,
          error: 'Failed to cancel notification'
        });
      }

      res.json({
        success: true,
        message: 'Notification canceled successfully'
      });
    } catch (error) {
      logger.error(`Error canceling notification: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel notification'
      });
    }
  }
);

// External delivery webhook endpoint
router.post(
  '/delivery-status',
  authMiddleware.validateApiKey,
  async (req, res) => {
    try {
      const { provider, externalId, status, details } = req.body;

      if (!provider || !externalId || !status) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: provider, externalId, status'
        });
      }

      // Map external status to our status format
      const mappedStatus = mapExternalStatus(provider, status);

      // Track the external confirmation
      const tracked = await deliveryTracker.trackExternalConfirmation(
        externalId,
        mappedStatus,
        {
          provider,
          originalStatus: status,
          ...details
        }
      );

      if (!tracked) {
        return res.status(404).json({
          success: false,
          error: 'No matching notification found for the external ID'
        });
      }

      res.json({
        success: true,
        message: 'Delivery status updated successfully'
      });
    } catch (error) {
      logger.error(`Error updating delivery status: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to update delivery status'
      });
    }
  }
);

// Admin endpoints
// Get notification templates (admin only)
router.get(
  '/admin/templates',
  authMiddleware.authenticate,
  authMiddleware.authorizeAdmin,
  async (req, res) => {
    try {
      const { type } = req.query;
      const query = type ? { type } : {};

      const templates = await NotificationTemplate.find(query);

      res.json({
        success: true,
        count: templates.length,
        data: templates
      });
    } catch (error) {
      logger.error(`Error fetching notification templates: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch notification templates'
      });
    }
  }
);

// Create notification template (admin only)
router.post(
  '/admin/templates',
  authMiddleware.authenticate,
  authMiddleware.authorizeAdmin,
  validationMiddleware.validateTemplate,
  async (req, res) => {
    try {
      const { name, type, titleTemplate, messageTemplate, defaultChannels, defaultPriority, variables } = req.body;

      // Check if template with this name already exists
      const existingTemplate = await NotificationTemplate.findOne({ name });
      if (existingTemplate) {
        return res.status(400).json({
          success: false,
          error: 'Template with this name already exists'
        });
      }

      const template = new NotificationTemplate({
        name,
        type,
        titleTemplate,
        messageTemplate,
        defaultChannels,
        defaultPriority: defaultPriority || 'MEDIUM',
        variables: variables || []
      });

      await template.save();

      res.status(201).json({
        success: true,
        data: template
      });
    } catch (error) {
      logger.error(`Error creating notification template: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to create notification template'
      });
    }
  }
);

// Update notification template (admin only)
router.put(
  '/admin/templates/:id',
  authMiddleware.authenticate,
  authMiddleware.authorizeAdmin,
  validationMiddleware.validateTemplate,
  async (req, res) => {
    try {
      const templateId = req.params.id;
      const template = await NotificationTemplate.findByIdAndUpdate(
        templateId,
        req.body,
        { new: true }
      );

      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Template not found'
        });
      }

      res.json({
        success: true,
        data: template
      });
    } catch (error) {
      logger.error(`Error updating notification template: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to update notification template'
      });
    }
  }
);

// Get notification statistics (admin only)
router.get(
  '/admin/stats',
  authMiddleware.authenticate,
  authMiddleware.authorizeAdmin,
  async (req, res) => {
    try {
      const { startDate, endDate, type } = req.query;
      // Default to last 24 hours if no dates provided
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : new Date(end - 24 * 60 * 60 * 1000);

      const filter = type ? { type } : {};

      const stats = await deliveryTracker.getDeliveryStats(start, end, filter);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error(`Error fetching notification statistics: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch notification statistics'
      });
    }
  }
);

// Get queue statistics (admin only)
router.get(
  '/admin/queue-stats',
  authMiddleware.authenticate,
  authMiddleware.authorizeAdmin,
  async (req, res) => {
    try {
      const stats = await queueService.getQueueStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error(`Error fetching queue statistics: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch queue statistics'
      });
    }
  }
);

// Helper function to map external status to our format
function mapExternalStatus(provider, status) {
  // For email providers
  if (['sendgrid', 'mailchimp', 'ses'].includes(provider.toLowerCase())) {
    if (['delivered', 'open', 'click'].includes(status.toLowerCase())) {
      return 'DELIVERED';
    } else if (['bounce', 'dropped', 'rejected', 'failed'].includes(status.toLowerCase())) {
      return 'FAILED';
    }
  }

  // For SMS providers
  if (['twilio', 'nexmo', 'sns'].includes(provider.toLowerCase())) {
    if (['delivered', 'received'].includes(status.toLowerCase())) {
      return 'DELIVERED';
    } else if (['failed', 'undelivered', 'rejected'].includes(status.toLowerCase())) {
      return 'FAILED';
    }
  }

  // For push notification providers
  if (['firebase', 'apns', 'fcm'].includes(provider.toLowerCase())) {
    if (['delivered', 'received'].includes(status.toLowerCase())) {
      return 'DELIVERED';
    } else if (['failed', 'error'].includes(status.toLowerCase())) {
      return 'FAILED';
    }
  }

  // Default mapping
  if (['success', 'delivered', 'sent', 'completed'].includes(status.toLowerCase())) {
    return 'DELIVERED';
  } else if (['failure', 'failed', 'error', 'bounced'].includes(status.toLowerCase())) {
    return 'FAILED';
  }

  // If we can't determine the status, return the original
  return status.toUpperCase();
}

module.exports = router;
