const axios = require('axios');
require('dotenv').config();

class AIService {
    constructor() {
        this.client = axios.create({
            baseURL: 'https://api.deepseek.com/v1',
            headers: {
                'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000 // 30 second timeout
        });
        this.model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
        console.log('AIService initialized with:');
        console.log('- API Key:', process.env.DEEPSEEK_API_KEY ? '****' + process.env.DEEPSEEK_API_KEY.slice(-4) : 'not set');
        console.log('- Model:', this.model);
        console.log('- Base URL:', 'https://api.deepseek.com/v1');
    }

    async generateResponse(text, context = null) {
        try {
            console.log('\n=== Generating AI Response ===');
            console.log('Input text:', text);

            const messages = [
                {
                    role: 'system',
                    content: 'You are a helpful nutrition and diet assistant. Provide concise, practical advice about nutrition, diet, and healthy eating habits.'
                },
                {
                    role: 'user',
                    content: text
                }
            ];

            console.log('\nSending request to Deepseek API with config:');
            console.log('- URL:', '/chat/completions');
            console.log('- Model:', this.model);
            console.log('- Messages:', JSON.stringify(messages, null, 2));

            const response = await this.client.post('/chat/completions', {
                model: this.model,
                messages: messages,
                temperature: 0.7,
                max_tokens: 150
            });

            console.log('\nReceived response from Deepseek:');
            console.log(JSON.stringify(response.data, null, 2));

            if (!response.data?.choices?.[0]?.message?.content) {
                console.error('Invalid response format. Expected choices[0].message.content but got:', response.data);
                throw new Error('Invalid response format from AI service');
            }

            const responseText = response.data.choices[0].message.content;
            const isNutritionRelated = text.toLowerCase().includes('diet') || 
                                     text.toLowerCase().includes('eat') || 
                                     text.toLowerCase().includes('food') ||
                                     text.toLowerCase().includes('nutrition');

            const result = {
                text: responseText,
                type: isNutritionRelated ? 'dietary' : 'text'
            };

            console.log('\nFinal response:', result);
            return result;

        } catch (error) {
            console.error('\n=== AI Service Error ===');
            console.error('Error generating response for text:', text);
            
            if (error.response) {
                console.error('API Response Error:');
                console.error('- Status:', error.response.status);
                console.error('- Data:', JSON.stringify(error.response.data, null, 2));
                console.error('- Headers:', JSON.stringify(error.response.headers, null, 2));
            } else if (error.request) {
                console.error('No response received from API:');
                console.error(error.request);
            } else {
                console.error('Error before making request:');
                console.error(error.message);
            }

            if (error.config) {
                console.error('\nRequest Config:');
                console.error('- URL:', error.config.url);
                console.error('- Method:', error.config.method);
                console.error('- Headers:', JSON.stringify(error.config.headers, null, 2));
                console.error('- Data:', JSON.stringify(error.config.data, null, 2));
            }

            throw new Error('Failed to generate response from AI service: ' + error.message);
        }
    }

    async generateChatResponse(message, userContext) {
        try {
            console.log('Generating chat response for message:', message);
            console.log('User context:', JSON.stringify(userContext, null, 2));

            const systemMessage = `You are a helpful nutrition and diet assistant. 
            User's health profile: Height: ${userContext.healthProfile?.height}cm, 
            Weight: ${userContext.healthProfile?.weight}kg, 
            Age: ${userContext.healthProfile?.age}, 
            Gender: ${userContext.healthProfile?.gender}, 
            Activity Level: ${userContext.healthProfile?.activityLevel}.
            Dietary restrictions: ${userContext.preferences?.dietaryRestrictions?.join(', ') || 'None'}.
            Allergies: ${userContext.preferences?.allergies?.join(', ') || 'None'}.
            Provide personalized nutrition advice based on this context.`;

            const messages = [
                {
                    role: 'system',
                    content: systemMessage
                },
                {
                    role: 'user',
                    content: message
                }
            ];

            console.log('Sending request to Deepseek API with messages:', JSON.stringify(messages, null, 2));

            const response = await this.client.post('/chat/completions', {
                model: this.model,
                messages: messages,
                temperature: 0.7,
                max_tokens: 250
            });

            console.log('Received response from Deepseek:', JSON.stringify(response.data, null, 2));

            if (!response.data?.choices?.[0]?.message?.content) {
                throw new Error('Invalid response format from AI service');
            }

            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('Error in generateChatResponse:', error);
            if (error.response) {
                console.error('Response error data:', error.response.data);
                console.error('Response error status:', error.response.status);
            }
            throw error;
        }
    }

    async analyzeDiet(dietData) {
        try {
            console.log('Analyzing diet data:', JSON.stringify(dietData, null, 2));

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

            console.log('Sending request to Deepseek API with messages:', JSON.stringify(messages, null, 2));

            const response = await this.client.post('/chat/completions', {
                model: this.model,
                messages: messages,
                temperature: 0.3,
                max_tokens: 200
            });

            console.log('Received response from Deepseek:', JSON.stringify(response.data, null, 2));

            if (!response.data?.choices?.[0]?.message?.content) {
                throw new Error('Invalid response format from AI service');
            }

            return {
                analysis: response.data.choices[0].message.content,
                recommendations: this._extractRecommendations(response.data.choices[0].message.content)
            };
        } catch (error) {
            console.error('Error analyzing diet:', error);
            if (error.response) {
                console.error('Response error data:', error.response.data);
                console.error('Response error status:', error.response.status);
            }
            throw error;
        }
    }

    async generateMealPlan(preferences, healthProfile) {
        try {
            console.log('Generating meal plan for preferences:', JSON.stringify(preferences, null, 2));
            console.log('Health profile:', JSON.stringify(healthProfile, null, 2));

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

            console.log('Sending request to Deepseek API with messages:', JSON.stringify(messages, null, 2));

            const response = await this.client.post('/chat/completions', {
                model: this.model,
                messages: messages,
                temperature: 0.5,
                max_tokens: 300
            });

            console.log('Received response from Deepseek:', JSON.stringify(response.data, null, 2));

            if (!response.data?.choices?.[0]?.message?.content) {
                throw new Error('Invalid response format from AI service');
            }

            return {
                mealPlan: response.data.choices[0].message.content,
                metadata: {
                    preferences: preferences,
                    healthProfile: healthProfile
                }
            };
        } catch (error) {
            console.error('Error generating meal plan:', error);
            if (error.response) {
                console.error('Response error data:', error.response.data);
                console.error('Response error status:', error.response.status);
            }
            throw error;
        }
    }

    _extractRecommendations(analysis) {
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
