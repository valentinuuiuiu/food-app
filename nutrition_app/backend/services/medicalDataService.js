const axios = require('axios');
const cheerio = require('cheerio');

class MedicalDataService {
    constructor() {
        this.wikiClient = axios;
        this.openFoodClient = axios;
    }

    async searchRareDisease(diseaseName) {
        try {
            const wikiInfo = await this._getWikipediaInfo(diseaseName);
            return {
                wikipedia: wikiInfo,
                nih: [],
                rareDiseases: [],
                medlinePlus: []
            };
        } catch (error) {
            console.error('Error searching rare disease:', error);
            return {
                wikipedia: null,
                nih: [],
                rareDiseases: [],
                medlinePlus: []
            };
        }
    }

    async _getWikipediaInfo(diseaseName) {
        try {
            const searchResponse = await this.wikiClient.get('https://en.wikipedia.org/w/api.php', {
                params: {
                    action: 'query',
                    format: 'json',
                    list: 'search',
                    srsearch: diseaseName,
                    utf8: 1
                }
            });

            if (!searchResponse?.data?.query?.search?.length) {
                return null;
            }

            const pageId = searchResponse.data.query.search[0].pageid;
            const contentResponse = await this.wikiClient.get('https://en.wikipedia.org/w/api.php', {
                params: {
                    action: 'query',
                    format: 'json',
                    prop: 'extracts|categories',
                    exintro: true,
                    explaintext: true,
                    pageids: pageId
                }
            });

            const page = contentResponse?.data?.query?.pages?.[pageId];
            if (!page) return null;

            return {
                title: page.title,
                extract: page.extract,
                categories: page.categories || []
            };
        } catch (error) {
            console.error('Error fetching Wikipedia info:', error);
            return null;
        }
    }

    async getNutritionalInfo(foodName) {
        try {
            if (!foodName) {
                return {
                    nutritionalInfo: null,
                    error: 'Food item not specified'
                };
            }

            const response = await this.openFoodClient.get(`https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(foodName)}.json`);
            
            if (!response?.data?.product) {
                return {
                    nutritionalInfo: null,
                    error: 'Food item not found'
                };
            }

            const nutriments = response.data.product.nutriments || {};
            return {
                nutritionalInfo: {
                    calories: nutriments['energy-kcal_100g'] || 0,
                    protein: nutriments.proteins_100g || 0,
                    carbohydrates: nutriments.carbohydrates_100g || 0,
                    fat: nutriments.fat_100g || 0,
                    fiber: nutriments.fiber_100g || 0,
                    sodium: nutriments.sodium_100g || 0
                }
            };
        } catch (error) {
            console.error('Error fetching nutritional info:', error);
            return {
                nutritionalInfo: null,
                error: 'Failed to fetch nutritional information'
            };
        }
    }

    analyzeDietaryNeeds(diseaseData) {
        const dietaryInfo = [];

        if (diseaseData?.wikipedia?.extract) {
            dietaryInfo.push({
                source: 'Wikipedia',
                dietary: diseaseData.wikipedia.extract
            });
        }

        if (diseaseData?.nih?.length > 0) {
            dietaryInfo.push({
                source: 'NIH',
                dietary: diseaseData.nih.join(' ')
            });
        }

        if (diseaseData?.rareDiseases?.dietaryInfo) {
            dietaryInfo.push({
                source: 'RareDiseases.org',
                dietary: diseaseData.rareDiseases.dietaryInfo
            });
        }

        if (diseaseData?.medlinePlus?.length > 0) {
            diseaseData.medlinePlus.forEach(page => {
                if (page?.dietaryInfo) {
                    dietaryInfo.push({
                        source: 'MedlinePlus',
                        dietary: page.dietaryInfo
                    });
                }
            });
        }

        return {
            dietaryInfo,
            recommendations: dietaryInfo.length > 0 ? 
                ['No specific dietary recommendations found'] : 
                ['No specific dietary recommendations found'],
            lastUpdated: new Date().toISOString()
        };
    }
}

module.exports = new MedicalDataService();
