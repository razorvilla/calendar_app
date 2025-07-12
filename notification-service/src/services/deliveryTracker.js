const Notification = require('../models/notification');
const logger = require('../utils/logger');

/**
 * Track notification status changes and updates
 */
async function trackDeliveryStatus(notificationId, channel, status, details = {}) {
  try {
    const notification = await Notification.findById(notificationId);

    if (!notification) {
      logger.warn(`Notification not found for tracking: ${notificationId}`);
      return false;
    }

    // Create delivery log entry
    const logEntry = {
      channel,
      status,
      timestamp: new Date(),
      details
    };

    // Add to delivery logs
    notification.deliveryLogs = [...(notification.deliveryLogs || []), logEntry];

    // Update notification status based on channel status
    updateNotificationStatus(notification, channel, status);

    await notification.save();
    logger.info(`Updated delivery status for notification ${notificationId}: ${channel} -> ${status}`);
    return true;
  } catch (error) {
    logger.error(`Error tracking delivery status: ${error.message}`);
    return false;
  }
}

/**
 * Track when a notification is read by the user
 */
async function trackNotificationRead(notificationId, details = {}) {
  try {
    const notification = await Notification.findById(notificationId);

    if (!notification) {
      logger.warn(`Notification not found for read tracking: ${notificationId}`);
      return false;
    }

    // Set read timestamp
    notification.readAt = new Date();

    // Add to delivery logs
    notification.deliveryLogs.push({
      channel: 'USER',
      status: 'READ',
      timestamp: notification.readAt,
      details
    });

    await notification.save();
    logger.info(`Marked notification ${notificationId} as read`);
    return true;
  } catch (error) {
    logger.error(`Error tracking notification read status: ${error.message}`);
    return false;
  }
}

/**
 * Track when a notification has a delivery failure
 */
async function trackDeliveryFailure(notificationId, channel, error) {
  try {
    const notification = await Notification.findById(notificationId);

    if (!notification) {
      logger.warn(`Notification not found for failure tracking: ${notificationId}`);
      return false;
    }

    // Create delivery log entry
    const logEntry = {
      channel,
      status: 'FAILED',
      timestamp: new Date(),
      details: { error: error.message || 'Unknown error' }
    };

    // Add to delivery logs
    notification.deliveryLogs = [...(notification.deliveryLogs || []), logEntry];

    // Update last error
    notification.lastError = error.message || 'Unknown error';

    // check if all channels have failed
    const allChannelsFailed = areAllChannelsFailed(notification);
    if (allChannelsFailed) {
      notification.status = 'FAILED';
    }

    await notification.save();
    logger.info(`Tracked delivery failure for notification ${notificationId} on ${channel}: ${error.message}`);
    return true;
  } catch (error) {
    logger.error(`Error tracking delivery failure: ${error.message}`);
    return false;
  }
}

/**
 * Track external service delivery confirmations
 * For services like email or SMS that provide delivery webhooks
 */
async function trackExternalConfirmation(externalId, status, details = {}) {
  try {
    // Find notification by external ID in metadata or delivery logs
    const notification = await Notification.findOne({
      $or: [
        { 'metadata.externalId': externalId },
        { 'deliveryLogs.details.externalId': externalId }
      ]
    });

    if (!notification) {
      logger.warn(`No notification found for external ID: ${externalId}`);
      return false;
    }

    // Determine channel from delivery logs
    let channel = null;
    for (const log of notification.deliveryLogs) {
      if (log.details && log.details.externalId === externalId) {
        channel = log.channel;
        break;
      }
    }

    if (!channel) {
      // Try to determine from the details or fallback to 'EXTERNAL'
      channel = details.channel || 'EXTERNAL';
    }

    // Create delivery log entry
    const logEntry = {
      channel,
      status,
      timestamp: new Date(),
      details: {
        ...details,
        externalId
      }
    };

    // Add to delivery logs
    notification.deliveryLogs = [...(notification.deliveryLogs || []), logEntry];

    // Update notification status based on external confirmation
    if (status === 'DELIVERED') {
      if (!notification.deliveredAt) {
        notification.deliveredAt = new Date();
      }
    }

    // Only update status if it's not already in a terminal state
    if (notification.status === 'SENT') {
      notification.status = 'DELIVERED';
    } else if (status === 'FAILED') {
      // Update last error
      notification.lastError = details.reason || 'External delivery failure';
      // Check if all channels have failed
      const allChannelsFailed = areAllChannelsFailed(notification);
      if (allChannelsFailed) {
        notification.status = 'FAILED';
      }
    }

    await notification.save();
    logger.info(`Tracked external confirmation for notification ${notification._id} (${externalId}): ${status}`);
    return true;
  } catch (error) {
    logger.error(`Error tracking external confirmation: ${error.message}`);
    return false;
  }
}

