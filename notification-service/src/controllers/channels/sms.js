const twilio = require('twilio');
const logger = require('../../../utils/logger');

// In a production environment, this would be properly configured
// with real Twilio settings
let twilioClient;
if (process.env.ENABLE_SMS === 'true') {
  try {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  } catch (error) {
    logger.warn(`Twilio initialization error: ${error.message}`);
  }
}

/**
 * Send SMS notification
 */
async function send(notification) {
  try {
    if (process.env.ENABLE_SMS !== 'true') {
      logger.warn('SMS notifications are disabled');
      return { success: false, error: 'SMS notifications are disabled' };
    }

    // In a real implementation, we would fetch the user's phone number from the user service
    const userPhone = await getUserPhone(notification.userId);

    if (!userPhone) {
      logger.warn(`No phone number found for user ${notification.userId}`);
      return { success: false, error: 'No phone number found' };
    }

    // Prepare message content
    // SMS should be shorter and more concise than other notification types
    let messageContent = shortenMessage(notification);

    // Add prefix for high priority notifications
    if (notification.priority === 'HIGH' || notification.priority === 'CRITICAL') {
      messageContent = `URGENT: ${messageContent}`;
    }

    // Send SMS
    const message = await twilioClient.messages.create({
      body: messageContent,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: userPhone
    });

    return {
      success: true,
      messageId: message.sid,
      timestamp: new Date()
    };
  } catch (error) {
    logger.error(`Error sending SMS notification: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}

/**
 * Helper function to get user phone number
 * In a real implementation, this would call the user service
 */
async function getUserPhone(userId) {
  // Placeholder implementation
  // In a real app, we would call the user service to get the user's phone number
  return `+1555${userId.toString().slice(-8)}`;
}

/**
 * Shorten message to be suitable for SMS
 * SMS messages should be concise and to the point
 */
function shortenMessage(notification) {
  // Combine title and message, but ensure total length is reasonable for SMS
  let combined = `${notification.title}: ${notification.message}`;

  // Truncate if too long (SMS typically should be under 160 characters)
  if (combined.length > 160) {
    combined = combined.substring(0, 157) + '...';
  }
  return combined;
}

module.exports = {
  send
};
