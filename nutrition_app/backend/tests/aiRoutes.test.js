const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Create mock functions
const mockAiService = {
    analyzeDiet: jest.fn(),
    generateMealSuggestions: jest.fn(),
    analyzeNutritionalValue: jest.fn()
};

// Import routes directly
const aiRoutes = require('../routes/aiRoutes');

describe('AI Routes Tests', () => {
    let app;
    let authToken;
    const mockUser = {
        id: 'testuser123',
        healthProfile: {
            height: 175,
            weight: 70,
            age: 30,
            gender: 'male',
            activityLevel: 'moderate'
        },
        preferences: {
            dietaryRestrictions: ['dairy-free'],
            allergies: ['peanuts'],
            cuisinePreferences: ['italian', 'mexican']
        }
    };

    beforeAll(() => {
        // Create JWT token with mock user data
        authToken = jwt.sign({
            id: mockUser.id,
            healthProfile: mockUser.healthProfile,
            preferences: mockUser.preferences
        }, process.env.JWT_SECRET || 'your-default-secret-key');

        // Create express app with mocked services
        app = express();
        app.use(express.json());
        
        // Mock authentication middleware to set user data
        app.use((req, res, next) => {
            if (req.headers.authorization?.startsWith('Bearer ')) {
                try {
                    const token = req.headers.authorization.split(' ')[1];
                    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-default-secret-key');
                    req.user = {
                        id: decoded.id,
                        healthProfile: decoded.healthProfile,
                        preferences: decoded.preferences
                    };
                    next();
                } catch (error) {
                    return res.status(401).json({ error: 'Invalid token' });
                }
            } else {
                return res.status(401).json({ error: 'No token provided' });
            }
        });

        // Set up routes with mocked services
        app.use('/api/ai', aiRoutes(mockAiService));
    });

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
    });

    describe('POST /api/ai/analyze-diet', () => {
        const dietData = {
            meals: [
                { name: 'Breakfast', foods: ['oatmeal', 'banana'] }
            ]
        };

        it('should analyze diet with valid token', async () => {
            mockAiService.analyzeDiet.mockResolvedValue({
                calories: 500,
                protein: '15g'
            });

            const response = await request(app)
                .post('/api/ai/analyze-diet')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ dietData });

            expect(response.status).toBe(200);
            expect(mockAiService.analyzeDiet).toHaveBeenCalledWith(dietData);
            expect(response.body).toEqual({
                calories: 500,
                protein: '15g'
            });
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .post('/api/ai/analyze-diet')
                .send({ dietData });

            expect(response.status).toBe(401);
        });
    });

    describe('POST /api/ai/meal-suggestions', () => {
        const preferences = {
            diet: 'vegetarian',
            excludeIngredients: ['nuts']
        };

        it('should generate meal suggestions with valid token', async () => {
            mockAiService.generateMealSuggestions.mockResolvedValue([
                { name: 'Quinoa Bowl', ingredients: ['quinoa', 'vegetables'] }
            ]);

            const response = await request(app)
                .post('/api/ai/meal-suggestions')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ preferences });

            expect(response.status).toBe(200);
            expect(mockAiService.generateMealSuggestions).toHaveBeenCalledWith(
                preferences,
                {
                    healthProfile: mockUser.healthProfile,
                    dietaryRestrictions: mockUser.preferences.dietaryRestrictions
                }
            );
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body[0]).toHaveProperty('name');
            expect(response.body[0]).toHaveProperty('ingredients');
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .post('/api/ai/meal-suggestions')
                .send({ preferences });

            expect(response.status).toBe(401);
        });

        it('should handle missing preferences', async () => {
            const response = await request(app)
                .post('/api/ai/meal-suggestions')
                .set('Authorization', `Bearer ${authToken}`)
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Diet preferences are required');
        });
    });

    describe('POST /api/ai/analyze-nutritional-value', () => {
        const food = {
            name: 'banana',
            quantity: '1 medium'
        };

        it('should analyze nutritional value with valid token', async () => {
            mockAiService.analyzeNutritionalValue.mockResolvedValue({
                calories: 105,
                carbs: '27g',
                protein: '1.3g'
            });

            const response = await request(app)
                .post('/api/ai/analyze-nutritional-value')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ food });

            expect(response.status).toBe(200);
            expect(mockAiService.analyzeNutritionalValue).toHaveBeenCalledWith(food);
            expect(response.body).toEqual({
                calories: 105,
                carbs: '27g',
                protein: '1.3g'
            });
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .post('/api/ai/analyze-nutritional-value')
                .send({ food });

            expect(response.status).toBe(401);
        });
    });
});
