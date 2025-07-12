const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
    // This should ideally use a secret from environment variables
    return jwt.sign({ userId }, process.env.JWT_SECRET || 'default_jwt_secret', { expiresIn: '1h' });
};

module.exports = {
    generateToken,
};