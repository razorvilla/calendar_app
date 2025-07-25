const nodemailer = require('nodemailer');
const logger = require('@utils/logger');

// In a production environment, this would be properly configured
// with real SMTP settings, templates, etc.
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.example.com',
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || 'user@example.com',
    pass: process.env.EMAIL_PASSWORD || 'password'
  }
});

/**
 * Send email notification
 */
async function send(notification) {
  try {
    // In a real implementation, we would fetch the user's email from the user service
    // For now, we'll use a placeholder
    const userEmail = await getUserEmail(notification.userId);

    if (!userEmail) {
      logger.warn(`No email found for user ${notification.userId}`);
      return { success: false, error: 'No email address found' };
    }

    // Prepare email content
    const emailContent = {
      from: process.env.EMAIL_FROM || '"Calendar App" <notifications@example.com>',
      to: userEmail,
      subject: notification.title,
      text: notification.message,
      html: `<div style="font-family: Arial, sans-serif;">
        <h2>${notification.title}</h2>
        <p>${notification.message}</p>
        ${getActionButton(notification)}
        <p style="font-size: 12px; color: #666;">
          You're receiving this email because you signed up for notifications from Calendar App.
          <br>
          <a href="{unsubscribe_link}">Unsubscribe</a> or
          <a href="{preferences_link}">manage your notification preferences</a>.
        </p>
      </div>`
    };

    // Send email
    const info = await transporter.sendMail(emailContent);

    return {
      success: true,
      messageId: info.messageId,
      timestamp: new Date()
    };
  } catch (error) {
    logger.error(`Error sending email notification: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}

/**
 * Helper function to get user email
 * In a real implementation, this would call the user service
 */
async function getUserEmail(userId) {
  // Placeholder implementation
  // In a real app, we would call the user service to get the user's email
  return `user-${userId}@example.com`;
}

/**
 * Generate action button based on notification type
 */
function getActionButton(notification) {
  // Different button styles and actions based on notification type
  switch (notification.type) {
    case 'EVENT_REMINDER':
      return `<a href="{event_link}" style="display: inline-block; background-color: #4285f4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin: 15px 0;">View Event</a>`;
    case 'INVITATION':
      return `
        <div style="margin: 15px 0;">
          <a href="{accept_link}" style="display: inline-block; background-color: #0f9d58; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-right: 10px;">Accept</a>
          <a href="{decline_link}" style="display: inline-block; background-color: #db4437; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Decline</a>
        </div>`;
    case 'CALENDAR_SHARE':
      return `<a href="{calendar_link}" style="display: inline-block; background-color: #4285f4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin: 15px 0;">View Shared Calendar</a>`;
    default:
      return '';
  }
}

module.exports = {
  send
};
