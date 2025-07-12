const Notification = require('../../models/notification');
const NotificationTemplate = require('../../models/template');
const NotificationPreference = require('../../models/preference');
const notificationController = require('../../controllers/notification');
const logger = require('../../utils/logger');

const resolvers = {
  Query: {
    notification: async (_, { id }, context) => {
      // Auth check would be here
      return await Notification.findById(id);
    },
    notifications: async (_, args, context) => {
      // Auth check would be here
      const { status, type, channel, read, limit, offset, sortBy, sortOrder } = args;
      const query = {};
      if (status) query.status = status;
      if (type) query.type = type;
      if (channel) query.channel = { $in: [channel] };
      if (read !== undefined) query.readAt = read ? { $ne: null } : null;

      // Add user ID from auth context
      query.userId = context.userId;

      return await Notification.find(query)
        .sort({ [sortBy]: sortOrder === 'DESC' ? -1 : 1 })
        .skip(offset)
        .limit(limit);
    },
    notificationCount: async (_, __, context) => {
      // Auth check would be here
      const userId = context.userId;
      const now = new Date();

      const unread = await Notification.countDocuments({
        userId,
        readAt: null
      });

      const today = await Notification.countDocuments({
        userId,
        createdAt: {
          $gte: new Date(now.setHours(0, 0, 0, 0))
        }
      });

      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const thisWeek = await Notification.countDocuments({
        userId,
        createdAt: { $gte: startOfWeek }
      });

      return { unread, today, thisWeek };
    },
    notificationTemplates: async (_, { type }) => {
      const query = type ? { type } : {};
      return await NotificationTemplate.find(query);
    },
    notificationPreferences: async (_, __, context) => {
      // Auth check would be here
      return await NotificationPreference.find({ userId: context.userId });
    },
    notificationStats: async (_, { startDate, endDate, type }) => {
      // This would be admin-only
      const query = {};
      if (startDate && endDate) {
        query.createdAt = { $gte: startDate, $lte: endDate };
      }
      if (type) query.type = type;

      const total = await Notification.countDocuments(query);
      const sent = await Notification.countDocuments({ ...query, status: 'SENT' });
      const delivered = await Notification.countDocuments({ ...query, status: 'DELIVERED' });
      const failed = await Notification.countDocuments({ ...query, status: 'FAILED' });
      const pending = await Notification.countDocuments({ ...query, status: 'PENDING' });
      const readCount = await Notification.countDocuments({ ...query, readAt: { $ne: null } });

      const readRate = total > 0 ? (readCount / total) * 100 : 0;

      return {
        total,
        sent,
        delivered,
        failed,
        pending,
        readRate
      };
    }
  },
  Mutation: {
    sendNotification: async (_, args) => {
      try {
        return await notificationController.sendNotification(args);
      } catch (error) {
        logger.error(`Error sending notification: ${error.message}`);
        throw error;
      }
    },
    scheduleNotification: async (_, args) => {
      try {
        return await notificationController.scheduleNotification(args);
      } catch (error) {
        logger.error(`Error scheduling notification: ${error.message}`);
        throw error;
      }
    },
    cancelNotification: async (_, { id }) => {
      try {
        return await notificationController.cancelNotification(id);
      } catch (error) {
        logger.error(`Error canceling notification: ${error.message}`);
        throw error;
      }
    },
    markNotificationAsRead: async (_, { id }, context) => {
      // Auth check would be here
      const notification = await Notification.findById(id);
      if (!notification) {
        throw new Error('Notification not found');
      }
      if (notification.userId.toString() !== context.userId) {
        throw new Error('Not authorized to mark this notification as read');
      }
      notification.readAt = new Date();
      await notification.save();
      return notification;
    },
    markAllNotificationsAsRead: async (_, __, context) => {
      // Auth check would be here
      const result = await Notification.updateMany(
        { userId: context.userId, readAt: null },
        { readAt: new Date() }
      );
      return result.modifiedCount > 0;
    },
    createNotificationTemplate: async (_, args) => {
      // Admin-only check would be here
      try {
        const template = new NotificationTemplate(args);
        await template.save();
        return template;
      } catch (error) {
        logger.error(`Error creating notification template: ${error.message}`);
        throw error;
      }
    },
    updateNotificationTemplate: async (_, { id, ...updates }) => {
      // Admin-only check would be here
      try {
        const template = await NotificationTemplate.findByIdAndUpdate(
          id,
          updates,
          { new: true }
        );
        if (!template) {
          throw new Error('Template not found');
        }
        return template;
      } catch (error) {
        logger.error(`Error updating notification template: ${error.message}`);
        throw error;
      }
    },
    updateNotificationPreference: async (_, args, context) => {
      // Auth check would be here
      try {
        const { type, ...updates } = args;
        const preference = await NotificationPreference.findOneAndUpdate(
          { userId: context.userId, type },
          { ...updates },
          { new: true, upsert: true }
        );
        return preference;
      } catch (error) {
        logger.error(`Error updating notification preferences: ${error.message}`);
        throw error;
      }
    }
  },
  // Subscription resolvers would be defined here if using subscriptions
};

module.exports = resolvers;
