const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Calculate BMI
router.post('/bmi', authenticateToken, async (req, res) => {
    try {
        const { weight, height } = req.body;
        
        if (!weight || !height) {
            return res.status(400).json({ error: 'Weight and height are required' });
        }

        const bmi = weight / ((height / 100) * (height / 100));
        let category;

        if (bmi < 18.5) category = 'Underweight';
        else if (bmi < 25) category = 'Normal weight';
        else if (bmi < 30) category = 'Overweight';
        else category = 'Obese';

        res.json({
            bmi: Math.round(bmi * 10) / 10,
            category
        });
    } catch (error) {
        console.error('Error calculating BMI:', error);
        res.status(500).json({ 
            error: 'Failed to calculate BMI',
            message: error.message 
        });
    }
});

// Calculate daily calorie needs
router.post('/calorie-needs', authenticateToken, async (req, res) => {
    try {
        const { weight, height, age, gender, activityLevel } = req.body;
        
        if (!weight || !height || !age || !gender || !activityLevel) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Calculate BMR using Mifflin-St Jeor Equation
        let bmr;
        if (gender.toLowerCase() === 'male') {
            bmr = 10 * weight + 6.25 * height - 5 * age + 5;
        } else {
            bmr = 10 * weight + 6.25 * height - 5 * age - 161;
        }

        // Activity multipliers
        const activityMultipliers = {
            sedentary: 1.2,
            light: 1.375,
            moderate: 1.55,
            active: 1.725,
            veryActive: 1.9
        };

        const dailyCalories = Math.round(bmr * activityMultipliers[activityLevel]);

        // Calculate macronutrient ratios (40% carbs, 30% protein, 30% fat)
        const macronutrients = {
            carbohydrates: Math.round((dailyCalories * 0.4) / 4), // 4 calories per gram
            protein: Math.round((dailyCalories * 0.3) / 4), // 4 calories per gram
            fat: Math.round((dailyCalories * 0.3) / 9) // 9 calories per gram
        };

        res.json({
            dailyCalories,
            macronutrients
        });
    } catch (error) {
        console.error('Error calculating calorie needs:', error);
        res.status(500).json({ 
            error: 'Failed to calculate calorie needs',
            message: error.message 
        });
    }
});

module.exports = router;
