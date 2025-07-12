const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const eventRoutes = require('./routes/event');
const taskRoutes = require('./routes/taskRoutes');
const healthRoutes = require('./routes/health');

function createServer() {
    const app = express();

    // Middleware
    app.use(helmet());
    app.use(cors());
    app.use(express.json());

    // Log requests
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
        next();
    });

    // Routes
    app.use('/events', eventRoutes);
    app.use('/tasks', taskRoutes);
    app.use('/health', healthRoutes);

    // Error handling middleware
    app.use((err, req, res, next) => {
        console.error(err.stack);
        res.status(500).json({ error: 'Something went wrong!' });
    });

    return app;
}

// Start server only if this file is run directly (not imported for testing)
const PORT = process.env.PORT || 3004;
if (require.main === module) {
    const app = createServer();
    app.listen(PORT, () => {
        console.log(`Event service running on port ${PORT}`);
    });
}

module.exports = createServer; // Export the app creation function for testing