const Bull = require('bull');
const Notification = require('../../models/notification');
const notificationController = require('../../controllers/notification');
const logger = require('../../utils/logger');

// Create queue instances
let notificationQueue;
let scheduledQueue;

/**
 * Initialize queue service
 */
function initialize() {
  const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  };

  // Main notification processing queue
  notificationQueue = new Bull('notification-processing', {
    redis: redisConfig,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000 // 1 second initial delay, then 2s, 4s, etc.
      },
      removeOnComplete: true,
      removeOnFail: false
    }
  });

  // Queue for scheduled notifications
  scheduledQueue = new Bull('notification-scheduled', {
    redis: redisConfig,
    defaultJobOptions: {
      removeOnComplete: true
    }
  });

  // Process jobs in the main queue
  notificationQueue.process(async (job) => {
    const { notificationId } = job.data;
    logger.info(`Processing notification: ${notificationId}`);
    try {
      // Fetch the notification from the database
      const notification = await Notification.findById(notificationId);
      if (!notification) {
        logger.warn(`Notification not found: ${notificationId}`);
        return { success: false, error: 'Notification not found' };
      }

      if (notification.status !== 'PENDING') {
        logger.warn(`Notification ${notificationId} is not pending (status: ${notification.status})`);
        return { success: false, error: `Invalid notification status: ${notification.status}` };
      }

      // Process the notification through appropriate channels
      const result = await notificationController.processNotification(notification);
      return { success: true, notificationId, result };
    } catch (error) {
      logger.error(`Error processing notification job: ${error.message}`);
      throw error; // This will trigger the job to be retried
    }
  });

  // Process jobs in the scheduled queue
  scheduledQueue.process(async (job) => {
    const { notificationId } = job.data;
    logger.info(`Processing scheduled notification: ${notificationId}`);
    try {
      // Move the scheduled notification to the main processing queue
      await addToQueue(notificationId);
      return { success: true, notificationId };
    } catch (error) {
      logger.error(`Error processing scheduled notification job: ${error.message}`);
      throw error;
    }
  });

  // Handle completed jobs
  notificationQueue.on('completed', (job, result) => {
    logger.info(`Notification job completed: ${job.id}`);
  });

  // Handle failed jobs
  notificationQueue.on('failed', (job, error) => {
    logger.error(`Notification job failed: ${job.id}, Error: ${error.message}`);
  });

  // Handle stalled jobs (worker crashed or was killed)
  notificationQueue.on('stalled', (jobId) => {
    logger.warn(`Notification job stalled: ${jobId}`);
  });

  logger.info('Notification queue service initialized');
}

/**
 * Add a notification to the processing queue
 */
async function addToQueue(notificationId) {
  if (!notificationQueue) {
    initialize();
  }
  // Add job to the queue
  const job = await notificationQueue.add({
    notificationId,
    timestamp: new Date().toISOString()
  });
  logger.info(`Added notification ${notificationId} to processing queue, job ID: ${job.id}`);
  return job;
}

/**
 * Schedule a notification for future processing
 */
async function scheduleInQueue(notificationId, scheduledFor) {
  if (!scheduledQueue) {
    initialize();
  }

  // Calculate delay in milliseconds
  const now = new Date();
  const scheduledTime = new Date(scheduledFor);
  const delay = Math.max(0, scheduledTime.getTime() - now.getTime());

  // Add job to the scheduled queue with the calculated delay
  const job = await scheduledQueue.add(
    {
      notificationId,
      scheduledFor: scheduledTime.toISOString(),
      timestamp: now.toISOString()
    },
    {
      delay,
      jobId: `scheduled:${notificationId}`
    }
  );

  logger.info(
    `Scheduled notification ${notificationId} for ${scheduledTime.toISOString()}, job ID: ${job.id}, delay: ${delay}ms`
  );

  return job;
}

/**
 * Remove a notification from any queue
 */
async function removeFromQueue(notificationId) {
  try {
    if (!notificationQueue || !scheduledQueue) {
      initialize();
    }

    // Check if job exists in the processing queue and remove it
    const processingJobs = await notificationQueue.getJobs(['waiting', 'active', 'delayed']);
    for (const job of processingJobs) {
      if (job.data.notificationId === notificationId) {
        await job.remove();
        logger.info(`Removed notification ${notificationId} from processing queue, job ID: ${job.id}`);
      }
    }

    // Check if job exists in the scheduled queue and remove it
    const scheduledJob = await scheduledQueue.getJob(`scheduled:${notificationId}`);
    if (scheduledJob) {
      await scheduledJob.remove();
      logger.info(`Removed notification ${notificationId} from scheduled queue, job ID: ${scheduledJob.id}`);
    }

    return true;
  } catch (error) {
    logger.error(`Error removing notification from queue: ${error.message}`);
    throw error;
  }
}

/**
 * Get queue statistics
 */
async function getQueueStats() {
  if (!notificationQueue || !scheduledQueue) {
    initialize();
  }

  try {
    // Get counts for different job states in both queues
    const processingCounts = await notificationQueue.getJobCounts();
    const scheduledCounts = await scheduledQueue.getJobCounts();

    return {
      processing: processingCounts,
      scheduled: scheduledCounts,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error(`Error getting queue stats: ${error.message}`);
    throw error;
  }
}

/**
 * Clean up completed and failed jobs older than the specified duration
 */
async function cleanupOldJobs(olderThan = '7d') {
  if (!notificationQueue || !scheduledQueue) {
    initialize();
  }

  try {
    // Clean up old jobs from both queues
    await notificationQueue.clean(olderThan, 'completed');
    await notificationQueue.clean(olderThan, 'failed');
    await scheduledQueue.clean(olderThan, 'completed');

    logger.info(`Cleaned up jobs older than ${olderThan}`);
    return true;
  } catch (error) {
    logger.error(`Error cleaning up old jobs: ${error.message}`);
    throw error;
  }
}

module.exports = {
  initialize,
  addToQueue,
  scheduleInQueue,
  removeFromQueue,
  getQueueStats,
  cleanupOldJobs
};
