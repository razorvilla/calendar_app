const dotenv = require('dotenv');
const logger = require('../utils/logger');

// Load environment variables
dotenv.config();

// Define config object
const config = {
  port: process.env.PORT || 4003,
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',

  // Database
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/notification-service',
    options: {},
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-default-jwt-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },

  // API Keys
  apiKeys: {
    services: (process.env.SERVICE_API_KEYS || '').split(','),
    webhooks: (process.env.WEBHOOK_API_KEYS || '').split(','),
  },

  // Email
  email: {
    enabled: process.env.ENABLE_EMAIL === 'true',
    host: process.env.EMAIL_HOST || 'smtp.example.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER || 'user@example.com',
      pass: process.env.EMAIL_PASSWORD || 'password',
    },
    from: process.env.EMAIL_FROM || '"Calendar App" <notifications@calendar-app.com>',
  },

  // Push notifications
  push: {
    enabled: process.env.ENABLE_PUSH === 'true',
    firebase: {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY,
    },
  },

  // SMS
  sms: {
    enabled: process.env.ENABLE_SMS === 'true',
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    },
  },

  // Kafka
  kafka: {
    enabled: process.env.ENABLE_KAFKA === 'true',
    clientId: process.env.KAFKA_CLIENT_ID || 'notification-service',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    groupId: process.env.KAFKA_GROUP_ID || 'notification-service-group',
  },
};

// Validate critical configuration
function validateConfig() {
  const missingEnvVars = [];

  if (process.env.NODE_ENV === 'production') {
    // In production, ensure we have proper secrets and configs
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-default-jwt-secret') {
      missingEnvVars.push('JWT_SECRET');
    }
    if (!process.env.MONGODB_URI) {
      missingEnvVars.push('MONGODB_URI');
    }
  }

  // If services enabled, check required configs
  if (config.email.enabled) {
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      missingEnvVars.push('EMAIL_* (required when ENABLE_EMAIL=true)');
    }
  }
  if (config.push.enabled) {
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
      missingEnvVars.push('FIREBASE_* (required when ENABLE_PUSH=true)');
    }
  }
  if (config.sms.enabled) {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      missingEnvVars.push('TWILIO_* (required when ENABLE_SMS=true)');
    }
  }
  if (config.kafka.enabled) {
    if (!process.env.KAFKA_BROKERS) {
      missingEnvVars.push('KAFKA_BROKERS (required when ENABLE_KAFKA=true)');
    }
  }

  if (missingEnvVars.length > 0) {
    logger.warn(`Missing environment variables: ${missingEnvVars.join(', ')}`);
    if (process.env.NODE_ENV === 'production') {
      logger.error('Missing critical environment variables in production mode');
      process.exit(1);
    }
  }
}

// Validate config on load
validateConfig();

module.exports = config;
