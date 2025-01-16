const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { redisClient } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const userKey = `user:${req.user.id}`;
        const userData = await redisClient.hGetAll(userKey);
        
        if (!userData || Object.keys(userData).length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Remove password from response
        const { password, ...userWithoutPassword } = userData;
        res.json(userWithoutPassword);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const userKey = `user:${req.user.id}`;
        const userData = await redisClient.hGetAll(userKey);
        
        if (!userData || Object.keys(userData).length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update user data
        const updates = { ...req.body };
        delete updates.password; // Don't allow password updates through this route
        
        await redisClient.hSet(userKey, updates);
        
        // Get updated user data
        const updatedUserData = await redisClient.hGetAll(userKey);
        const { password, ...userWithoutPassword } = updatedUserData;
        
        res.json(userWithoutPassword);
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get user health profile
router.get('/health-profile', authenticateToken, async (req, res) => {
    try {
        const userKey = `user:${req.user.id}`;
        const userData = await redisClient.hGetAll(userKey);
        
        if (!userData || Object.keys(userData).length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const healthProfile = JSON.parse(userData.healthProfile);
        res.json({ healthProfile });
    } catch (error) {
        console.error('Error fetching health profile:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update health profile
router.put('/health-profile', authenticateToken, async (req, res) => {
    try {
        const userKey = `user:${req.user.id}`;
        const userData = await redisClient.hGetAll(userKey);
        
        if (!userData || Object.keys(userData).length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Validate required fields
        const { age, weight, height, activityLevel } = req.body;
        if (!age || !weight || !height || !activityLevel) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const healthProfile = JSON.parse(userData.healthProfile);
        healthProfile.age = age;
        healthProfile.weight = weight;
        healthProfile.height = height;
        healthProfile.activityLevel = activityLevel;

        await redisClient.hSet(userKey, 'healthProfile', JSON.stringify(healthProfile));

        res.json({ healthProfile });
    } catch (error) {
        console.error('Error updating health profile:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get user preferences
router.get('/preferences', authenticateToken, async (req, res) => {
    try {
        const userKey = `user:${req.user.id}`;
        const userData = await redisClient.hGetAll(userKey);
        
        if (!userData || Object.keys(userData).length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const preferences = JSON.parse(userData.preferences);
        res.json(preferences);
    } catch (error) {
        console.error('Error fetching preferences:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update preferences
router.put('/preferences', authenticateToken, async (req, res) => {
    try {
        const userKey = `user:${req.user.id}`;
        const userData = await redisClient.hGetAll(userKey);
        
        if (!userData || Object.keys(userData).length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const preferences = JSON.parse(userData.preferences);
        const updatedPreferences = { ...preferences, ...req.body };

        await redisClient.hSet(userKey, 'preferences', JSON.stringify(updatedPreferences));

        res.json(updatedPreferences);
    } catch (error) {
        console.error('Error updating preferences:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if user exists
        const existingUser = await redisClient.hGet('users:email', email);
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate user ID
        const userId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Create user in Redis
        const userKey = `user:${userId}`;
        await redisClient.hSet(userKey, {
            id: userId,
            username,
            email,
            password: hashedPassword,
            preferences: JSON.stringify({}),
            healthProfile: JSON.stringify({})
        });

        // Add email to users index
        await redisClient.hSet('users:email', email, userId);

        // Create JWT token
        const token = jwt.sign(
            { id: userId, email },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.json({ token });
    } catch (error) {
        console.error('Error in user registration:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Get user by email
        const userId = await redisClient.hGet('users:email', email);
        if (!userId) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Get user data
        const userKey = `user:${userId}`;
        const userData = await redisClient.hGetAll(userKey);
        if (!userData || Object.keys(userData).length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, userData.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Create JWT token
        const token = jwt.sign(
            { id: userId, email },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.json({ token });
    } catch (error) {
        console.error('Error in user login:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
