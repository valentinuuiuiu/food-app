const axios = require('axios');
const cheerio = require('cheerio');
const { redisClient } = require('../config/database');

class WebScraperService {
    async scrapeNutritionalInfo(url) {
        try {
            const cleanUrl = this.validateAndCleanUrl(url);
            const cacheKey = `nutrition:${cleanUrl}`;
            
            // Check cache first
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                return JSON.parse(cachedData);
            }

            const response = await axios.get(cleanUrl);
            const $ = cheerio.load(response.data);
            const data = this.extractStructuredData($);

            // Cache the results
            await redisClient.setEx(cacheKey, 3600, JSON.stringify(data));
            return data;
        } catch (error) {
            throw new Error('Failed to scrape URL');
        }
    }

    async scrapeMedicalInfo(url) {
        try {
            const cleanUrl = this.validateAndCleanUrl(url);
            const cacheKey = `medical:${cleanUrl}`;
            
            // Check cache first
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                return JSON.parse(cachedData);
            }

            const response = await axios.get(cleanUrl);
            const $ = cheerio.load(response.data);
            
            const info = {
                condition: $('h1').first().text().trim(),
                description: $('meta[name="description"]').attr('content'),
                symptoms: this._extractSymptoms($),
                treatments: this._extractTreatments($),
                dietaryRecommendations: this._extractDietaryRecommendations($)
            };

            // Cache the results
            await redisClient.setEx(cacheKey, 3600, JSON.stringify(info));
            return info;
        } catch (error) {
            throw new Error('Failed to scrape medical information');
        }
    }

    validateAndCleanUrl(url) {
        try {
            const urlObj = new URL(url);
            if (!['http:', 'https:'].includes(urlObj.protocol)) {
                throw new Error('Invalid URL format');
            }
            return urlObj.toString();
        } catch (error) {
            throw new Error('Invalid URL format');
        }
    }

    extractStructuredData($) {
        try {
            const nutritionalData = {
                calories: 0,
                nutrients: {}
            };
            
            // Extract calories
            const caloriesText = $('.calories, [itemprop="calories"]').first().text();
            const caloriesMatch = caloriesText.match(/(\d+)\s*calories/i);
            if (caloriesMatch) {
                nutritionalData.calories = parseInt(caloriesMatch[1]);
            }

            // Extract nutrients from nutrition facts table
            $('.nutrition-facts, .nutritional-info').find('tr, .nutrient-row').each((i, element) => {
                const $row = $(element);
                const label = $row.find('.label, .nutrient-label').text().trim().toLowerCase();
                const value = $row.find('.value, .nutrient-value').text().trim();
                
                if (label && value) {
                    nutritionalData.nutrients[label] = this._parseNutritionalValue(value);
                }
            });

            // Extract data from schema.org structured data
            const structuredData = $('script[type="application/ld+json"]');
            if (structuredData.length) {
                try {
                    const jsonData = JSON.parse(structuredData.html());
                    if (jsonData.nutrition) {
                        if (jsonData.nutrition.calories) {
                            nutritionalData.calories = parseInt(jsonData.nutrition.calories);
                        }
                        if (jsonData.nutrition.nutrients) {
                            Object.assign(nutritionalData.nutrients, 
                                this._transformStructuredNutrients(jsonData.nutrition.nutrients));
                        }
                    }
                } catch (e) {
                    console.error('Error parsing structured data:', e);
                }
            }

            // If no data found yet, try alternative selectors
            if (!nutritionalData.calories) {
                const altCaloriesText = $('[data-nutrient="calories"], .calorie-info').first().text();
                const altCaloriesMatch = altCaloriesText.match(/(\d+)\s*calories/i);
                if (altCaloriesMatch) {
                    nutritionalData.calories = parseInt(altCaloriesMatch[1]);
                }
            }

            if (Object.keys(nutritionalData.nutrients).length === 0) {
                $('[data-nutrient]').each((i, element) => {
                    const $nutrient = $(element);
                    const label = $nutrient.attr('data-nutrient').toLowerCase();
                    const value = $nutrient.text().trim();
                    if (value) {
                        nutritionalData.nutrients[label] = this._parseNutritionalValue(value);
                    }
                });
            }

            return nutritionalData;
        } catch (error) {
            console.error('Error extracting structured data:', error);
            return {
                calories: 0,
                nutrients: {}
            };
        }
    }

    _parseNutritionalValue(value) {
        const numericMatch = value.match(/(\d+(?:\.\d+)?)/);
        if (numericMatch) {
            return parseFloat(numericMatch[1]);
        }
        return 0;
    }

    _transformStructuredNutrients(nutrients) {
        const transformed = {};
        nutrients.forEach(nutrient => {
            if (nutrient.name && nutrient.amount) {
                transformed[nutrient.name.toLowerCase()] = parseFloat(nutrient.amount);
            }
        });
        return transformed;
    }

    _extractSymptoms($) {
        const symptoms = [];
        $('.symptoms-list li, .symptoms li').each((i, element) => {
            symptoms.push($(element).text().trim());
        });
        return symptoms;
    }

    _extractTreatments($) {
        const treatments = [];
        $('.treatments-list li, .treatments li').each((i, element) => {
            treatments.push($(element).text().trim());
        });
        return treatments;
    }

    _extractDietaryRecommendations($) {
        const recommendations = [];
        $('.dietary-recommendations li, .diet-recommendations li').each((i, element) => {
            recommendations.push($(element).text().trim());
        });
        return recommendations;
    }
}

module.exports = new WebScraperService();
