const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Import routes
const aiRoutes = require('../routes/aiRoutes');
const chatRoutes = require('../routes/chatRoutes');
const healthRoutes = require('../routes/healthRoutes');
const medicalRoutes = require('../routes/medicalRoutes');
const userRoutes = require('../routes/userRoutes');

// Create mock services
const mockAiService = {
    analyzeDiet: jest.fn(),
    generateMealSuggestions: jest.fn(),
};

jest.mock('../services/chatbotService');
jest.mock('../services/medicalDataService', () => ({
    getConditionInfo: jest.fn(),
    getNutritionalInfo: jest.fn(),
    analyzeDietaryNeeds: jest.fn(),
}));
jest.mock('../services/dietService');

// Import mocked services
const chatbotService = require('../services/chatbotService');
const medicalDataService = require('../services/medicalDataService');
const dietService = require('../services/dietService');

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/ai', aiRoutes(mockAiService));
app.use('/api/chat', chatRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/medical', medicalRoutes);
app.use('/api/users', userRoutes);

describe('API Routes Tests', () => {
    let mongoServer;
    let authToken;
    
    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
        
        // Create a test token
        const testUser = {
            id: new mongoose.Types.ObjectId(),
            email: 'test@example.com',
            healthProfile: {
                height: 170,
                weight: 70,
                age: 30
            },
            preferences: {
                dietaryRestrictions: ['gluten-free']
            }
        };
        authToken = jwt.sign(testUser, process.env.JWT_SECRET || 'test-secret');
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock return values for medical data service
        medicalDataService.getConditionInfo.mockResolvedValue({
            name: 'Diabetes',
            description: 'A metabolic disease...',
            dietaryRecommendations: []
        });

        medicalDataService.getNutritionalInfo.mockResolvedValue({
            nutritionalInfo: {
                name: 'Apple',
                calories: 52,
                protein: 0.3,
                carbohydrates: 14,
                fat: 0.2
            }
        });

        medicalDataService.analyzeDietaryNeeds.mockResolvedValue({
            recommendations: ['Avoid dairy products'],
            risks: ['Digestive issues']
        });

        mockAiService.generateMealSuggestions.mockResolvedValue([{
            name: 'Grilled Chicken Salad',
            calories: 350
        }]);
    });

    describe('AI Routes', () => {
        describe('POST /api/ai/analyze-diet', () => {
            it('should analyze diet', async () => {
                const dietData = {
                    meals: [{ name: 'Breakfast', calories: 500 }],
                    userProfile: { age: 30, weight: 70 }
                };

                mockAiService.analyzeDiet.mockResolvedValue({
                    recommendations: ['Eat more protein'],
                    analysis: { totalCalories: 500 }
                });

                const response = await request(app)
                    .post('/api/ai/analyze-diet')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({ dietData });

                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty('recommendations');
                expect(response.body).toHaveProperty('analysis');
                expect(mockAiService.analyzeDiet).toHaveBeenCalledWith(dietData);
            });
        });

        describe('POST /api/ai/meal-suggestions', () => {
            it('should generate meal suggestions', async () => {
                const preferences = {
                    diet: 'vegetarian',
                    allergies: ['nuts'],
                    cuisinePreferences: ['Italian', 'Indian']
                };

                mockAiService.generateMealSuggestions.mockResolvedValue([
                    { name: 'Vegetarian Pasta', calories: 450 }
                ]);

                const response = await request(app)
                    .post('/api/ai/meal-suggestions')
                    .send({ preferences })
                    .set('Authorization', `Bearer ${authToken}`);

                expect(response.status).toBe(200);
                expect(response.body).toBeInstanceOf(Array);
                expect(response.body[0]).toHaveProperty('name');
            });

            it('should handle errors', async () => {
                mockAiService.generateMealSuggestions.mockRejectedValueOnce(new Error('Test error'));

                const response = await request(app)
                    .post('/api/ai/meal-suggestions')
                    .send({})
                    .set('Authorization', `Bearer ${authToken}`);

                expect(response.status).toBe(400);
                expect(response.body).toHaveProperty('error');
            });
        });
    });

    describe('Chat Routes', () => {
        describe('POST /api/chat/message', () => {
            it('should process chat message', async () => {
                const message = {
                    text: 'What should I eat if I have diabetes?',
                    userId: 'test123'
                };

                chatbotService.processUserMessage.mockResolvedValue({
                    text: 'Here are some dietary recommendations for diabetes...',
                    type: 'dietary_advice'
                });

                const response = await request(app)
                    .post('/api/chat/message')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(message);

                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty('text');
                expect(response.body).toHaveProperty('type');
                expect(chatbotService.processUserMessage).toHaveBeenCalledWith(message);
            });
        });
    });

    describe('Medical Routes', () => {
        describe('GET /api/medical/condition/:name', () => {
            it('should get medical condition info', async () => {
                const conditionName = 'diabetes';
                const mockConditionInfo = {
                    name: 'Diabetes',
                    description: 'A metabolic disease...',
                    dietaryRecommendations: []
                };

                medicalDataService.getConditionInfo.mockResolvedValue(mockConditionInfo);
                
                const response = await request(app)
                    .get(`/api/medical/condition/${conditionName}`)
                    .set('Authorization', `Bearer ${authToken}`);

                expect(response.status).toBe(200);
                expect(response.body).toEqual(mockConditionInfo);
                expect(medicalDataService.getConditionInfo).toHaveBeenCalledWith(conditionName);
            });

            it('should handle errors', async () => {
                medicalDataService.getConditionInfo.mockRejectedValueOnce(new Error('Test error'));

                const response = await request(app)
                    .get('/api/medical/condition/invalid')
                    .set('Authorization', `Bearer ${authToken}`);

                expect(response.status).toBe(500);
                expect(response.body).toHaveProperty('error');
            });
        });

        describe('GET /api/medical/food/:name', () => {
            it('should get nutritional info', async () => {
                const food = 'apple';
                const mockNutritionalInfo = {
                    nutritionalInfo: {
                        name: 'Apple',
                        calories: 52,
                        protein: 0.3
                    }
                };

                medicalDataService.getNutritionalInfo.mockResolvedValue(mockNutritionalInfo);

                const response = await request(app)
                    .get(`/api/medical/food/${food}`)
                    .set('Authorization', `Bearer ${authToken}`);

                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty('nutritionalInfo');
                expect(medicalDataService.getNutritionalInfo).toHaveBeenCalledWith(food);
            });

            it('should handle errors', async () => {
                medicalDataService.getNutritionalInfo.mockRejectedValueOnce(new Error('Test error'));

                const response = await request(app)
                    .get('/api/medical/food/invalid')
                    .set('Authorization', `Bearer ${authToken}`);

                expect(response.status).toBe(500);
                expect(response.body).toHaveProperty('error');
            });
        });
    });
});
