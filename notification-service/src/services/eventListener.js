const { Kafka } = require('kafkajs');
const notificationController = require('../controllers/notification');
const logger = require('../utils/logger');

// Kafka consumer instance
let consumer;

// Event to template mapping
const EVENT_TEMPLATE_MAPPING = {
  'event.created': 'event_created',
  'event.updated': 'event_updated',
  'event.reminder': 'event_reminder',
  'invitation.sent': 'invitation_sent',
  'invitation.responded': 'invitation_responded',
  'calendar.shared': 'calendar_shared'
};

/**
 * Initialize Kafka consumer and connect to broker
 */
async function initialize() {
  try {
    // Check if Kafka is enabled via environment variables
    if (process.env.ENABLE_KAFKA !== 'true') {
      logger.info('Kafka event listener is disabled');
      return false;
    }

    const kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID || 'notification-service',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
    });

    // Create consumer
    consumer = kafka.consumer({
      groupId: process.env.KAFKA_GROUP_ID || 'notification-service-group'
    });

    // Connect to Kafka
    await consumer.connect();

    // Subscribe to relevant topics
    const topics = [
      'event-service-events',
      'user-service-events',
      'calendar-service-events'
    ];

    for (const topic of topics) {
      await consumer.subscribe({ topic, fromBeginning: false });
    }

    // Start consuming messages
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          // Parse message
          const payload = JSON.parse(message.value.toString());
          logger.info(`Received message from ${topic}: ${payload.eventType}`);

          // Process based on event type
          await processEvent(payload);
        } catch (error) {
          logger.error(`Error processing Kafka message: ${error.message}`);
        }
      },
    });

    logger.info('Kafka event listener initialized and connected');
    return true;
  } catch (error) {
    logger.error(`Error initializing Kafka consumer: ${error.message}`);
    return false;
  }
}

/**
 * Process incoming event and create notifications as needed
 */
async function processEvent(payload) {
  try {
    const { eventType, data } = payload;

    // Find corresponding template for this event type
    const templateName = EVENT_TEMPLATE_MAPPING[eventType];
    if (!templateName) {
      logger.warn(`No template mapping found for event type: ${eventType}`);
      return false;
    }

    // Extract user ID from the event data
    const userId = extractUserId(eventType, data);
    if (!userId) {
      logger.warn(`No user ID found in event data for: ${eventType}`);
      return false;
    }

    // Create notification from template
    const notification = await notificationController.createFromTemplate(
      templateName,
      userId,
      data
    );

    if (!notification) {
      logger.warn(`Failed to create notification for event: ${eventType}`);
      return false;
    }

    // Check if this is an immediate notification or a scheduled one
    if (shouldSchedule(eventType, data)) {
      // For events like reminders, we schedule them
      const scheduledTime = calculateScheduleTime(eventType, data);
      if (scheduledTime) {
        notification.scheduledFor = scheduledTime;
        await notification.save();
        await queueService.scheduleInQueue(notification._id, scheduledTime);
      }
    } else {
      // For immediate notifications, add to processing queue
      await queueService.addToQueue(notification._id);
    }

    logger.info(`Created notification ${notification._id} for event ${eventType}`);
    return true;
  } catch (error) {
    logger.error(`Error processing event: ${error.message}`);
    return false;
  }
}

/**
 * Extract user ID from event data based on event type
 */
function extractUserId(eventType, data) {
  switch (eventType) {
    case 'event.created':
    case 'event.updated':
      return data.creatorId;
    case 'event.reminder':
      return data.userId;
    case 'invitation.sent':
      return data.inviteeId;
    case 'invitation.responded':
      return data.eventOwnerId;
    case 'calendar.shared':
      return data.targetUserId;
    default:
      if (data.userId) return data.userId;
      if (data.user_id) return data.user_id;
      return null;
  }
}

/**
 * Determine if notification should be scheduled for future delivery
 */
function shouldSchedule(eventType, data) {
  // Events that should be scheduled rather than sent immediately
  return eventType === 'event.reminder' && data.reminderTime;
}

/**
 * Calculate when a notification should be scheduled
 */
function calculateScheduleTime(eventType, data) {
  if (eventType === 'event.reminder') {
    if (data.reminderTime) {
      return new Date(data.reminderTime);
    }
    // If no specific reminder time but we have event start time and reminder minutes
    if (data.eventStartTime && data.reminderMinutesBefore) {
      const eventTime = new Date(data.eventStartTime);
      const reminderTime = new Date(
        eventTime.getTime() - (data.reminderMinutesBefore * 60 * 1000)
      );
      return reminderTime;
    }
  }
  return null;
}

/**
 * Disconnect from Kafka
 */
async function disconnect() {
  if (consumer) {
    try {
      await consumer.disconnect();
      logger.info('Kafka event listener disconnected');
      return true;
    } catch (error) {
      logger.error(`Error disconnecting Kafka consumer: ${error.message}`);
      return false;
    }
  }
  return true;
}

module.exports = {
  initialize,
  processEvent,
  disconnect
};
