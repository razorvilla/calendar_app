const cron = require('node-cron');
const Notification = require('../../models/notification');
const logger = require('../../utils/logger');
const notificationController = require('./notification');
const queueService = require('../services/queueService');

// Configuration
const DEFAULT_BATCH_SIZE = 100;
const SCHEDULER_INTERVAL = '*/1 * * * *'; // Run every minute

// Process scheduled notifications that are due
async function processScheduledNotifications() {
  try {
    const now = new Date();

    // Find notifications that are scheduled for now or earlier and still pending
    const dueNotifications = await Notification.find({
      status: 'PENDING',
      scheduledFor: { $lte: now }
    }).limit(DEFAULT_BATCH_SIZE);

    logger.info(`Found ${dueNotifications.length} due notifications to process`);

    // Add each notification to the processing queue
    for (const notification of dueNotifications) {
      await queueService.addToQueue(notification._id);
    }

    return { processed: dueNotifications.length };
  } catch (error) {
    logger.error(`Error processing scheduled notifications: ${error.message}`);
    return { processed: 0, error: error.message };
  }
}

// Schedule recurring reminder notifications (e.g., for events)
async function scheduleEventReminders() {
  try {
    // In a real implementation, this would call the Calendar/Event service
    // to fetch upcoming events that need reminders
    logger.info('Scheduling event reminders');

    // This is a placeholder. In a real app, we would:
    // 1. Call the Event service to get upcoming events
    // 2. Check which ones need reminders
    // 3. Create notifications for each reminder needed

    return { scheduled: 0 };
  } catch (error) {
    logger.error(`Error scheduling event reminders: ${error.message}`);
    return { scheduled: 0, error: error.message };
  }
}

// Clean up old notifications (archiving or deletion policy)
async function cleanupOldNotifications() {
  try {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - 30); // 30 days ago

    // In a real implementation, we might:
    // 1. Archive notifications to a different storage
    // 2. Only delete certain types of notifications
    // 3. Apply different retention policies based on type

    logger.info('Cleaning up old notifications');

    // This is simplified. In a real app, we'd likely archive first
    const result = await Notification.deleteMany({
      createdAt: { $lt: thresholdDate },
      // Only delete processed notifications (delivered, failed, canceled)
      status: { $in: ['DELIVERED', 'FAILED', 'CANCELED'] }
    });

    return { deleted: result.deletedCount };
  } catch (error) {
    logger.error(`Error cleaning up old notifications: ${error.message}`);
    return { deleted: 0, error: error.message };
  }
}

// Retry failed notifications
async function retryFailedNotifications() {
  try {
    const now = new Date();
    const hourAgo = new Date(now - 60 * 60 * 1000); // 1 hour ago

    // Find recently failed notifications with retry count less than 3
    const failedNotifications = await Notification.find({
      status: 'FAILED',
      updatedAt: { $gte: hourAgo },
      retryCount: { $lt: 3 }
    }).limit(DEFAULT_BATCH_SIZE);

    logger.info(`Found ${failedNotifications.length} failed notifications to retry`);

    // Retry each notification
    for (const notification of failedNotifications) {
      // Increment retry count
      notification.retryCount += 1;
      notification.status = 'PENDING';
      await notification.save();

      // Add to processing queue
      await queueService.addToQueue(notification._id);
    }

    return { retried: failedNotifications.length };
  } catch (error) {
    logger.error(`Error retrying failed notifications: ${error.message}`);
    return { retried: 0, error: error.message };
  }
}

// Main scheduler function
let schedulerTask;

function startScheduler() {
  // Stop any existing scheduler
  if (schedulerTask) {
    schedulerTask.stop();
  }

  // Schedule the main task to run every minute
  schedulerTask = cron.schedule(SCHEDULER_INTERVAL, async () => {
    try {
      logger.info('Running notification scheduler tasks');

      // Process notifications that are scheduled for now
      await processScheduledNotifications();

      // Check for events that need reminders (less frequent)
      if (new Date().getMinutes() % 15 === 0) { // Every 15 minutes
        await scheduleEventReminders();
      }

      // Retry failed notifications (less frequent)
      if (new Date().getMinutes() % 5 === 0) { // Every 5 minutes
        await retryFailedNotifications();
      }

      // Cleanup old notifications (once a day)
      if (new Date().getHours() === 3 && new Date().getMinutes() === 0) { // 3 AM
        await cleanupOldNotifications();
      }
    } catch (error) {
      logger.error(`Error in scheduler task: ${error.message}`);
    }
  });

  logger.info('Notification scheduler started');
  return schedulerTask;
}

function stopScheduler() {
  if (schedulerTask) {
    schedulerTask.stop();
    logger.info('Notification scheduler stopped');
  }
}

module.exports = {
  startScheduler,
  stopScheduler,
  processScheduledNotifications,
  scheduleEventReminders,
  cleanupOldNotifications,
  retryFailedNotifications
};
