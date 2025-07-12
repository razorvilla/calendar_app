const mongoose = require('mongoose');
const config = require('./index');
const logger = require('../utils/logger');

/**
 * Connect to MongoDB
 */
async function connectDB() {
  try {
    await mongoose.connect(config.mongodb.uri, config.mongodb.options);
    logger.info('MongoDB connected successfully');
    return mongoose.connection;
  } catch (error) {
    logger.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Disconnect from MongoDB
 */
async function disconnectDB() {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected successfully');
  } catch (error) {
    logger.error(`MongoDB disconnection error: ${error.message}`);
  }
}

module.exports = {
  connectDB,
  disconnectDB
};
