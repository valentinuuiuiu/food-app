const mongoose = require('mongoose');

const foodSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    portion: {
        type: Number,
        required: true
    },
    unit: {
        type: String,
        required: true
    },
    calories: {
        type: Number,
        required: true
    },
    nutrients: {
        protein: Number,
        carbs: Number,
        fats: Number
    }
});

const mealSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['breakfast', 'lunch', 'dinner', 'snack']
    },
    foods: [foodSchema]
});

const dailyMealPlanSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true
    },
    meals: [mealSchema]
});

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    healthProfile: {
        age: Number,
        weight: Number,
        height: Number,
        gender: {
            type: String,
            enum: ['male', 'female', 'other']
        },
        activityLevel: {
            type: String,
            enum: ['sedentary', 'light', 'moderate', 'active', 'veryActive']
        },
        medicalConditions: [String],
        allergies: [String],
        dietaryRestrictions: [String]
    },
    dietPlan: {
        dailyCalorieTarget: Number,
        macroTargets: {
            protein: Number,
            carbs: Number,
            fats: Number
        },
        mealPlan: [dailyMealPlanSchema]
    },
    preferences: {
        cuisinePreferences: [String],
        excludedIngredients: [String],
        mealSize: {
            type: String,
            enum: ['small', 'medium', 'large']
        },
        mealsPerDay: {
            type: Number,
            min: 1,
            max: 6
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

userSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model('User', userSchema);
