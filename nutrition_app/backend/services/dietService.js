const User = require('../models/userModel');
const medicalDataService = require('./medicalDataService');
const { redisClient } = require('../config/database');

class DietService {
    constructor() {
        this.CALORIES_PER_MEAL = {
            breakfast: 0.3, // 30% of daily calories
            lunch: 0.35,    // 35% of daily calories
            dinner: 0.25,   // 25% of daily calories
            snack: 0.1      // 10% of daily calories
        };
    }

    async calculateDailyCalories(user) {
        if (!user || !user.healthProfile) {
            throw new Error('Invalid user data');
        }

        const { gender, weight, height, age, activityLevel } = user.healthProfile;

        if (!gender || !weight || !height || !age || !activityLevel) {
            throw new Error('Missing required health profile data');
        }

        // Harris-Benedict equation for BMR
        let bmr;
        if (gender.toLowerCase() === 'male') {
            bmr = 88.362 + (13.397 * weight) + 
                  (4.799 * height) - 
                  (5.677 * age);
        } else {
            bmr = 447.593 + (9.247 * weight) + 
                  (3.098 * height) - 
                  (4.330 * age);
        }

        // Activity level multipliers
        const activityMultipliers = {
            sedentary: 1.2,      // Little or no exercise
            light: 1.375,        // Light exercise/sports 1-3 days/week
            moderate: 1.55,      // Moderate exercise/sports 3-5 days/week
            active: 1.725,       // Hard exercise/sports 6-7 days/week
            veryActive: 1.9      // Very hard exercise/sports & physical job or training
        };

        const multiplier = activityMultipliers[activityLevel.toLowerCase()] || activityMultipliers.moderate;
        return Math.round(bmr * multiplier);
    }

    async generateMealPlan(userId, days = 7) {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Get dietary restrictions based on medical conditions
        const dietaryRestrictions = [];
        for (const condition of user.healthProfile.medicalConditions) {
            const medicalInfo = await medicalDataService.searchRareDisease(condition);
            if (medicalInfo) {
                const dietAnalysis = await medicalDataService.analyzeDietaryNeeds(medicalInfo);
                dietaryRestrictions.push(...dietAnalysis.recommendations.foods_to_avoid);
            }
        }

        // Combine with user's dietary restrictions and allergies
        const allRestrictions = new Set([
            ...dietaryRestrictions,
            ...user.healthProfile.dietaryRestrictions,
            ...user.healthProfile.allergies
        ]);

        // Calculate daily calorie needs
        const dailyCalories = await this.calculateDailyCalories(user);

        // Generate meal plan for each day
        const mealPlan = [];
        const today = new Date();

        for (let i = 0; i < days; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + i);

            const dayPlan = {
                date: date,
                meals: []
            };

            // Generate each meal
            for (const [mealType, calorieRatio] of Object.entries(this.CALORIES_PER_MEAL)) {
                const mealCalories = Math.round(dailyCalories * calorieRatio);
                const foods = await this.selectFoodsForMeal(
                    mealCalories,
                    user.preferences,
                    Array.from(allRestrictions)
                );

                dayPlan.meals.push({
                    type: mealType,
                    foods: foods
                });
            }

            mealPlan.push(dayPlan);
        }

        // Update user's diet plan
        user.dietPlan.dailyCalorieTarget = dailyCalories;
        user.dietPlan.mealPlan = mealPlan;
        await user.save();

        return mealPlan;
    }

    async selectFoodsForMeal(targetCalories, preferences, restrictions) {
        // Cache key for food combinations
        const cacheKey = `meal:${targetCalories}:${preferences.cuisinePreferences.join(',')}:${restrictions.join(',')}`;
        
        // Try to get from cache
        const cachedMeal = await redisClient.get(cacheKey);
        if (cachedMeal) {
            return JSON.parse(cachedMeal);
        }

        // TODO: Implement sophisticated food selection algorithm
        // For now, return a simple example meal
        const meal = [{
            name: 'Example Food',
            portion: 100,
            unit: 'g',
            calories: targetCalories,
            nutrients: {
                protein: Math.round(targetCalories * 0.3 / 4), // 30% protein
                carbs: Math.round(targetCalories * 0.4 / 4),   // 40% carbs
                fats: Math.round(targetCalories * 0.3 / 9)     // 30% fats
            }
        }];

        // Cache the result for 24 hours
        await redisClient.setEx(cacheKey, 86400, JSON.stringify(meal));

        return meal;
    }

    async updateUserDietPreferences(userId, preferences) {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        user.preferences = {
            ...user.preferences,
            ...preferences
        };

        await user.save();
        return user;
    }

    async getUserDietPlan(userId) {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        return user.dietPlan;
    }
}

module.exports = new DietService();
