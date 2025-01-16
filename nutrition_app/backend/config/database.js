const { ChromaClient } = require('chromadb');
const Redis = require('redis');
require('dotenv').config();

// Initialize Redis client with retry strategy
const redisClient = Redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
        reconnectStrategy: (retries) => {
            if (retries > 10) {
                console.error('Redis connection failed after 10 retries');
                return new Error('Redis connection failed');
            }
            return Math.min(retries * 100, 3000);
        }
    }
});

redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisClient.on('connect', () => console.log('Redis Client Connected'));
redisClient.on('ready', () => console.log('Redis Client Ready'));
redisClient.on('reconnecting', () => console.log('Redis Client Reconnecting'));

// Initialize ChromaDB client
const chromaClient = new ChromaClient({
    path: process.env.CHROMA_URL || 'http://localhost:8000'
});

const connectDB = async () => {
    try {
        // Connect to Redis
        await redisClient.connect();
        
        // Test ChromaDB connection and ensure collection exists
        const collections = await chromaClient.listCollections();
        if (!collections.find(c => c.name === 'nutrition_data')) {
            try {
                await chromaClient.createCollection({
                    name: 'nutrition_data',
                    metadata: { description: 'Collection for nutrition and diet data' }
                });
                console.log('Created nutrition_data collection');
            } catch (error) {
                if (!error.message?.includes('already exists')) {
                    throw error;
                }
                console.log('Using existing nutrition_data collection');
            }
        }
        
        console.log('Database connections established');
    } catch (error) {
        console.error('Error connecting to databases:', error);
        throw error;
    }
};

const closeConnections = async () => {
    try {
        await redisClient.quit();
        console.log('Database connections closed');
    } catch (error) {
        console.error('Error closing database connections:', error);
        throw error;
    }
};

// Handle process termination
process.on('SIGINT', async () => {
    await closeConnections();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await closeConnections();
    process.exit(0);
});

module.exports = {
    redisClient,
    chromaClient,
    connectDB,
    closeConnections
};
