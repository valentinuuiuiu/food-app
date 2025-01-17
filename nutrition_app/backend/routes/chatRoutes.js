const express = require('express');
const router = express.Router();
const chatbotService = require('../services/chatbotService');

// Test endpoint for environment variables
router.get('/test', (req, res) => {
    res.json({
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT,
        apiKeySet: !!process.env.DEEPSEEK_API_KEY,
        model: process.env.DEEPSEEK_MODEL
    });
});

// Process chat message
router.post('/message', async (req, res) => {
    try {
        const { text } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'Message text is required' });
        }

        const response = await chatbotService.processUserMessage({ text });
        res.json(response);
    } catch (error) {
        console.error('Error processing chat message:', error);
        res.status(500).json({ 
            error: 'Failed to process message',
            message: error.message 
        });
    }
});

// Get chat history
router.get('/history', async (req, res) => {
    try {
        // Return empty history for now
        res.json([]);
    } catch (error) {
        console.error('Error fetching chat history:', error);
        res.status(500).json({ 
            error: 'Failed to fetch chat history',
            message: error.message 
        });
    }
});

module.exports = router;
