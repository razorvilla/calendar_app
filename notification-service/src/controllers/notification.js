const Notification = require('../../models/notification');
const NotificationTemplate = require('../../models/template');
const NotificationPreference = require('../../models/preference');
const logger = require('../../utils/logger');
const queueService = require('../services/queueService');
const emailHandler = require('./channels/email');
const pushHandler = require('./channels/push');
const smsHandler = require('./channels/sms');
const inAppHandler = require('./channels/inApp');

/**
 * Process notification through various channels
 */
async function processNotification(notification) {
  try {
    // Update notification status to SENT
    notification.status = 'SENT';
    notification.sentAt = new Date();
    await notification.save();

    const deliveryPromises = [];
    const deliveryLogs = [];
    const timestamp = new Date();

    // Process each requested channel
    for (const channel of notification.channel) {
      try {
        let result;
        switch (channel) {
          case 'EMAIL':
            result = await emailHandler.send(notification);
            break;
          case 'PUSH':
            result = await pushHandler.send(notification);
            break;
          case 'SMS':
            result = await smsHandler.send(notification);
            break;
          case 'IN_APP':
            result = await inAppHandler.send(notification);
            break;
          default:
            logger.warn(`Unknown notification channel: ${channel}`);
            continue;
        }
        deliveryLogs.push({
          channel,
          status: result.success ? 'DELIVERED' : 'FAILED',
          timestamp,
          details: result
        });
      } catch (error) {
        logger.error(`Error sending notification through ${channel}: ${error.message}`);
        deliveryLogs.push({
          channel,
          status: 'FAILED',
          timestamp,
          details: { error: error.message }
        });
      }
    }

    // Update notification with delivery results
    notification.deliveryLogs = [...notification.deliveryLogs || [], ...deliveryLogs];

    // Check if all deliveries were successful
    const allSuccessful = deliveryLogs.every(log => log.status === 'DELIVERED');
    const allFailed = deliveryLogs.every(log => log.status === 'FAILED');

    if (allSuccessful) {
      notification.status = 'DELIVERED';
      notification.deliveredAt = new Date();
    } else if (allFailed) {
      notification.status = 'FAILED';
      notification.lastError = 'All delivery channels failed';
    } else {
      notification.status = 'DELIVERED'; // Partial delivery still counts as delivered
      notification.deliveredAt = new Date();
    }

    await notification.save();
    return notification;
  } catch (error) {
    logger.error(`Error processing notification: ${error.message}`);
    // Update notification status to FAILED
    notification.status = 'FAILED';
    notification.lastError = error.message;
    await notification.save();
    throw error;
  }
}

/**
 * Create a notification from a template
 */
async function createFromTemplate(templateName, userId, data = {}) {
  try {
    const template = await NotificationTemplate.findOne({ name: templateName });

    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    // Get user preferences
    const preference = await NotificationPreference.findOne({
      userId,
      type: template.type
    });

    // If notification type is disabled for this user, skip it
    if (preference && !preference.enabled) {
      logger.info(`Notification type ${template.type} is disabled for user ${userId}`);
      return null;
    }

    // Determine notification channels based on preferences or template defaults
    let channels = preference && preference.channels.length > 0
      ? preference.channels
      : template.defaultChannels;

    // Check if we're in a quiet period for this user
    let isQuietPeriod = false;
    if (preference && preference.quiet && preference.quietStartTime && preference.quietEndTime) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      // Simple time string comparison (assumes same day)
      if (preference.quietStartTime <= currentTime && currentTime <= preference.quietEndTime) {
        isQuietPeriod = true;

        // During quiet period, only deliver via IN_APP channel
        if (!channels.includes('IN_APP')) {
          channels.push('IN_APP');
        }

        // Filter out other channels except IN_APP
        channels = channels.filter(channel => channel === 'IN_APP');
      }
    }

    // Process template variables
    let title = template.titleTemplate;
    let message = template.messageTemplate;

    // Replace template variables with actual data
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      title = title.replace(regex, value);
      message = message.replace(regex, value);
    });

    // Create the notification
    const notification = new Notification({
      userId,
      type: template.type,
      title,
      message,
      channel: channels,
      priority: template.defaultPriority,
      metadata: { templateName, templateData: data, isQuietPeriod }
    });

    await notification.save();
    return notification;
  } catch (error) {
    logger.error(`Error creating notification from template: ${error.message}`);
    throw error;
  }
}

