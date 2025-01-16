const { redisClient, chromaClient } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class DataService {
    constructor() {
        this.initialize();
    }

    async initialize() {
        try {
            // We'll create collections when needed instead of at startup
            console.log('Data service initialized');
        } catch (error) {
            console.error('Error initializing data service:', error);
            throw error;
        }
    }

    // Helper method to convert object to Redis hash
    _objectToHash(obj) {
        const hash = {};
        for (const [key, value] of Object.entries(obj)) {
            hash[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
        }
        return hash;
    }

    // Helper method to convert Redis hash to object
    _hashToObject(hash) {
        const obj = {};
        for (const [key, value] of Object.entries(hash)) {
            try {
                obj[key] = JSON.parse(value);
            } catch {
                obj[key] = value;
            }
        }
        return obj;
    }

    // User Methods
    async createUser(userData) {
        try {
            const userId = uuidv4();
            const data = {
                ...userData,
                id: userId,
                createdAt: new Date().toISOString()
            };

            // Store in Redis
            await redisClient.hSet(`user:${userId}`, this._objectToHash(data));

            // Store in ChromaDB for semantic search
            try {
                const collection = await chromaClient.getOrCreateCollection({
                    name: 'users',
                    metadata: { description: "User profiles for semantic search" }
                });
                
                await collection.add({
                    ids: [userId],
                    metadatas: [data],
                    documents: [JSON.stringify(userData)]
                });
            } catch (error) {
                console.warn('ChromaDB storage failed:', error);
                // Continue anyway as Redis is our primary storage
            }

            return data;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    async getUser(userId) {
        try {
            const userData = await redisClient.hGetAll(`user:${userId}`);
            if (!userData || Object.keys(userData).length === 0) {
                return null;
            }
            return this._hashToObject(userData);
        } catch (error) {
            console.error('Error getting user:', error);
            throw error;
        }
    }

    async updateUser(userId, userData) {
        try {
            const exists = await redisClient.exists(`user:${userId}`);
            if (!exists) {
                return null;
            }

            const data = {
                ...userData,
                id: userId,
                updatedAt: new Date().toISOString()
            };

            // Update Redis
            await redisClient.hSet(`user:${userId}`, this._objectToHash(data));

            // Update ChromaDB
            try {
                const collection = await chromaClient.getOrCreateCollection({
                    name: 'users',
                    metadata: { description: "User profiles for semantic search" }
                });

                await collection.update({
                    ids: [userId],
                    metadatas: [data],
                    documents: [JSON.stringify(userData)]
                });
            } catch (error) {
                console.warn('ChromaDB update failed:', error);
                // Continue anyway as Redis is our primary storage
            }

            return data;
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    // Health Condition Methods
    async createHealthCondition(conditionData) {
        try {
            const conditionId = uuidv4();
            const data = {
                ...conditionData,
                id: conditionId,
                createdAt: new Date().toISOString()
            };

            // Store in Redis
            await redisClient.hSet(`condition:${conditionId}`, this._objectToHash(data));
            await redisClient.sAdd(`user:${conditionData.userId}:conditions`, conditionId);

            // Store in ChromaDB for semantic search
            try {
                const collection = await chromaClient.getOrCreateCollection({
                    name: 'health_conditions',
                    metadata: { description: "Health conditions for semantic search" }
                });

                await collection.add({
                    ids: [conditionId],
                    metadatas: [data],
                    documents: [JSON.stringify(conditionData)]
                });
            } catch (error) {
                console.warn('ChromaDB storage failed:', error);
                // Continue anyway as Redis is our primary storage
            }

            return data;
        } catch (error) {
            console.error('Error creating health condition:', error);
            throw error;
        }
    }

    async getUserHealthConditions(userId) {
        try {
            // Get condition IDs from Redis
            const conditionIds = await redisClient.sMembers(`user:${userId}:conditions`);
            if (!conditionIds.length) {
                return [];
            }

            // Get condition details
            const conditions = await Promise.all(
                conditionIds.map(id => redisClient.hGetAll(`condition:${id}`))
            );

            return conditions
                .filter(condition => Object.keys(condition).length > 0)
                .map(condition => this._hashToObject(condition));
        } catch (error) {
            console.error('Error getting health conditions:', error);
            throw error;
        }
    }

    // Semantic Search Methods
    async searchUsersByHealthProfile(query) {
        try {
            const collection = await chromaClient.getOrCreateCollection({
                name: 'users',
                metadata: { description: "User profiles for semantic search" }
            });

            const results = await collection.query({
                queryTexts: [query],
                nResults: 5
            });
            return results;
        } catch (error) {
            console.error('Error searching users:', error);
            return { ids: [], metadatas: [], documents: [] };
        }
    }

    async searchHealthConditions(query) {
        try {
            const collection = await chromaClient.getOrCreateCollection({
                name: 'health_conditions',
                metadata: { description: "Health conditions for semantic search" }
            });

            const results = await collection.query({
                queryTexts: [query],
                nResults: 5
            });
            return results;
        } catch (error) {
            console.error('Error searching health conditions:', error);
            return { ids: [], metadatas: [], documents: [] };
        }
    }
}

module.exports = new DataService();
