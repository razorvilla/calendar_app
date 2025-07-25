const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const Notification = require('../models/notification');
const NotificationTemplate = require('../models/template');
const NotificationPreference = require('../models/preference');
const logger = require('../utils/logger');
const queueService = require('./queueService');
const emailHandler = require('../controllers/channels/email');
const pushHandler = require('../controllers/channels/push');
const smsHandler = require('../controllers/channels/sms');
const inAppHandler = require('../controllers/channels/inApp');

const createNotification = async ({ userId, eventId, type, message, scheduledFor }) => {
    try {
        const notificationId = uuidv4();
        const result = await pool.query(
            `INSERT INTO notifications (
                id, user_id, event_id, type, message, is_read, scheduled_for, created_at
            ) VALUES ($1, $2, $3, $4, $5, FALSE, $6, NOW())
            RETURNING *`,
            [notificationId, userId, eventId, type, message, scheduledFor]
        );
        return result.rows[0];
    } catch (error) {
        logger.error('Error creating notification:', error);
        throw error;
    }
};

const getNotifications = async (userId, { limit = 10, offset = 0, read }) => {
    try {
        let query = 'SELECT * FROM notifications WHERE user_id = $1';
        const values = [userId];
        let paramCount = 2;

        if (read !== undefined) {
            query += ` AND is_read = ${paramCount}`;
            values.push(read === 'true');
            paramCount++;
        }

        query += ` ORDER BY created_at DESC LIMIT ${paramCount} OFFSET ${paramCount + 1}`;
        values.push(limit);
        values.push(offset);

        const result = await pool.query(query, values);
        return result.rows;
    } catch (error) {
        logger.error('Error getting notifications:', error);
        throw error;
    }
};

const markNotificationRead = async (userId, id) => {
    try {
        const result = await Notification.findByIdAndUpdate(
            id,
            { is_read: true, readAt: new Date(), updated_at: new Date() },
            { new: true }
        );

        if (!result) {
            return null;
        }

        return result;
    } catch (error) {
        logger.error('Error marking notification as read:', error);
        throw error;
    }
};

const deleteNotification = async (userId, id) => {
    try {
        const result = await Notification.findByIdAndDelete(id);

        if (!result) {
            return null;
        }

        return { message: 'Notification deleted successfully' };
    } catch (error) {
        logger.error('Error deleting notification:', error);
        throw error;
    }
};

const processNotification = async (notification) => {
    try {
        logger.info(`Processing notification ${notification._id}`);

        const deliveryResults = [];

        for (const channel of notification.channels) {
            try {
                let handlerResult;
                switch (channel) {
                    case 'EMAIL':
                        handlerResult = await emailHandler.send(notification);
                        break;
                    case 'PUSH':
                        handlerResult = await pushHandler.send(notification);
                        break;
                    case 'SMS':
                        handlerResult = await smsHandler.send(notification);
                        break;
                    case 'IN_APP':
                        handlerResult = await inAppHandler.send(notification);
                        break;
                    default:
                        logger.warn(`Unknown notification channel: ${channel}`);
                        handlerResult = { success: false, message: `Unknown channel ${channel}` };
                }
                deliveryResults.push({ channel, success: handlerResult.success, message: handlerResult.message });
            } catch (channelError) {
                logger.error(`Error sending notification ${notification._id} via ${channel}: ${channelError.message}`);
                deliveryResults.push({ channel, success: false, message: channelError.message });
            }
        }

        notification.deliveryLogs = notification.deliveryLogs ? [...notification.deliveryLogs, ...deliveryResults] : deliveryResults;

        const allChannelsFailed = deliveryResults.every(result => !result.success);

        if (allChannelsFailed) {
            notification.status = 'FAILED';
            notification.lastError = deliveryResults.map(r => `${r.channel}: ${r.message}`).join('; ');
        } else {
            notification.status = 'DELIVERED';
            notification.deliveredAt = new Date();
        }

        await notification.save();
        logger.info(`Notification ${notification._id} processed with status: ${notification.status}`);
        return notification;
    } catch (error) {
        logger.error(`Error processing notification ${notification._id}: ${error.message}`);
        throw error;
    }
};

