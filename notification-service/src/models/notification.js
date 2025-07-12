const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['EVENT_REMINDER', 'INVITATION', 'CALENDAR_SHARE', 'SYSTEM_ALERT', 'EVENT_UPDATE', 'CUSTOM'],
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  channel: {
    type: [String],
    enum: ['EMAIL', 'PUSH', 'SMS', 'IN_APP'],
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'SENT', 'DELIVERED', 'FAILED', 'CANCELED'],
    default: 'PENDING',
    index: true
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  scheduledFor: {
    type: Date,
    index: true
  },
  sentAt: Date,
  deliveredAt: Date,
  readAt: Date,
  retryCount: {
    type: Number,
    default: 0
  },
  lastError: String,
  deliveryLogs: [{
    channel: String,
    status: String,
    timestamp: Date,
    details: mongoose.Schema.Types.Mixed
  }]
}, {
  timestamps: true
});

// Indexes for common queries
notificationSchema.index({ userId: 1, status: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, readAt: 1 });
notificationSchema.index({ scheduledFor: 1, status: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
