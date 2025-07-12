const Joi = require('joi');
const logger = require('../../utils/logger');

function validate(schema, req, res, next) {
  const { error } = schema.validate(req.body);
  if (error) {
    logger.warn(`Validation error: ${error.message}`);
    return res.status(400).json({ success: false, error: error.details[0].message });
  }
  next();
}

// Validate notification creation
const validateNotification = (req, res, next) => {
  const schema = Joi.object({
    userId: Joi.string().required(),
    type: Joi.string().valid(
      'EVENT_REMINDER',
      'INVITATION',
      'CALENDAR_SHARE',
      'SYSTEM_ALERT',
      'EVENT_UPDATE',
      'CUSTOM'
    ).required(),
    title: Joi.string().required(),
    message: Joi.string().required(),
    channels: Joi.array().items(
      Joi.string().valid('EMAIL', 'PUSH', 'SMS', 'IN_APP')
    ).min(1).required(),
    priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').default('MEDIUM'),
    metadata: Joi.object().default({})
  });
  validate(schema, req, res, next);
};

// Validate scheduled notification creation
const validateScheduledNotification = (req, res, next) => {
  const schema = Joi.object({
    userId: Joi.string().required(),
    type: Joi.string().valid(
      'EVENT_REMINDER',
      'INVITATION',
      'CALENDAR_SHARE',
      'SYSTEM_ALERT',
      'EVENT_UPDATE',
      'CUSTOM'
    ).required(),
    title: Joi.string().required(),
    message: Joi.string().required(),
    channels: Joi.array().items(
      Joi.string().valid('EMAIL', 'PUSH', 'SMS', 'IN_APP')
    ).min(1).required(),
    scheduledFor: Joi.date().iso().greater('now').required(),
    priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').default('MEDIUM'),
    metadata: Joi.object().default({})
  });
  validate(schema, req, res, next);
};

// Validate template-based notification creation
const validateTemplateNotification = (req, res, next) => {
  const schema = Joi.object({
    templateName: Joi.string().required(),
    userId: Joi.string().required(),
    data: Joi.object().default({})
  });
  validate(schema, req, res, next);
};

// Validate notification template creation/update
const validateTemplate = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    type: Joi.string().valid(
      'EVENT_REMINDER',
      'INVITATION',
      'CALENDAR_SHARE',
      'SYSTEM_ALERT',
      'EVENT_UPDATE',
      'CUSTOM'
    ).required(),
    titleTemplate: Joi.string().required(),
    messageTemplate: Joi.string().required(),
    defaultChannels: Joi.array().items(
      Joi.string().valid('EMAIL', 'PUSH', 'SMS', 'IN_APP')
    ).min(1).required(),
    defaultPriority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').default('MEDIUM'),
    variables: Joi.array().items(Joi.string()).default([]),
    active: Joi.boolean().default(true)
  });
  validate(schema, req, res, next);
};

// Validate notification preference update
const validatePreferenceUpdate = (req, res, next) => {
  const schema = Joi.object({
    channels: Joi.array().items(
      Joi.string().valid('EMAIL', 'PUSH', 'SMS', 'IN_APP')
    ).min(1).required(),
    enabled: Joi.boolean().required(),
    quiet: Joi.boolean().default(false),
    quietStartTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).when('quiet', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    quietEndTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).when('quiet', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  });
  validate(schema, req, res, next);
};

module.exports = {
  validateNotification,
  validateScheduledNotification,
  validateTemplateNotification,
  validateTemplate,
  validatePreferenceUpdate
};
