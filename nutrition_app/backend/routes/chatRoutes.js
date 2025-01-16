const express = require('express');
const router = express.Router();
const chatbotService = require('../services/chatbotService');
const { authenticateToken } = require('../middleware/auth');

// Process chat message
router.post('/message', authenticateToken, async (req, res) => {
    try {
        const { text, userId, context } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'Message text is required' });
        }

        const response = await chatbotService.processUserMessage({ text, userId, context });
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
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const history = await chatbotService.getChatHistory(userId);
        res.json(history);
    } catch (error) {
        console.error('Error fetching chat history:', error);
        res.status(500).json({ 
            error: 'Failed to fetch chat history',
            message: error.message 
        });
    }
});

module.exports = router;
