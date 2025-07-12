const jwt = require('jsonwebtoken');
const logger = require('../../utils/logger');

/**
 * Authenticate JWT token
 */
function authenticate(req, res, next) {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Authorization token is required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    logger.error(`Authentication error: ${error.message}`);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }
    res.status(401).json({ success: false, error: 'Authentication failed' });
  }
}

/**
 * Authorize admin users
 */
function authorizeAdmin(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authorization required' });
    }

    // Check if user has admin role
    if (!req.user.roles || !req.user.roles.includes('admin')) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    next();
  } catch (error) {
    logger.error(`Admin authorization error: ${error.message}`);
    res.status(403).json({ success: false, error: 'Admin authorization failed' });
  }
}

/**
 * Authorize internal service requests
 */
function authorizeService(req, res, next) {
  try {
    // Check for service API key
    const serviceKey = req.headers['x-service-key'];

    if (!serviceKey) {
      // If no service key, fall back to normal user authentication
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authorization required' });
      }
      // Check if user has appropriate role (e.g., internal service role)
      if (!req.user.roles || !req.user.roles.includes('internal-service')) {
        return res.status(403).json({ success: false, error: 'Not authorized for this operation' });
      }
    } else {
      // Validate service key
      const validServiceKeys = (process.env.SERVICE_API_KEYS || '').split(',');
      if (!validServiceKeys.includes(serviceKey)) {
        return res.status(403).json({ success: false, error: 'Invalid service key' });
      }
    }
    next();
  } catch (error) {
    logger.error(`Service authorization error: ${error.message}`);
    res.status(403).json({ success: false, error: 'Service authorization failed' });
  }
}

/**
 * Validate API key for webhooks and external integrations
 */
function validateApiKey(req, res, next) {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({ success: false, error: 'API key required' });
    }

    const validApiKeys = (process.env.WEBHOOK_API_KEYS || '').split(',');
    if (!validApiKeys.includes(apiKey)) {
      return res.status(403).json({ success: false, error: 'Invalid API key' });
    }
    next();
  } catch (error) {
    logger.error(`API key validation error: ${error.message}`);
    res.status(403).json({ success: false, error: 'API key validation failed' });
  }
}

module.exports = {
  authenticate,
  authorizeAdmin,
  authorizeService,
  validateApiKey
};
