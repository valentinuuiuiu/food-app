const aiService = require('./aiService');
const dataService = require('./dataService');

class ChatbotService {
    constructor() {
        this.context = new Map();
        console.log('ChatbotService initialized');
    }

    async processUserMessage(message) {
        try {
            console.log('\n=== Processing User Message ===');
            console.log('Input message:', message);

            const text = typeof message === 'string' ? message : message.text;
            console.log('Extracted text:', text);

            const context = message.context || {};

            // Handle dietary questions
            if (text.toLowerCase().includes('diet') || 
                text.toLowerCase().includes('eat') || 
                text.toLowerCase().includes('food')) {
                console.log('\nHandling dietary question...');
                const response = await aiService.generateResponse(text, context);
                console.log('AI service response:', response);
                return {
                    text: response.text,
                    type: response.type || 'dietary'
                };
            }

            // Handle nutrition queries
            if (this._isNutritionQuery(text)) {
                console.log('\nHandling nutrition query...');
                return await this.handleNutritionQuery(text);
            }

            // Default response using AI
            console.log('\nCalling AI service...');
            const response = await aiService.generateResponse(text, context);
            console.log('AI service response:', response);
            return {
                text: response.text || response,
                type: response.type || 'text'
            };
        } catch (error) {
            console.error('\n=== Chatbot Service Error ===');
            console.error('Error processing message:', error);
            console.error('Stack trace:', error.stack);
            return {
                text: 'Sorry, I encountered an error processing your message. Please try again later.',
                type: 'error'
            };
        }
    }

    async generateDietaryAdvice() {
        try {
            console.log('\nGenerating dietary advice...');
            const userPrefs = await dataService.getUserPreferences();
            const healthProfile = await dataService.getUserHealthProfile();

            if (!userPrefs || !healthProfile) {
                console.log('No user preferences or health profile found.');
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

            console.log('Dietary advice generated.');
            return {
                recommendations,
                restrictions
            };
        } catch (error) {
            console.error('\n=== Chatbot Service Error ===');
            console.error('Error generating dietary advice:', error);
            console.error('Stack trace:', error.stack);
            return {
                recommendations: [],
                restrictions: []
            };
        }
    }

    _isNutritionQuery(text) {
        console.log('\nChecking if message is a nutrition query...');
        const nutritionKeywords = ['calories', 'nutrition', 'protein', 'carbs', 'fat', 'vitamins'];
        return nutritionKeywords.some(keyword => text.toLowerCase().includes(keyword));
    }

    async handleNutritionQuery(text) {
        try {
            console.log('\nHandling nutrition query...');
            // Extract food item from query
            const foodItem = this._extractFoodItem(text);
            if (!foodItem) {
                console.log('No food item found in query.');
                return {
                    text: "I couldn't identify a food item in your question. Please specify a food item.",
                    type: 'text'
                };
            }

            const nutritionInfo = await dataService.getNutritionalInfo(foodItem);
            if (!nutritionInfo || !nutritionInfo.nutritionalInfo) {
                console.log('No nutritional information found for food item.');
                return {
                    text: `Sorry, I couldn't find nutritional information for ${foodItem}`,
                    type: 'error'
                };
            }

            const { calories, protein, carbohydrates, fat } = nutritionInfo.nutritionalInfo;
            console.log('Nutritional information found.');
            return {
                text: `Here's the nutritional information for ${foodItem}: ${calories} calories, ${protein}g protein, ${carbohydrates}g carbs, and ${fat}g fat.`,
                type: 'nutrition_info'
            };
        } catch (error) {
            console.error('\n=== Chatbot Service Error ===');
            console.error('Error handling nutrition query:', error);
            console.error('Stack trace:', error.stack);
            return {
                text: 'Sorry, I encountered an error fetching nutritional information.',
                type: 'error'
            };
        }
    }

    _extractFoodItem(text) {
        console.log('\nExtracting food item from query...');
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
        console.log('Food item extracted:', foodItem);
        return foodItem ? foodItem.replace(/[?!.,]/g, '') : null;
    }

    async getChatHistory(userId) {
        try {
            console.log('\nGetting chat history...');
            const userContext = this.context.get(userId) || { history: [] };
            return userContext.history;
        } catch (error) {
            console.error('\n=== Chatbot Service Error ===');
            console.error('Error getting chat history:', error);
            console.error('Stack trace:', error.stack);
            throw new Error('Failed to get chat history');
        }
    }
}

module.exports = new ChatbotService();