const createFromTemplate = async (templateName, userId, context) => {
    try {
        const template = await NotificationTemplate.findOne({ name: templateName });
        if (!template) {
            logger.warn(`Notification template ${templateName} not found.`);
            return null;
        }

        const preference = await NotificationPreference.findOne({ userId, type: template.type });

        if (preference && !preference.enabled) {
            logger.info(`Notification type ${template.type} is disabled for user ${userId}`);
            return null;
        }

        // Apply quiet period logic
        if (preference && preference.quiet) {
            const now = new Date();
            const start = new Date(now.toDateString() + ' ' + preference.quietStartTime);
            const end = new Date(now.toDateString() + ' ' + preference.quietEndTime);

            if (now >= start && now <= end) {
                logger.info(`Notification for user ${userId} is within quiet hours. Sending only via in-app.`);
                // Override channels to only allow in-app during quiet hours
                template.defaultChannels = ['IN_APP'];
            }
        }

        const title = template.titleTemplate.replace(/{{(.*?)}}/g, (match, key) => context[key.trim()] || '');
        const message = template.messageTemplate.replace(/{{(.*?)}}/g, (match, key) => context[key.trim()] || '');

        const notification = new Notification({
            userId,
            type: template.type,
            title,
            message,
            channels: preference && preference.channels.length > 0 ? preference.channels : template.defaultChannels,
            priority: preference && preference.priority ? preference.priority : template.defaultPriority,
            context,
        });

        await notification.save();
        return notification;
    } catch (error) {
        logger.error(`Error creating notification from template ${templateName}: ${error.message}`);
        throw error;
    }
};

const sendNotification = async (params) => {
    try {
        const { userId, type, title, message, channels, scheduledFor } = params;

        const notification = new Notification({
            userId, type, title, message, channels, scheduledFor
        });
        await notification.save();

        if (scheduledFor) {
            await queueService.scheduleInQueue(notification._id, scheduledFor);
        } else {
            await queueService.addToQueue(notification._id);
        }
        logger.info(`Notification ${notification._id} created and queued/scheduled.`);
        return notification;
    } catch (error) {
        logger.error(`Error sending notification: ${error.message}`);
        throw error;
    }
};

const scheduleNotification = async (params) => {
    try {
        const { userId, type, title, message, channels, scheduledFor } = params;

        if (!scheduledFor || new Date(scheduledFor) <= new Date()) {
            throw new Error('Scheduled time must be in the future');
        }

        const notification = new Notification({
            userId, type, title, message, channels, scheduledFor
        });
        await notification.save();

        await queueService.scheduleInQueue(notification._id, new Date(scheduledFor));
        logger.info(`Notification ${notification._id} scheduled for ${scheduledFor}.`);
        return notification;
    } catch (error) {
        logger.error(`Error scheduling notification: ${error.message}`);
        throw error;
    }
};

const cancelNotification = async (notificationId) => {
    try {
        const notification = await Notification.findById(notificationId);
        if (!notification) {
            throw new Error('Notification not found');
        }
        if (notification.status !== 'PENDING') {
            throw new Error(`Cannot cancel notification with status: ${notification.status}`);
        }
        notification.status = 'CANCELED';
        await notification.save();
        await queueService.removeFromQueue(notificationId);
        logger.info(`Notification ${notificationId} cancelled.`);
        return true;
    } catch (error) {
        logger.error(`Error cancelling notification ${notificationId}: ${error.message}`);
        throw error;
    }
};

const getNotificationCounts = async (userId) => {
    try {
        logger.info(`Getting notification counts for user ${userId}`);

        const unreadCountResult = await pool.query(
            'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE',
            [userId]
        );
        const unread = parseInt(unreadCountResult.rows[0].count, 10);

        const totalCountResult = await pool.query(
            'SELECT COUNT(*) FROM notifications WHERE user_id = $1',
            [userId]
        );
        const total = parseInt(totalCountResult.rows[0].count, 10);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const todayCountResult = await pool.query(
            'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND created_at >= $2 AND created_at < $3',
            [userId, today.toISOString(), tomorrow.toISOString()]
        );
        const todayCount = parseInt(todayCountResult.rows[0].count, 10);

        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);

        const thisWeekCountResult = await pool.query(
            'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND created_at >= $2 AND created_at < $3',
            [userId, startOfWeek.toISOString(), endOfWeek.toISOString()]
        );
        const thisWeek = parseInt(thisWeekCountResult.rows[0].count, 10);

        return {
            unread,
            total,
            today: todayCount,
            thisWeek,
        };
    } catch (error) {
        logger.error('Error getting notification counts:', error);
        throw error;
    }
};

const markAllNotificationsAsRead = async (userId) => {
    try {
        const result = await Notification.updateMany(
            { userId, is_read: false },
            { is_read: true, readAt: new Date(), updated_at: new Date() }
        );
        logger.info(`Marked ${result.modifiedCount} notifications as read for user ${userId}`);
        return result.modifiedCount;
    } catch (error) {
        logger.error(`Error marking all notifications as read for user ${userId}: ${error.message}`);
        throw error;
    }
};

