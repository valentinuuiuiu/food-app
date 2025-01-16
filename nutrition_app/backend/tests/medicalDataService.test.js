const medicalDataService = require('../services/medicalDataService');
const axios = require('axios');

// Mock axios
jest.mock('axios');

describe('MedicalDataService', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Mock axios get for all tests
        axios.get.mockImplementation((url) => {
            if (url.includes('wikipedia.org')) {
                return Promise.resolve({
                    data: {
                        query: {
                            search: [{ pageid: 123 }],
                            pages: {
                                123: {
                                    title: 'Test Disease',
                                    extract: 'Disease description with dietary recommendations.',
                                    categories: ['Medical conditions']
                                }
                            }
                        }
                    }
                });
            } else if (url.includes('product')) {
                return Promise.resolve({
                    data: {
                        product: {
                            nutriments: {
                                'energy-kcal_100g': 100,
                                proteins_100g: 10,
                                carbohydrates_100g: 20,
                                fat_100g: 5,
                                fiber_100g: 2,
                                sodium_100g: 0.5
                            }
                        }
                    }
                });
            }
            return Promise.resolve({ data: {} });
        });
    });

    describe('searchRareDisease', () => {
        test('should return disease information for a valid disease name', async () => {
            const result = await medicalDataService.searchRareDisease('test disease');
            
            expect(result).toBeDefined();
            expect(result.wikipedia).toBeDefined();
            expect(result.wikipedia.title).toBe('Test Disease');
            expect(result.nih).toEqual([]);
            expect(result.rareDiseases).toEqual([]);
            expect(result.medlinePlus).toEqual([]);
        });

        test('should handle API errors gracefully', async () => {
            axios.get.mockRejectedValueOnce(new Error('API Error'));
            
            const result = await medicalDataService.searchRareDisease('test disease');
            
            expect(result).toEqual({
                wikipedia: null,
                nih: [],
                rareDiseases: [],
                medlinePlus: []
            });
        });
    });

    describe('getNutritionalInfo', () => {
        test('should return nutritional information for a valid food item', async () => {
            const result = await medicalDataService.getNutritionalInfo('test food');
            
            expect(result).toEqual({
                nutritionalInfo: {
                    calories: 100,
                    protein: 10,
                    carbohydrates: 20,
                    fat: 5,
                    fiber: 2,
                    sodium: 0.5
                }
            });
        });

        test('should handle missing product data', async () => {
            axios.get.mockResolvedValueOnce({ data: {} });
            
            const result = await medicalDataService.getNutritionalInfo('nonexistent food');
            
            expect(result).toEqual({
                nutritionalInfo: null,
                error: 'Food item not found'
            });
        });

        test('should handle API errors', async () => {
            axios.get.mockRejectedValueOnce(new Error('API Error'));
            
            const result = await medicalDataService.getNutritionalInfo('test food');
            
            expect(result).toEqual({
                nutritionalInfo: null,
                error: 'Failed to fetch nutritional information'
            });
        });
    });

    describe('analyzeDietaryNeeds', () => {
        test('should analyze dietary needs with complete data', async () => {
            const diseaseData = {
                wikipedia: {
                    extract: 'Should follow a balanced diet.'
                },
                nih: ['Avoid sugary foods.'],
                rareDiseases: {
                    dietaryInfo: 'Eat more vegetables.'
                },
                medlinePlus: [
                    { dietaryInfo: 'Include protein in every meal.' }
                ]
            };

            const result = await medicalDataService.analyzeDietaryNeeds(diseaseData);
            
            expect(result).toBeDefined();
            expect(result.dietaryInfo).toHaveLength(4);
            expect(result.recommendations).toBeDefined();
            expect(result.lastUpdated).toBeDefined();
        });

        test('should handle missing data gracefully', async () => {
            const diseaseData = {};

            const result = await medicalDataService.analyzeDietaryNeeds(diseaseData);
            
            expect(result.dietaryInfo).toHaveLength(0);
            expect(result.recommendations).toEqual(['No specific dietary recommendations found']);
            expect(result.lastUpdated).toBeDefined();
        });

        test('should handle partial data', async () => {
            const diseaseData = {
                wikipedia: {
                    extract: 'Should follow a balanced diet.'
                }
            };

            const result = await medicalDataService.analyzeDietaryNeeds(diseaseData);
            
            expect(result.dietaryInfo).toHaveLength(1);
            expect(result.recommendations).toBeDefined();
            expect(result.lastUpdated).toBeDefined();
        });
    });
});
