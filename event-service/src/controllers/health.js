const pool = require('../db/pool');
const checkHealth = async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'event-service'
        });
    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            service: 'event-service',
            error: error.message
        });
    }
};
module.exports = {
    checkHealth
};