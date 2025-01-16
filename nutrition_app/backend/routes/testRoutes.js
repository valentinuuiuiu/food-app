const express = require('express');
const router = express.Router();
const { redisClient, chromaClient } = require('../config/database');
const dataService = require('../services/dataService');

// Test Redis connection
router.get('/redis', async (req, res) => {
    try {
        const testKey = 'test:connection';
        await redisClient.set(testKey, 'Redis is working!');
        const result = await redisClient.get(testKey);
        await redisClient.del(testKey);
        res.json({ status: 'success', message: result });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Test ChromaDB connection
router.get('/chroma', async (req, res) => {
    try {
        const heartbeat = await chromaClient.heartbeat();
        res.json({ status: 'success', heartbeat });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Test full user creation flow
router.post('/create-test-user', async (req, res) => {
    try {
        const testUser = {
            name: 'Test User',
            age: 30,
            weight: 70,
            height: 175,
            healthConditions: ['diabetes', 'hypertension']
        };

        const user = await dataService.createUser(testUser);
        
        // Create a test health condition
        const testCondition = {
            userId: user.id,
            condition: 'diabetes',
            severity: 'moderate',
            symptoms: ['fatigue', 'thirst']
        };

        const condition = await dataService.createHealthCondition(testCondition);

        res.json({
            status: 'success',
            user,
            condition,
            message: 'Test user and condition created successfully'
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Test semantic search
router.get('/test-search', async (req, res) => {
    try {
        const searchResults = await dataService.searchUsersByHealthProfile('diabetes patient with hypertension');
        res.json({
            status: 'success',
            results: searchResults
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

module.exports = router;
