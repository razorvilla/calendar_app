const mongoose = require('mongoose');

const notificationTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['EVENT_REMINDER', 'INVITATION', 'CALENDAR_SHARE', 'SYSTEM_ALERT', 'EVENT_UPDATE', 'CUSTOM'],
    required: true
  },
  titleTemplate: {
    type: String,
    required: true
  },
  messageTemplate: {
    type: String,
    required: true
  },
  defaultChannels: {
    type: [String],
    enum: ['EMAIL', 'PUSH', 'SMS', 'IN_APP'],
    required: true
  },
  defaultPriority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM'
  },
  variables: {
    type: [String],
    default: []
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const NotificationTemplate = mongoose.model('NotificationTemplate', notificationTemplateSchema);

module.exports = NotificationTemplate;
