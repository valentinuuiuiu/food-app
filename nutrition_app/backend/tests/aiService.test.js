const aiService = require('../services/aiService');
const { redisClient } = require('../config/database');

// Mock Redis client
jest.mock('../config/database', () => ({
    redisClient: {
        get: jest.fn(),
        setEx: jest.fn(),
    }
}));

describe('AI Service Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('analyzeDiet', () => {
        it('should analyze diet correctly', async () => {
            const dietData = {
                meals: [
                    { name: 'Breakfast', calories: 500 },
                    { name: 'Lunch', calories: 700 }
                ],
                userProfile: {
                    age: 30,
                    weight: 70,
                    height: 170,
                    activityLevel: 'moderate'
                }
            };

            const analysis = await aiService.analyzeDiet(dietData);
            expect(analysis).toHaveProperty('recommendations');
            expect(analysis).toHaveProperty('analysis');
        });

        it('should handle invalid diet data', async () => {
            await expect(aiService.analyzeDiet(null))
                .rejects.toThrow('Invalid diet data');
        });
    });

    describe('generateMealSuggestions', () => {
        it('should generate meal suggestions', async () => {
            const preferences = {
                targetCalories: 2000,
                dietaryRestrictions: ['gluten-free'],
                preferredCuisine: 'mediterranean'
            };

            // Mock Redis cache check
            redisClient.get.mockResolvedValue(null);
            redisClient.setEx.mockResolvedValue('OK');

            const suggestions = await aiService.generateMealSuggestions(preferences);
            expect(Array.isArray(suggestions)).toBeTruthy();
            expect(suggestions.length).toBeGreaterThan(0);
            suggestions.forEach(meal => {
                expect(meal).toHaveProperty('name');
                expect(meal).toHaveProperty('description');
                expect(meal).toHaveProperty('calories');
                expect(meal).toHaveProperty('nutritionalInfo');
                expect(meal.nutritionalInfo).toHaveProperty('protein');
                expect(meal.nutritionalInfo).toHaveProperty('carbs');
                expect(meal.nutritionalInfo).toHaveProperty('fats');
            });

            // Verify Redis caching
            expect(redisClient.get).toHaveBeenCalled();
            expect(redisClient.setEx).toHaveBeenCalled();
        });

        it('should return cached suggestions if available', async () => {
            const cachedSuggestions = [{
                name: 'Mediterranean Salad',
                description: 'Fresh salad with olive oil',
                calories: 400,
                nutritionalInfo: {
                    protein: 15,
                    carbs: 30,
                    fats: 25
                }
            }];

            redisClient.get.mockResolvedValue(JSON.stringify(cachedSuggestions));

            const preferences = {
                targetCalories: 2000,
                dietaryRestrictions: ['gluten-free'],
                preferredCuisine: 'mediterranean'
            };

            const suggestions = await aiService.generateMealSuggestions(preferences);
            expect(suggestions).toEqual(cachedSuggestions);
            expect(redisClient.get).toHaveBeenCalled();
            expect(redisClient.setEx).not.toHaveBeenCalled();
        });

        it('should handle invalid preferences', async () => {
            await expect(aiService.generateMealSuggestions(null))
                .rejects.toThrow('Invalid meal preferences provided');
        });
    });

    describe('analyzeNutritionalValue', () => {
        it('should analyze nutritional value of food', async () => {
            const foodItem = {
                name: 'Apple',
                quantity: 100,
                unit: 'g'
            };

            // Mock Redis cache check
            redisClient.get.mockResolvedValue(null);
            redisClient.setEx.mockResolvedValue('OK');

            const analysis = await aiService.analyzeNutritionalValue(foodItem);
            expect(analysis).toHaveProperty('calories');
            expect(analysis).toHaveProperty('nutritionalInfo');
            expect(analysis.nutritionalInfo).toHaveProperty('protein');
            expect(analysis.nutritionalInfo).toHaveProperty('carbs');
            expect(analysis.nutritionalInfo).toHaveProperty('fats');
            expect(analysis.nutritionalInfo).toHaveProperty('vitamins');
            expect(analysis.nutritionalInfo).toHaveProperty('minerals');

            // Verify Redis caching
            expect(redisClient.get).toHaveBeenCalled();
            expect(redisClient.setEx).toHaveBeenCalled();
        });

        it('should handle invalid food item', async () => {
            await expect(aiService.analyzeNutritionalValue(null))
                .rejects.toThrow('Invalid food item provided');
        });
    });
});
