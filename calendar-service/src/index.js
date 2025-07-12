const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const calendarRoutes = require('./routes/calendar');
const healthRoutes = require('./routes/health');
const appointmentScheduleRoutes = require('./routes/appointmentScheduleRoutes');

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
app.use('/calendars', calendarRoutes);
app.use('/health', healthRoutes);
app.use('/appointments', appointmentScheduleRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
module.exports = app;