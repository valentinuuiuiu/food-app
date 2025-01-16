const chatbotService = require('../services/chatbotService');
const aiService = require('../services/aiService');
const dataService = require('../services/dataService');
const { redisClient } = require('../config/database');

// Mock dependencies
jest.mock('../services/aiService', () => ({
    generateResponse: jest.fn(),
    generateDietRecommendations: jest.fn(),
    analyzeDiet: jest.fn()
}));

jest.mock('../services/dataService', () => ({
    getNutritionalInfo: jest.fn(),
    getUserPreferences: jest.fn(),
    getUserHealthProfile: jest.fn()
}));

jest.mock('../config/database', () => ({
    redisClient: {
        get: jest.fn(),
        setEx: jest.fn(),
    }
}));

describe('Chatbot Service Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Setup default mocks
        aiService.generateResponse.mockResolvedValue('This is a test response');
        aiService.generateDietRecommendations.mockResolvedValue({
            recommendations: ['Eat more vegetables', 'Avoid sugary foods'],
            restrictions: ['sugar', 'processed foods']
        });
        dataService.getNutritionalInfo.mockResolvedValue({
            name: 'Apple',
            nutritionalInfo: {
                calories: 95,
                protein: 0.5,
                carbohydrates: 25,
                fat: 0.3,
                fiber: 4.4,
                sodium: 2
            }
        });
        dataService.getUserPreferences.mockResolvedValue({
            dietaryRestrictions: ['dairy'],
            foodPreferences: ['vegetables']
        });
        dataService.getUserHealthProfile.mockResolvedValue({
            conditions: ['diabetes'],
            allergies: ['nuts']
        });
    });

    describe('processUserMessage', () => {
        it('should process user message and return appropriate response', async () => {
            const message = 'What should I eat for dinner?';
            aiService.generateResponse.mockResolvedValue({
                text: 'Here are some dinner suggestions...',
                type: 'suggestion'
            });

            const response = await chatbotService.processUserMessage(message);
            expect(response.text).toBeDefined();
            expect(response.type).toBeDefined();
            expect(aiService.generateResponse).toHaveBeenCalledWith(message, expect.any(Object));
        });

        it('should handle dietary questions', async () => {
            const message = 'What foods are good for diabetes?';
            aiService.generateResponse.mockResolvedValue({
                text: 'For diabetes, consider foods like...',
                type: 'dietary'
            });

            const response = await chatbotService.processUserMessage(message);
            expect(response.text).toContain('diabetes');
            expect(response.type).toBe('dietary');
        });

        it('should maintain conversation context', async () => {
            const message1 = {
                text: 'What are healthy breakfast options?',
                type: 'diet_question'
            };
            const message2 = {
                text: 'What about lunch?',
                type: 'diet_question'
            };

            await chatbotService.processUserMessage(message1);
            const response = await chatbotService.processUserMessage(message2);
            
            expect(response).toBeDefined();
            expect(response.text).toBeDefined();
            expect(response.type).toBeDefined();
            expect(aiService.generateResponse).toHaveBeenCalledTimes(2);
        });
    });

    describe('generateDietaryAdvice', () => {
        it('should generate dietary advice based on user profile', async () => {
            const advice = await chatbotService.generateDietaryAdvice();
            
            expect(advice).toBeDefined();
            expect(advice.recommendations).toBeInstanceOf(Array);
            expect(advice.restrictions).toBeInstanceOf(Array);
            expect(dataService.getUserPreferences).toHaveBeenCalled();
            expect(dataService.getUserHealthProfile).toHaveBeenCalled();
        });

        it('should handle missing user profile', async () => {
            dataService.getUserPreferences.mockResolvedValueOnce(null);
            dataService.getUserHealthProfile.mockResolvedValueOnce(null);

            const advice = await chatbotService.generateDietaryAdvice();
            
            expect(advice).toBeDefined();
            expect(advice.recommendations).toBeInstanceOf(Array);
            expect(advice.restrictions).toBeInstanceOf(Array);
            expect(advice.recommendations).toHaveLength(0);
            expect(advice.restrictions).toHaveLength(0);
        });
    });

    describe('handleNutritionQuery', () => {
        it('should answer nutrition related queries', async () => {
            const query = 'How many calories in an apple?';

            const response = await chatbotService.handleNutritionQuery(query);
            
            expect(response).toBeDefined();
            expect(response.text).toContain('calories');
            expect(response.type).toBe('nutrition_info');
            expect(dataService.getNutritionalInfo).toHaveBeenCalledWith('apple');
        });

        it('should handle errors gracefully', async () => {
            dataService.getNutritionalInfo.mockRejectedValueOnce(new Error('API Error'));
            const query = 'How many calories in a nonexistent food?';

            const response = await chatbotService.handleNutritionQuery(query);
            
            expect(response).toBeDefined();
            expect(response.text).toContain('sorry');
            expect(response.type).toBe('error');
        });
    });
});