/**
 * Send an immediate notification
 */
async function sendNotification(params) {
  try {
    const { userId, type, title, message, channels, priority, metadata } = params;

    // Check user preferences
    const preference = await NotificationPreference.findOne({ userId, type });

    // If notification type is disabled for this user, skip it
    if (preference && !preference.enabled) {
      logger.info(`Notification type ${type} is disabled for user ${userId}`);
      return null;
    }

    // Apply channels from preferences if available
    const finalChannels = preference && preference.channels.length > 0
      ? preference.channels
      : channels;

    // Create notification
    const notification = new Notification({
      userId,
      type,
      title,
      message,
      channel: finalChannels,
      priority: priority || 'MEDIUM',
      metadata: metadata || {}
    });

    await notification.save();

    // Add to queue for processing
    await queueService.addToQueue(notification._id);

    return notification;
  } catch (error) {
    logger.error(`Error sending notification: ${error.message}`);
    throw error;
  }
}

/**
 * Schedule a notification for future delivery
 */
async function scheduleNotification(params) {
  try {
    const { userId, type, title, message, channels, scheduledFor, priority, metadata } = params;

    // Validate scheduled time is in the future
    const scheduledTime = new Date(scheduledFor);
    const now = new Date();

    if (scheduledTime <= now) {
      throw new Error('Scheduled time must be in the future');
    }

    // Check user preferences
    const preference = await NotificationPreference.findOne({ userId, type });

    // If notification type is disabled for this user, skip it
    if (preference && !preference.enabled) {
      logger.info(`Notification type ${type} is disabled for user ${userId}`);
      return null;
    }

    // Apply channels from preferences if available
    const finalChannels = preference && preference.channels.length > 0
      ? preference.channels
      : channels;

    // Create notification
    const notification = new Notification({
      userId,
      type,
      title,
      message,
      channel: finalChannels,
      priority: priority || 'MEDIUM',
      scheduledFor: scheduledTime,
      metadata: metadata || {}
    });

    await notification.save();

    // Schedule in the queue system
    await queueService.scheduleInQueue(notification._id, scheduledTime);

    return notification;
  } catch (error) {
    logger.error(`Error scheduling notification: ${error.message}`);
    throw error;
  }
}

/**
 * Cancel a scheduled notification
 */
async function cancelNotification(notificationId) {
  try {
    const notification = await Notification.findById(notificationId);

    if (!notification) {
      throw new Error('Notification not found');
    }

    // Can only cancel pending notifications
    if (notification.status !== 'PENDING') {
      throw new Error(`Cannot cancel notification with status: ${notification.status}`);
    }

    // Update status to canceled
    notification.status = 'CANCELED';
    await notification.save();

    // Remove from queue
    await queueService.removeFromQueue(notificationId);

    return true;
  } catch (error) {
    logger.error(`Error canceling notification: ${error.message}`);
    throw error;
  }
}

/**
 * Get notifications by user ID with filtering
 */
async function getNotificationsByUser(userId, filters = {}) {
  try {
    const { status, type, read, limit = 10, offset = 0, sortBy = 'createdAt', sortOrder = 'DESC' } = filters;

    const query = { userId };
    if (status) query.status = status;
    if (type) query.type = type;
    if (read !== undefined) query.readAt = read ? { $ne: null } : null;

    const notifications = await Notification.find(query)
      .sort({ [sortBy]: sortOrder === 'DESC' ? -1 : 1 })
      .skip(offset)
      .limit(limit);

    return notifications;
  } catch (error) {
    logger.error(`Error fetching notifications: ${error.message}`);
    throw error;
  }
}

module.exports = {
  processNotification,
  createFromTemplate,
  sendNotification,
  scheduleNotification,
  cancelNotification,
  getNotificationsByUser
};
