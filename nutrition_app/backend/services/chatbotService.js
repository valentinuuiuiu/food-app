const aiService = require('./aiService');
const dataService = require('./dataService');

class ChatbotService {
    constructor() {
        this.context = new Map();
    }

    async processUserMessage(message) {
        try {
            const text = typeof message === 'string' ? message : message.text;
            const context = message.context || {};

            // Handle dietary questions
            if (text.toLowerCase().includes('diet') || 
                text.toLowerCase().includes('eat') || 
                text.toLowerCase().includes('food')) {
                const response = await aiService.generateResponse(text, context);
                return {
                    text: response.text,
                    type: response.type || 'dietary'
                };
            }

            // Handle nutrition queries
            if (this._isNutritionQuery(text)) {
                return await this.handleNutritionQuery(text);
            }

            // Default response using AI
            const response = await aiService.generateResponse(text, context);
            return {
                text: response.text || response,
                type: response.type || 'text'
            };
        } catch (error) {
            console.error('Error processing message:', error);
            return {
                text: 'Sorry, I encountered an error processing your message.',
                type: 'error'
            };
        }
    }

    async generateDietaryAdvice() {
        try {
            const userPrefs = await dataService.getUserPreferences();
            const healthProfile = await dataService.getUserHealthProfile();

            if (!userPrefs || !healthProfile) {
                return {
                    recommendations: [],
                    restrictions: []
                };
            }

            const recommendations = [
                'Maintain a balanced diet with plenty of fruits and vegetables',
                'Stay hydrated by drinking adequate water throughout the day',
                'Consider portion control for weight management'
            ];

            const restrictions = [
                ...userPrefs.dietaryRestrictions || [],
                ...healthProfile.allergies || []
            ];

            return {
                recommendations,
                restrictions
            };
        } catch (error) {
            console.error('Error generating dietary advice:', error);
            return {
                recommendations: [],
                restrictions: []
            };
        }
    }

    _isNutritionQuery(text) {
        const nutritionKeywords = ['calories', 'nutrition', 'protein', 'carbs', 'fat', 'vitamins'];
        return nutritionKeywords.some(keyword => text.toLowerCase().includes(keyword));
    }

    async handleNutritionQuery(text) {
        try {
            // Extract food item from query
            const foodItem = this._extractFoodItem(text);
            if (!foodItem) {
                return {
                    text: "I couldn't identify a food item in your question. Please specify a food item.",
                    type: 'text'
                };
            }

            const nutritionInfo = await dataService.getNutritionalInfo(foodItem);
            if (!nutritionInfo || !nutritionInfo.nutritionalInfo) {
                return {
                    text: `Sorry, I couldn't find nutritional information for ${foodItem}`,
                    type: 'error'
                };
            }

            const { calories, protein, carbohydrates, fat } = nutritionInfo.nutritionalInfo;
            return {
                text: `Here's the nutritional information for ${foodItem}: ${calories} calories, ${protein}g protein, ${carbohydrates}g carbs, and ${fat}g fat.`,
                type: 'nutrition_info'
            };
        } catch (error) {
            console.error('Error handling nutrition query:', error);
            return {
                text: 'sorry, I encountered an error fetching nutritional information.',
                type: 'error'
            };
        }
    }

    _extractFoodItem(text) {
        // Extract food item from text using various patterns
        const words = text.toLowerCase().split(' ');
        let foodItem = null;
        
        // Look for food item after "in" or "of"
        for (let i = 0; i < words.length - 1; i++) {
            if (words[i] === 'in' || words[i] === 'of') {
                if (words[i + 1] === 'a' || words[i + 1] === 'an') {
                    foodItem = words[i + 2];
                } else {
                    foodItem = words[i + 1];
                }
                break;
            }
        }

        // Look for food items after nutrition keywords
        if (!foodItem) {
            const nutritionKeywords = ['calories', 'nutrition', 'protein', 'carbs', 'fat'];
            for (const keyword of nutritionKeywords) {
                const index = words.indexOf(keyword);
                if (index !== -1 && index < words.length - 1) {
                    if (words[index + 1] === 'in' || words[index + 1] === 'of') {
                        if (words[index + 2] === 'a' || words[index + 2] === 'an') {
                            foodItem = words[index + 3];
                        } else {
                            foodItem = words[index + 2];
                        }
                    } else {
                        foodItem = words[index + 1];
                    }
                    break;
                }
            }
        }

        // Remove any punctuation from the food item
        return foodItem ? foodItem.replace(/[?!.,]/g, '') : null;
    }

    async getChatHistory(userId) {
        try {
            const userContext = this.context.get(userId) || { history: [] };
            return userContext.history;
        } catch (error) {
            console.error('Error getting chat history:', error);
            throw new Error('Failed to get chat history');
        }
    }
}

module.exports = new ChatbotService();
