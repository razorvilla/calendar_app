const mongoose = require('mongoose');

const notificationPreferenceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  type: {
    type: String,
    enum: ['EVENT_REMINDER', 'INVITATION', 'CALENDAR_SHARE', 'SYSTEM_ALERT', 'EVENT_UPDATE', 'CUSTOM'],
    required: true
  },
  channels: {
    type: [String],
    enum: ['EMAIL', 'PUSH', 'SMS', 'IN_APP'],
    required: true
  },
  enabled: {
    type: Boolean,
    default: true
  },
  quiet: {
    type: Boolean,
    default: false
  },
  quietStartTime: {
    type: String,
    validate: {
      validator: function(v) {
        return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
      },
      message: props => `${props.value} is not a valid time format (HH:MM)`
    }
  },
  quietEndTime: {
    type: String,
    validate: {
      validator: function(v) {
        return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
      },
      message: props => `${props.value} is not a valid time format (HH:MM)`
    }
  }
}, {
  timestamps: true
});

// Composite unique index to ensure one preference per user per notification type
notificationPreferenceSchema.index({ userId: 1, type: 1 }, { unique: true });

const NotificationPreference = mongoose.model('NotificationPreference', notificationPreferenceSchema);

module.exports = NotificationPreference;
