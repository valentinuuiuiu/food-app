const express = require('express');
const router = express.Router();
const medicalDataService = require('../services/medicalDataService');
const rateLimit = require('express-rate-limit');
const { authenticateToken } = require('../middleware/auth');

// Rate limiting to prevent abuse of the scraping endpoints
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

// Apply rate limiting to all routes
router.use(limiter);

// Search for rare disease information
router.get('/disease/:name', async (req, res) => {
    try {
        const diseaseName = req.params.name;
        const diseaseInfo = await medicalDataService.searchRareDisease(diseaseName);
        res.json(diseaseInfo);
    } catch (error) {
        console.error('Error fetching disease information:', error);
        res.status(500).json({ 
            error: 'Failed to fetch disease information',
            message: error.message 
        });
    }
});

// Get dietary analysis for a disease
router.get('/disease/:name/diet', async (req, res) => {
    try {
        const diseaseName = req.params.name;
        const diseaseInfo = await medicalDataService.searchRareDisease(diseaseName);
        const dietaryAnalysis = await medicalDataService.analyzeDietaryNeeds(diseaseInfo);
        res.json(dietaryAnalysis);
    } catch (error) {
        console.error('Error analyzing dietary needs:', error);
        res.status(500).json({ 
            error: 'Failed to analyze dietary needs',
            message: error.message 
        });
    }
});

// Get medical condition information
router.get('/condition/:name?', authenticateToken, async (req, res) => {
    const { name } = req.params;
    
    if (!name) {
        return res.status(404).json({ error: 'Condition name is required' });
    }

    try {
        const conditionInfo = await medicalDataService.getConditionInfo(name);
        if (!conditionInfo) {
            return res.status(404).json({ error: 'Condition not found' });
        }
        res.json(conditionInfo);
    } catch (error) {
        console.error('Error fetching condition information:', error);
        res.status(500).json({ 
            error: 'Failed to fetch condition information',
            message: error.message 
        });
    }
});

// Analyze diet based on medical conditions
router.post('/analyze-diet', authenticateToken, async (req, res) => {
    try {
        const { diet, conditions } = req.body;
        
        if (!diet || !conditions) {
            return res.status(400).json({ error: 'Diet and conditions are required' });
        }

        const analysis = await medicalDataService.analyzeDietaryNeeds({ diet, conditions });
        res.json(analysis);
    } catch (error) {
        console.error('Error analyzing dietary needs:', error);
        res.status(500).json({ 
            error: 'Failed to analyze dietary needs',
            message: error.message 
        });
    }
});

// Get nutritional information for a food item
router.get('/food/:name', authenticateToken, async (req, res) => {
    const { name } = req.params;
    
    if (!name) {
        return res.status(404).json({ error: 'Food name is required' });
    }

    try {
        const nutritionalInfo = await medicalDataService.getNutritionalInfo(name);
        if (!nutritionalInfo) {
            return res.status(404).json({ error: 'Food not found' });
        }
        res.json(nutritionalInfo);
    } catch (error) {
        console.error('Error fetching nutritional information:', error);
        res.status(500).json({ 
            error: 'Failed to fetch nutritional information',
            message: error.message 
        });
    }
});

// Error handling middleware
router.use((err, req, res, next) => {
    console.error('Medical routes error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

module.exports = router;
