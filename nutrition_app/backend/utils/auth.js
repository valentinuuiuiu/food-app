const jwt = require('jsonwebtoken');

const generateToken = (data) => {
    return jwt.sign(
        data,
        process.env.JWT_SECRET || 'your-default-secret-key',
        { expiresIn: '24h' }
    );
};

const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET || 'your-default-secret-key');
    } catch (error) {
        throw new Error('Invalid token');
    }
};

module.exports = {
    generateToken,
    verifyToken
};
