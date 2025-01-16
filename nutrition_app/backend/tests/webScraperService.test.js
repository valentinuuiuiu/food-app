const webScraperService = require('../services/webScraperService');
const axios = require('axios');
const cheerio = require('cheerio');

// Mock axios
jest.mock('axios');

describe('Web Scraper Service Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('scrapeNutritionalInfo', () => {
        it('should scrape nutritional information from valid URL', async () => {
            // Mock axios response
            axios.get.mockResolvedValue({
                data: `
                    <html>
                        <body>
                            <div class="nutrition-info">
                                <span>Calories: 100</span>
                                <span>Protein: 5g</span>
                            </div>
                        </body>
                    </html>
                `
            });

            const url = 'https://example.com/food/apple';
            const info = await webScraperService.scrapeNutritionalInfo(url);
            
            expect(info).toHaveProperty('calories');
            expect(info).toHaveProperty('nutrients');
            expect(axios.get).toHaveBeenCalledWith(url);
        });

        it('should handle invalid URLs', async () => {
            axios.get.mockRejectedValue(new Error('Invalid URL'));
            
            await expect(webScraperService.scrapeNutritionalInfo('invalid-url'))
                .rejects.toThrow('Failed to scrape URL');
        });
    });

    describe('scrapeMedicalInfo', () => {
        it('should scrape medical information from valid URL', async () => {
            axios.get.mockResolvedValue({
                data: `
                    <html>
                        <body>
                            <div class="medical-info">
                                <h1>Diabetes</h1>
                                <p>Description of diabetes</p>
                                <ul class="dietary-recommendations">
                                    <li>Avoid sugar</li>
                                </ul>
                            </div>
                        </body>
                    </html>
                `
            });

            const url = 'https://example.com/condition/diabetes';
            const info = await webScraperService.scrapeMedicalInfo(url);
            
            expect(info).toHaveProperty('condition');
            expect(info).toHaveProperty('description');
            expect(info).toHaveProperty('dietaryRecommendations');
        });

        it('should handle scraping errors', async () => {
            axios.get.mockRejectedValue(new Error('Network error'));
            
            await expect(webScraperService.scrapeMedicalInfo('https://example.com'))
                .rejects.toThrow('Failed to scrape medical information');
        });
    });

    describe('validateAndCleanUrl', () => {
        it('should validate and clean valid URLs', () => {
            const validUrl = 'https://example.com/food/item';
            const cleanedUrl = webScraperService.validateAndCleanUrl(validUrl);
            expect(cleanedUrl).toBe(validUrl);
        });

        it('should reject invalid URLs', () => {
            expect(() => webScraperService.validateAndCleanUrl('invalid-url'))
                .toThrow('Invalid URL format');
        });
    });

    describe('extractStructuredData', () => {
        it('should extract structured data from HTML', () => {
            const html = `
                <html>
                    <div class="nutrition-facts">
                        <div class="calories">200 calories</div>
                        <div class="nutrient-row">
                            <span class="nutrient-label">Protein</span>
                            <span class="nutrient-value">10g</span>
                        </div>
                        <div class="nutrient-row">
                            <span class="nutrient-label">Carbs</span>
                            <span class="nutrient-value">25g</span>
                        </div>
                    </div>
                    <script type="application/ld+json">
                        {
                            "nutrition": {
                                "calories": "200",
                                "nutrients": [
                                    {
                                        "name": "protein",
                                        "amount": "10"
                                    },
                                    {
                                        "name": "carbs",
                                        "amount": "25"
                                    }
                                ]
                            }
                        }
                    </script>
                </html>
            `;
            
            const $ = cheerio.load(html);
            const data = webScraperService.extractStructuredData($);
            
            expect(data.calories).toBe(200);
            expect(data.nutrients).toHaveProperty('protein', 10);
            expect(data.nutrients).toHaveProperty('carbs', 25);
        });

        it('should handle missing structured data', () => {
            const $ = cheerio.load('<html></html>');
            const data = webScraperService.extractStructuredData($);
            expect(data).toEqual({
                calories: 0,
                nutrients: {}
            });
        });
    });
});
