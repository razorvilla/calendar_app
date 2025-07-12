const pool = require('../db/pool');

/**
 * Check service health
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const checkHealth = async (req, res) => {
    try {
        // Check database connection
        await pool.query('SELECT 1');

        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'calendar-service'
        });
    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            service: 'calendar-service',
            error: error.message
        });
    }
};

module.exports = {
    checkHealth
};