const cancelNotificationById = async (notificationId, userId) => {
    try {
        const notification = await Notification.findById(notificationId);
        if (!notification) {
            throw new Error('Notification not found');
        }
        if (notification.userId !== userId) {
            throw new Error('Not authorized to cancel this notification');
        }
        if (notification.status !== 'PENDING') {
            throw new Error(`Cannot cancel notification with status: ${notification.status}`);
        }
        notification.status = 'CANCELED';
        await notification.save();
        await queueService.removeFromQueue(notificationId);
        logger.info(`Notification ${notificationId} cancelled by user ${userId}.`);
        return { message: 'Notification cancelled successfully' };
    } catch (error) {
        logger.error(`Error cancelling notification ${notificationId} by user ${userId}: ${error.message}`);
        throw error;
    }
};

const getPreferences = async (userId) => {
    try {
        const preferences = await NotificationPreference.findOne({ userId });
        if (!preferences) {
            return {
                enabled: true,
                channels: ['EMAIL', 'PUSH', 'SMS', 'IN_APP'],
                quiet: false,
                quietStartTime: '22:00',
                quietEndTime: '08:00',
            };
        }
        return preferences;
    } catch (error) {
        logger.error(`Error getting preferences for user ${userId}: ${error.message}`);
        throw error;
    }
};

const updatePreference = async (userId, type, preferenceData) => {
    try {
        const updatedPreference = await NotificationPreference.findOneAndUpdate(
            { userId, type },
            preferenceData,
            { new: true, upsert: true }
        );
        logger.info(`Updated preference for user ${userId}, type ${type}`);
        return updatedPreference;
    } catch (error) {
        logger.error(`Error updating preference for user ${userId}, type ${type}: ${error.message}`);
        throw error;
    }
};

const handleDeliveryStatus = async (provider, externalId, status, details) => {
    try {
        logger.info(`Handling delivery status for ${provider}, externalId ${externalId}, status ${status}`);
        // In a real application, you would update the notification status in the DB here
        // based on externalId and provider
        return true;
    } catch (error) {
        logger.error(`Error handling delivery status for ${provider}, externalId ${externalId}: ${error.message}`);
        throw error;
    }
};

const getTemplates = async () => {
    try {
        const templates = await NotificationTemplate.find({});
        logger.info(`Retrieved ${templates.length} notification templates.`);
        return templates;
    } catch (error) {
        logger.error(`Error getting templates: ${error.message}`);
        throw error;
    }
};

const createTemplate = async (templateData) => {
    try {
        const existingTemplate = await NotificationTemplate.findOne({ name: templateData.name });
        if (existingTemplate) {
            throw new Error('Template with this name already exists');
        }
        const template = new NotificationTemplate(templateData);
        await template.save();
        logger.info(`Created template ${template.name}`);
        return template;
    } catch (error) {
        logger.error(`Error creating template ${templateData.name}: ${error.message}`);
        throw error;
    }
};

const updateTemplate = async (templateId, templateData) => {
    try {
        const updatedTemplate = await NotificationTemplate.findByIdAndUpdate(
            templateId,
            templateData,
            { new: true }
        );
        if (!updatedTemplate) {
            return null;
        }
        logger.info(`Updated template ${templateId}`);
        return updatedTemplate;
    } catch (error) {
        logger.error(`Error updating template ${templateId}: ${error.message}`);
        throw error;
    }
};

const getStats = async () => {
    try {
        const totalNotifications = await Notification.countDocuments({});
        const deliveredNotifications = await Notification.countDocuments({ status: 'DELIVERED' });
        const failedNotifications = await Notification.countDocuments({ status: 'FAILED' });
        const pendingNotifications = await Notification.countDocuments({ status: 'PENDING' });

        logger.info('Getting notification statistics');
        return {
            total: totalNotifications,
            delivered: deliveredNotifications,
            failed: failedNotifications,
            pending: pendingNotifications,
        };
    } catch (error) {
        logger.error(`Error getting notification stats: ${error.message}`);
        throw error;
    }
};

const getQueueStats = async () => {
    try {
        const activeJobs = await queueService.getJobCounts('active');
        const delayedJobs = await queueService.getJobCounts('delayed');
        const completedJobs = await queueService.getJobCounts('completed');
        const failedJobs = await queueService.getJobCounts('failed');
        const waitingJobs = await queueService.getJobCounts('waiting');

        logger.info('Getting queue statistics');
        return {
            active: activeJobs,
            delayed: delayedJobs,
            completed: completedJobs,
            failed: failedJobs,
            waiting: waitingJobs,
        };
    } catch (error) {
        logger.error(`Error getting queue stats: ${error.message}`);
        throw error;
    }
};

module.exports = {
    createNotification,
    getNotifications,
    markNotificationRead,
    deleteNotification,
    processNotification,
    createFromTemplate,
    sendNotification,
    scheduleNotification,
    cancelNotification,
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