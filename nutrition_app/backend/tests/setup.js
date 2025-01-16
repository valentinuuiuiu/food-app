require('dotenv').config();

// Mock Redis client
jest.mock('../config/database', () => ({
    redisClient: {
        get: jest.fn(),
        setEx: jest.fn(),
        flushAll: jest.fn(),
        connect: jest.fn()
    },
    connectDB: jest.fn()
}));

// Mock external APIs
jest.mock('axios');

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';

// Global test timeout
jest.setTimeout(30000); // 30 seconds

// Global beforeEach - Clear all mocks
beforeEach(() => {
    jest.clearAllMocks();
});

// Global afterAll - Clean up
afterAll(async () => {
    // Ensure all pending timeouts are cleared
    jest.useRealTimers();
});

// Error handler for unhandled promises
process.on('unhandledRejection', (error) => {
    console.error('Unhandled Promise Rejection:', error);
});
