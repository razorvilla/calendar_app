const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
    // This should ideally use a secret from environment variables
    return jwt.sign({ userId }, 'supersecretjwtkey', { expiresIn: '1h' });
};

module.exports = {
    generateToken,
};