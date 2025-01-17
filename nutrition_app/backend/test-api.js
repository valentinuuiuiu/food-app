require('dotenv').config();
const axios = require('axios');

async function testDeepseekAPI() {
    console.log('Testing Deepseek API connection...');
    console.log('API Key:', process.env.DEEPSEEK_API_KEY ? 'Present' : 'Missing');
    console.log('Model:', process.env.DEEPSEEK_MODEL || 'Missing');
    
    try {
        const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
            model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful nutrition assistant.'
                },
                {
                    role: 'user',
                    content: 'What are some healthy breakfast options?'
                }
            ]
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Success! Response:', response.data);
    } catch (error) {
        console.error('Error:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
    }
}

testDeepseekAPI();
