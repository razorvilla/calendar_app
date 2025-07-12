// auth-service/src/index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const healthRoutes = require('./routes/health');

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
app.use('/auth', authRoutes);
app.use('/health', healthRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
module.exports = app;

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Auth Service running on port ${PORT}`);
});