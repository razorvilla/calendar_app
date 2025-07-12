const authenticate = (req, res, next) => {
    const userIdHeader = req.headers['x-user-id'];

    if (!userIdHeader) {
        return res.status(401).json({ error: 'Authentication required: X-User-ID header missing' });
    }

    req.user = { userId: userIdHeader };
    next();
};

module.exports = {
    authenticate
};