/**
 * Get delivery statistics for a specific time period
 */
async function getDeliveryStats(startDate, endDate, filter = {}) {
  try {
    const query = {
      createdAt: {
        $gte: startDate,
        $lte: endDate
      },
      ...filter
    };

    // Get total count
    const total = await Notification.countDocuments(query);

    // Get counts by status
    const statusCounts = await Notification.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Get counts by channel
    const channelCounts = await Notification.aggregate([
      { $match: query },
      { $unwind: '$channel' },
      { $group: { _id: '$channel', count: { $sum: 1 } } }
    ]);

    // Get read rate
    const readCount = await Notification.countDocuments({ ...query, readAt: { $ne: null } });

    // Get average time to delivery (in seconds)
    const deliveryTimes = await Notification.aggregate([
      { $match: { ...query, sentAt: { $ne: null }, deliveredAt: { $ne: null } } },
      {
        $project: {
          deliveryTimeSeconds: {
            $divide: [{
              $subtract: ['$deliveredAt', '$sentAt']
            }, 1000]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgDeliveryTime: { $avg: '$deliveryTimeSeconds' },
          minDeliveryTime: { $min: '$deliveryTimeSeconds' },
          maxDeliveryTime: { $max: '$deliveryTimeSeconds' }
        }
      }
    ]);

    // Format status counts
    const statusMap = statusCounts.reduce((acc, item) => {
      acc[item._id.toLowerCase()] = item.count;
      return acc;
    }, {});

    // Format channel counts
    const channelMap = channelCounts.reduce((acc, item) => {
      acc[item._id.toLowerCase()] = item.count;
      return acc;
    }, {});

    const deliveryTimeStats = deliveryTimes.length > 0 ? deliveryTimes[0] : { avgDeliveryTime: null, minDeliveryTime: null, maxDeliveryTime: null };

    return {
      period: {
        start: startDate,
        end: endDate
      },
      total,
      status: statusMap,
      channels: channelMap,
      readRate: total > 0 ? (readCount / total) * 100 : 0,
      deliveryTimes: {
        average: deliveryTimeStats.avgDeliveryTime,
        min: deliveryTimeStats.minDeliveryTime,
        max: deliveryTimeStats.maxDeliveryTime
      }
    };
  } catch (error) {
    logger.error(`Error getting delivery stats: ${error.message}`);
    throw error;
  }
}

// Helper to determine if all channels have failed for a notification
function areAllChannelsFailed(notification) {
  // Get unique channels from delivery logs
  const channelStatuses = {};
  for (const log of notification.deliveryLogs) {
    // If we have a more recent status for this channel, use it
    if (!channelStatuses[log.channel] || channelStatuses[log.channel].timestamp < log.timestamp) {
      channelStatuses[log.channel] = {
        status: log.status,
        timestamp: log.timestamp
      };
    }
  }

  // Check if any channels are not in a failed state
  for (const channel of Object.keys(channelStatuses)) {
    if (channelStatuses[channel].status !== 'FAILED') {
      return false;
    }
  }

  // Check if we have at least one channel with status
  return Object.keys(channelStatuses).length > 0;
}

// Helper to update notification status based on channel delivery status
function updateNotificationStatus(notification, channel, status) {
  if (status === 'DELIVERED') {
    // Mark as delivered if at least one channel is delivered
    if (notification.status === 'SENT' || notification.status === 'PENDING') {
      notification.status = 'DELIVERED';
      notification.deliveredAt = new Date();
    }
  } else if (status === 'FAILED') {
    // Check if all channels have failed
    const allChannelsFailed = areAllChannelsFailed(notification);
    if (allChannelsFailed) {
      notification.status = 'FAILED';
    }
  }
}

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

module.exports = {
  trackDeliveryStatus,
  trackNotificationRead,
  trackDeliveryFailure,
  trackExternalConfirmation,
  getDeliveryStats
};
