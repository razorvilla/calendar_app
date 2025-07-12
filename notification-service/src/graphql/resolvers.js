const Notification = require('../models/notification');
const NotificationPreference = require('../models/preference');
const NotificationTemplate = require('../models/template');
const notificationController = require('../controllers/notification');
const deliveryTracker = require('../services/deliveryTracker');
const queueService = require('../services/queueService');
const logger = require('../utils/logger');

const resolvers = {
  DateTime: require('graphql-iso-date').GraphQLDateTime,
  JSON: require('graphql-type-json'),

  Query: {
    notifications: async (_, args, context) => {
      if (!context.token) throw new Error('Authentication required');
      // In a real app, you'd decode the token to get userId
      const userId = 'some-user-id'; // Placeholder

      try {
        const { status, type, read, limit, offset, sortBy, sortOrder } = args;
        const notifications = await notificationController.getNotificationsByUser(
          userId,
          {
            status,
            type,
            read,
            limit,
            offset,
            sortBy,
            sortOrder: sortOrder ? sortOrder.toUpperCase() : undefined,
          }
        );
        return notifications;
      } catch (error) {
        logger.error(`GraphQL Error fetching notifications: ${error.message}`);
        throw new Error('Failed to fetch notifications');
      }
    },
    notification: async (_, { id }, context) => {
      if (!context.token) throw new Error('Authentication required');
      const userId = 'some-user-id'; // Placeholder

      try {
        const notification = await Notification.findById(id);
        if (!notification || notification.userId.toString() !== userId) {
          throw new Error('Notification not found or unauthorized');
        }
        return notification;
      } catch (error) {
        logger.error(`GraphQL Error fetching notification: ${error.message}`);
        throw new Error('Failed to fetch notification');
      }
    },
    notificationCount: async (_, __, context) => {
      if (!context.token) throw new Error('Authentication required');
      const userId = 'some-user-id'; // Placeholder

      try {
        const now = new Date();
        const unread = await Notification.countDocuments({ userId, readAt: null });

        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const today = await Notification.countDocuments({ userId, createdAt: { $gte: startOfDay } });

        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - nowOfWeek.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const thisWeek = await Notification.countDocuments({ userId, createdAt: { $gte: startOfWeek } });

        return { unread, today, thisWeek };
      } catch (error) {
        logger.error(`GraphQL Error fetching notification count: ${error.message}`);
        throw new Error('Failed to fetch notification count');
      }
    },
    notificationPreferences: async (_, __, context) => {
      if (!context.token) throw new Error('Authentication required');
      const userId = 'some-user-id'; // Placeholder

      try {
        const preferences = await NotificationPreference.find({ userId });
        return preferences;
      } catch (error) {
        logger.error(`GraphQL Error fetching notification preferences: ${error.message}`);
        throw new Error('Failed to fetch notification preferences');
      }
    },
    notificationTemplates: async (_, { type }, context) => {
      // This might be an admin-only query, adjust authentication as needed
      // if (!context.token) throw new Error('Authentication required');

      try {
        const query = type ? { type } : {};
        const templates = await NotificationTemplate.find(query);
        return templates;
      } catch (error) {
        logger.error(`GraphQL Error fetching notification templates: ${error.message}`);
        throw new Error('Failed to fetch notification templates');
      }
    },
  },

  Mutation: {
    sendNotification: async (_, { input }, context) => {
      if (!context.token) throw new Error('Authentication required');
      // In a real app, you'd decode the token to get userId
      // For now, assume input.userId is valid or replace with decoded userId

      try {
        const notification = await notificationController.sendNotification(input);
        return notification;
      } catch (error) {
        logger.error(`GraphQL Error sending notification: ${error.message}`);
        throw new Error('Failed to send notification');
      }
    },
    scheduleNotification: async (_, { input }, context) => {
      if (!context.token) throw new Error('Authentication required');
      // For now, assume input.userId is valid or replace with decoded userId

      try {
        const notification = await notificationController.scheduleNotification(input);
        return notification;
      } catch (error) {
        logger.error(`GraphQL Error scheduling notification: ${error.message}`);
        throw new Error('Failed to schedule notification');
      }
    },
    sendTemplateNotification: async (_, { input }, context) => {
      if (!context.token) throw new Error('Authentication required');
      // For now, assume input.userId is valid or replace with decoded userId

      try {
        const notification = await notificationController.createFromTemplate(
          input.templateName,
          input.userId,
          input.data
        );
        if (!notification) {
          throw new Error('Failed to create notification from template');
        }
        await queueService.addToQueue(notification._id);
        return notification;
      } catch (error) {
        logger.error(`GraphQL Error sending template notification: ${error.message}`);
        throw new Error('Failed to send template notification');
      }
    },
    markNotificationAsRead: async (_, { id }, context) => {
      if (!context.token) throw new Error('Authentication required');
      const userId = 'some-user-id'; // Placeholder

      try {
        const notification = await Notification.findById(id);
        if (!notification || notification.userId.toString() !== userId) {
          throw new Error('Notification not found or unauthorized');
        }
        notification.readAt = new Date();
        await notification.save();
        await deliveryTracker.trackNotificationRead(id, { source: 'GraphQL', userId });
        return notification;
      } catch (error) {
        logger.error(`GraphQL Error marking notification as read: ${error.message}`);
        throw new Error('Failed to mark notification as read');
      }
    },
    markAllNotificationsAsRead: async (_, __, context) => {
      if (!context.token) throw new Error('Authentication required');
      const userId = 'some-user-id'; // Placeholder

      try {
        const result = await Notification.updateMany(
          { userId, readAt: null },
          { readAt: new Date() }
        );
        return { modifiedCount: result.modifiedCount };
      } catch (error) {
        logger.error(`GraphQL Error marking all notifications as read: ${error.message}`);
        throw new Error('Failed to mark all notifications as read');
      }
    },
    cancelNotification: async (_, { id }, context) => {
      if (!context.token) throw new Error('Authentication required');
      const userId = 'some-user-id'; // Placeholder

      try {
        const notification = await Notification.findById(id);
        if (!notification || notification.userId.toString() !== userId) {
          throw new Error('Notification not found or unauthorized');
        }
        if (notification.status !== 'PENDING') {
          throw new Error(`Cannot cancel notification with status: ${notification.status}`);
        }
        const canceled = await notificationController.cancelNotification(id);
        if (!canceled) {
          throw new Error('Failed to cancel notification');
        }
        return notification; // Return the canceled notification
      } catch (error) {
        logger.error(`GraphQL Error canceling notification: ${error.message}`);
        throw new Error('Failed to cancel notification');
      }
    },
    updateNotificationPreferences: async (_, { type, input }, context) => {
      if (!context.token) throw new Error('Authentication required');
      const userId = 'some-user-id'; // Placeholder

      try {
        const preference = await NotificationPreference.findOneAndUpdate(
          { userId, type },
          {
            channels: input.channels,
            enabled: input.enabled,
            quiet: input.quiet,
            quietStartTime: input.quietStartTime,
            quietEndTime: input.quietEndTime,
          },
          { new: true, upsert: true }
        );
        return preference;
      } catch (error) {
        logger.error(`GraphQL Error updating notification preferences: ${error.message}`);
        throw new Error('Failed to update notification preferences');
      }
    },
    createNotificationTemplate: async (_, { input }, context) => {
      // This might be an admin-only mutation, adjust authentication as needed
      // if (!context.token) throw new Error('Authentication required');

      try {
        const existingTemplate = await NotificationTemplate.findOne({ name: input.name });
        if (existingTemplate) {
          throw new Error('Template with this name already exists');
        }
        const template = new NotificationTemplate({
          name: input.name,
          type: input.type,
          titleTemplate: input.titleTemplate,
          messageTemplate: input.messageTemplate,
          defaultChannels: input.defaultChannels,
          defaultPriority: input.defaultPriority || 'MEDIUM',
          variables: input.variables || [],
        });
        await template.save();
        return template;
      } catch (error) {
        logger.error(`GraphQL Error creating notification template: ${error.message}`);
        throw new Error('Failed to create notification template');
      }
    },
    updateNotificationTemplate: async (_, { id, input }, context) => {
      // This might be an admin-only mutation, adjust authentication as needed
      // if (!context.token) throw new Error('Authentication required');

      try {
        const template = await NotificationTemplate.findByIdAndUpdate(
          id,
          input,
          { new: true }
        );
        if (!template) {
          throw new Error('Template not found');
        }
        return template;
      } catch (error) {
        logger.error(`GraphQL Error updating notification template: ${error.message}`);
        throw new Error('Failed to update notification template');
      }
    },
  },
};

module.exports = resolvers;
