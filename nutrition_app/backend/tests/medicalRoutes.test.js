const request = require('supertest');
const express = require('express');
const medicalRoutes = require('../routes/medicalRoutes');
const medicalDataService = require('../services/medicalDataService');
const jwt = require('jsonwebtoken');

// Create a test app
const app = express();
app.use(express.json());
app.use('/api/medical', medicalRoutes);

// Mock the medical data service
jest.mock('../services/medicalDataService');

// Mock authentication token
const testUser = { id: '123', email: 'test@example.com' };
const authToken = jwt.sign(testUser, process.env.JWT_SECRET || 'test-secret');

describe('Medical Routes', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
    });

    describe('GET /api/medical/disease/:name', () => {
        test('should return disease information', async () => {
            const mockDiseaseInfo = {
                wikipedia: { extract: 'Test disease info' },
                nih: [{ title: 'NIH Info' }],
                medlinePlus: [{ title: 'MedlinePlus Info' }],
                lastUpdated: new Date().toISOString()
            };

            medicalDataService.searchRareDisease.mockResolvedValue(mockDiseaseInfo);

            const response = await request(app)
                .get('/api/medical/disease/celiac')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toEqual(mockDiseaseInfo);
            expect(medicalDataService.searchRareDisease).toHaveBeenCalledWith('celiac');
        });

        test('should handle errors', async () => {
            medicalDataService.searchRareDisease.mockRejectedValue(new Error('Test error'));

            const response = await request(app)
                .get('/api/medical/disease/error')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(500);

            expect(response.body).toHaveProperty('error');
            expect(response.body).toHaveProperty('message');
        });
    });

    describe('GET /api/medical/disease/:name/diet', () => {
        test('should return dietary analysis', async () => {
            const mockDiseaseInfo = {
                wikipedia: { extract: 'Test diet info' }
            };
            const mockDietaryAnalysis = {
                dietaryInfo: [],
                recommendations: {
                    foods_to_avoid: ['gluten'],
                    foods_to_eat: ['vegetables'],
                    general_guidelines: ['eat healthy']
                }
            };

            medicalDataService.searchRareDisease.mockResolvedValue(mockDiseaseInfo);
            medicalDataService.analyzeDietaryNeeds.mockResolvedValue(mockDietaryAnalysis);

            const response = await request(app)
                .get('/api/medical/disease/celiac/diet')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toEqual(mockDietaryAnalysis);
            expect(medicalDataService.searchRareDisease).toHaveBeenCalledWith('celiac');
            expect(medicalDataService.analyzeDietaryNeeds).toHaveBeenCalledWith(mockDiseaseInfo);
        });

        test('should handle errors', async () => {
            medicalDataService.searchRareDisease.mockRejectedValue(new Error('Test error'));

            const response = await request(app)
                .get('/api/medical/disease/error/diet')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(500);

            expect(response.body).toHaveProperty('error');
            expect(response.body).toHaveProperty('message');
        });
    });

    describe('GET /api/medical/food/:name', () => {
        test('should return nutritional information', async () => {
            const mockNutritionalInfo = {
                name: 'Apple',
                nutrients: {
                    calories: 52,
                    protein: 0.3,
                    carbohydrates: 14,
                    fat: 0.2,
                    fiber: 2.4
                }
            };

            medicalDataService.getNutritionalInfo.mockResolvedValue(mockNutritionalInfo);

            const response = await request(app)
                .get('/api/medical/food/apple')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toEqual(mockNutritionalInfo);
            expect(medicalDataService.getNutritionalInfo).toHaveBeenCalledWith('apple');
        });

        test('should handle errors', async () => {
            medicalDataService.getNutritionalInfo.mockRejectedValue(new Error('Test error'));

            const response = await request(app)
                .get('/api/medical/food/error')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(500);

            expect(response.body).toHaveProperty('error');
            expect(response.body).toHaveProperty('message');
        });

        test('should require authentication', async () => {
            const response = await request(app)
                .get('/api/medical/food/apple')
                .expect(401);

            expect(response.body).toHaveProperty('error', 'Unauthorized');
        });
    });

    describe('Rate limiting', () => {
        test('should limit requests', async () => {
            const mockDiseaseInfo = { wikipedia: { extract: 'Test' } };
            medicalDataService.searchRareDisease.mockResolvedValue(mockDiseaseInfo);

            // Make multiple requests
            const requests = Array(150).fill().map(() => 
                request(app)
                    .get('/api/medical/disease/test')
                    .set('Authorization', `Bearer ${authToken}`)
            );

            const responses = await Promise.all(requests);
            
            // Some requests should be rate limited (status 429)
            const rateLimited = responses.some(response => response.status === 429);
            expect(rateLimited).toBe(true);
        });
    });
});
