const axios = require('axios');
const { redisClient } = require('../config/database');
require('dotenv').config();

class AIService {
    constructor() {
        this.client = axios.create({
            baseURL: 'https://api.deepseek.com/v1',
            headers: {
                'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        this.model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    }

    async generateResponse(text, context = null) {
        try {
            const messages = [];
            
            // Add system message
            messages.push({
                role: 'system',
                content: 'You are a helpful nutrition and diet assistant. Provide concise, practical advice about nutrition, diet, and healthy eating habits.'
            });

            // Add context if available
            if (context && context.history) {
                messages.push(...context.history);
            }

            // Add user message
            messages.push({
                role: 'user',
                content: text
            });

            // For testing purposes, return a mock response
            if (process.env.NODE_ENV === 'test') {
                return {
                    text: "This is a test response",
                    type: "dietary"
                };
            }

            const response = await this.client.post('/chat/completions', {
                model: this.model,
                messages: messages,
                temperature: 0.7,
                max_tokens: 150
            });

            return {
                text: response.data.choices[0].message.content,
                type: 'dietary'
            };
        } catch (error) {
            console.error('Error generating response:', error);
            throw new Error('Failed to generate response');
        }
    }

    async analyzeDiet(dietData) {
        try {
            if (!dietData || typeof dietData !== 'object') {
                throw new Error('Invalid diet data');
            }

            const messages = [
                {
                    role: 'system',
                    content: 'You are a nutrition expert analyzing diet data. Provide specific, actionable insights.'
                },
                {
                    role: 'user',
                    content: `Please analyze this diet data and provide insights: ${JSON.stringify(dietData)}`
                }
            ];

            const response = await this.client.post('/chat/completions', {
                model: this.model,
                messages: messages,
                temperature: 0.3,
                max_tokens: 200
            });

            return {
                analysis: response.data.choices[0].message.content,
                recommendations: this._extractRecommendations(response.data.choices[0].message.content)
            };
        } catch (error) {
            console.error('Error analyzing diet:', error);
            throw new Error('Failed to analyze diet');
        }
    }

    async generateMealPlan(preferences, healthProfile) {
        try {
            const messages = [
                {
                    role: 'system',
                    content: 'You are a meal planning expert. Create personalized meal plans based on preferences and health data.'
                },
                {
                    role: 'user',
                    content: `Generate a meal plan based on these preferences: ${JSON.stringify(preferences)} and health profile: ${JSON.stringify(healthProfile)}`
                }
            ];

            const response = await this.client.post('/chat/completions', {
                model: this.model,
                messages: messages,
                temperature: 0.5,
                max_tokens: 300
            });

            return {
                mealPlan: response.data.choices[0].message.content,
                metadata: {
                    preferences: preferences,
                    healthProfile: healthProfile
                }
            };
        } catch (error) {
            console.error('Error generating meal plan:', error);
            throw new Error('Failed to generate meal plan');
        }
    }

    _extractRecommendations(analysis) {
        // Simple extraction of recommendations from the analysis text
        const recommendations = [];
        const lines = analysis.split('\n');
        
        for (const line of lines) {
            if (line.toLowerCase().includes('recommend') || 
                line.toLowerCase().includes('suggest') ||
                line.toLowerCase().includes('should')) {
                recommendations.push(line.trim());
            }
        }
        
        return recommendations;
    }
}

module.exports = new AIService();
