const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();
const calendarRoutes = require('./routes/calendar');
const healthRoutes = require('./routes/health');
const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});
app.use('/calendars', calendarRoutes);
app.use('/health', healthRoutes);
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});
const PORT = process.env.PORT || 3003;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Calendar service running on port ${PORT}`);
    });
}

module.exports = app;