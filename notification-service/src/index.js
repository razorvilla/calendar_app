const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const { schema } = require('./graphql/schema');
const logger = require('./utils/logger');
const errorHandler = require('./utils/errorHandler');
const notificationRoutes = require('./api/routes/notification');
const { connectDB } = require('./config/db');
const eventListener = require('./services/eventListener');
const { startScheduler } = require('./controllers/scheduler');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// REST API routes
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handling middleware
app.use(errorHandler);

// Initialize Apollo Server for GraphQL
async function startApolloServer() {
  const server = new ApolloServer({
    schema,
    context: ({ req }) => {
      // Extract auth token from headers for use in resolvers
      const token = req.headers.authorization || '';
      return { token };
    },
    formatError: (error) => {
      logger.error(`GraphQL Error: ${error.message}`, { stack: error.stack });
      return error;
    },
  });
  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });
  return server;
}

// Start the server
async function startServer() {
  try {
    // Connect to database
    await connectDB();

    // Start Apollo Server
    await startApolloServer();

    // Initialize event listeners for other services
    eventListener.initialize();

    // Start notification scheduler
    startScheduler();

    // Start Express server
    const PORT = process.env.PORT || 4003;
    app.listen(PORT, () => {
      logger.info(`Notification service running on port ${PORT}`);
      logger.info(`GraphQL endpoint available at /graphql`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`, { stack: error.stack });
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`, { stack: error.stack });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

// Start the server
startServer();

module.exports = app; // Export for testing
