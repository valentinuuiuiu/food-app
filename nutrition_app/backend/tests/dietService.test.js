const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const dietService = require('../services/dietService');
const User = require('../models/userModel');
const medicalDataService = require('../services/medicalDataService');
const { redisClient } = require('../config/database');

// Mock Redis client
jest.mock('../config/database', () => ({
    redisClient: {
        get: jest.fn(),
        setEx: jest.fn(),
    }
}));

// Mock medical data service
jest.mock('../services/medicalDataService', () => ({
    searchRareDisease: jest.fn(),
    analyzeDietaryNeeds: jest.fn()
}));

describe('Diet Service Tests', () => {
    let mongoServer;
    let testUser;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        await User.deleteMany({});
        
        // Create a test user
        testUser = await User.create({
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123',
            healthProfile: {
                age: 30,
                weight: 70, // kg
                height: 170, // cm
                gender: 'male',
                activityLevel: 'moderate',
                medicalConditions: ['diabetes'],
                allergies: ['peanuts'],
                dietaryRestrictions: ['lactose']
            },
            preferences: {
                cuisinePreferences: ['mediterranean'],
                excludedIngredients: ['mushrooms'],
                mealSize: 'medium',
                mealsPerDay: 3
            }
        });

        // Clear all mocks
        jest.clearAllMocks();
    });

    describe('calculateDailyCalories', () => {
        it('should calculate correct calories for male', async () => {
            const user = {
                healthProfile: {
                    gender: 'male',
                    weight: 70, // kg
                    height: 170, // cm
                    age: 30,
                    activityLevel: 'moderate'
                }
            };
            
            const calories = await dietService.calculateDailyCalories(user);
            // Allow for a larger margin of error since different formulas might be used
            expect(calories).toBeCloseTo(2591, -2); // Allow 100 calories difference
        });

        it('should calculate correct calories for female', async () => {
            testUser.healthProfile.gender = 'female';
            const calories = await dietService.calculateDailyCalories(testUser);
            // BMR = 447.593 + (9.247 × 70) + (3.098 × 170) - (4.330 × 30)
            // BMR ≈ 1,488
            // With moderate activity (1.55): 1,488 × 1.55 ≈ 2,306
            expect(calories).toBeCloseTo(2306, -2); // Allow 100 calories difference
        });
    });

    describe('generateMealPlan', () => {
        beforeEach(() => {
            // Mock medical data service responses
            medicalDataService.searchRareDisease.mockResolvedValue({
                name: 'diabetes',
                description: 'Metabolic disorder'
            });
            medicalDataService.analyzeDietaryNeeds.mockResolvedValue({
                recommendations: {
                    foods_to_avoid: ['sugar', 'white bread']
                }
            });

            // Mock Redis responses
            redisClient.get.mockResolvedValue(null);
            redisClient.setEx.mockResolvedValue('OK');
        });

        it('should generate a 7-day meal plan', async () => {
            const mealPlan = await dietService.generateMealPlan(testUser._id);
            
            expect(mealPlan).toHaveLength(7);
            expect(mealPlan[0].meals).toHaveLength(4); // breakfast, lunch, dinner, snack
            
            // Check meal structure
            const firstMeal = mealPlan[0].meals[0];
            expect(firstMeal).toHaveProperty('type');
            expect(firstMeal).toHaveProperty('foods');
            expect(Array.isArray(firstMeal.foods)).toBeTruthy();
        });

        it('should respect dietary restrictions', async () => {
            const mealPlan = await dietService.generateMealPlan(testUser._id);
            
            // Check that medical service was called
            expect(medicalDataService.searchRareDisease).toHaveBeenCalledWith('diabetes');
            expect(medicalDataService.analyzeDietaryNeeds).toHaveBeenCalled();
            
            // Verify the updated user in database has the meal plan
            const updatedUser = await User.findById(testUser._id);
            expect(updatedUser.dietPlan.mealPlan).toHaveLength(7);
        });

        it('should throw error for non-existent user', async () => {
            await expect(dietService.generateMealPlan(
                new mongoose.Types.ObjectId()
            )).rejects.toThrow('User not found');
        });
    });

    describe('updateUserDietPreferences', () => {
        it('should update user preferences', async () => {
            const newPreferences = {
                cuisinePreferences: ['italian'],
                mealSize: 'large'
            };

            const updatedUser = await dietService.updateUserDietPreferences(
                testUser._id,
                newPreferences
            );

            expect(updatedUser.preferences.cuisinePreferences).toEqual(['italian']);
            expect(updatedUser.preferences.mealSize).toBe('large');
            // Should keep existing preferences not specified in update
            expect(updatedUser.preferences.mealsPerDay).toBe(3);
        });

        it('should throw error for non-existent user', async () => {
            await expect(dietService.updateUserDietPreferences(
                new mongoose.Types.ObjectId(),
                {}
            )).rejects.toThrow('User not found');
        });
    });

    describe('getUserDietPlan', () => {
        it('should return user diet plan', async () => {
            // First generate a meal plan
            await dietService.generateMealPlan(testUser._id);
            
            // Then retrieve it
            const dietPlan = await dietService.getUserDietPlan(testUser._id);
            
            expect(dietPlan).toBeDefined();
            expect(dietPlan).toHaveProperty('dailyCalorieTarget');
            expect(dietPlan).toHaveProperty('mealPlan');
        });

        it('should throw error for non-existent user', async () => {
            await expect(dietService.getUserDietPlan(
                new mongoose.Types.ObjectId()
            )).rejects.toThrow('User not found');
        });
    });
});
