const express = require('express');
const { authenticateToken } = require('../middleware/auth');

module.exports = function(aiService) {
    const router = express.Router();

    // Analyze diet
    router.post('/analyze-diet', authenticateToken, async (req, res) => {
        try {
            const { dietData } = req.body;
            if (!dietData) {
                return res.status(400).json({ error: 'Diet data is required' });
            }

            const analysis = await aiService.analyzeDiet(dietData);
            res.json(analysis);
        } catch (error) {
            console.error('Error analyzing diet:', error);
            res.status(500).json({ 
                error: 'Failed to analyze diet',
                message: error.message 
            });
        }
    });

    // Generate meal suggestions
    router.post('/meal-suggestions', authenticateToken, async (req, res) => {
        try {
            const { preferences } = req.body;
            
            if (!preferences || !preferences.diet) {
                return res.status(400).json({ error: 'Diet preferences are required' });
            }

            const userContext = {
                healthProfile: req.user.healthProfile,
                dietaryRestrictions: req.user.preferences.dietaryRestrictions
            };

            const suggestions = await aiService.generateMealSuggestions(preferences, userContext);
            res.json(suggestions);
        } catch (error) {
            console.error('Error generating meal suggestions:', error);
            res.status(500).json({ error: 'Failed to generate meal suggestions' });
        }
    });

    // Get diet recommendations
    router.post('/diet-recommendations', authenticateToken, async (req, res) => {
        try {
            const { conditions, goals } = req.body;
            if (!conditions && !goals) {
                return res.status(400).json({ error: 'Conditions or goals are required' });
            }

            const recommendations = await aiService.generateDietRecommendations(req.user.healthProfile, conditions);
            res.json(recommendations);
        } catch (error) {
            console.error('Error generating diet recommendations:', error);
            res.status(500).json({ 
                error: 'Failed to generate diet recommendations',
                message: error.message 
            });
        }
    });

    // Analyze nutritional value
    router.post('/analyze-nutritional-value', authenticateToken, async (req, res) => {
        try {
            const { food } = req.body;
            if (!food) {
                return res.status(400).json({ error: 'Food item is required' });
            }

            const nutritionalValue = await aiService.analyzeNutritionalValue(food);
            res.json(nutritionalValue);
        } catch (error) {
            console.error('Error analyzing nutritional value:', error);
            res.status(500).json({ 
                error: 'Failed to analyze nutritional value',
                message: error.message 
            });
        }
    });

    return router;
};
