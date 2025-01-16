const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    healthProfile: {
        gender: {
            type: String,
            enum: ['male', 'female', 'other'],
            required: false
        },
        weight: {
            type: Number,
            required: false
        },
        height: {
            type: Number,
            required: false
        },
        age: {
            type: Number,
            required: false
        },
        activityLevel: {
            type: String,
            enum: ['sedentary', 'light', 'moderate', 'high', 'very_high'],
            required: false
        },
        dietaryRestrictions: [{
            type: String,
            trim: true
        }]
    },
    preferences: {
        type: Object,
        default: {}
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw error;
    }
};

// Convert preferences to plain object
userSchema.methods.toJSON = function() {
    const obj = this.toObject();
    if (obj.preferences instanceof Map) {
        obj.preferences = Object.fromEntries(obj.preferences);
    }
    delete obj.password;
    return obj;
};

module.exports = mongoose.model('User', userSchema);
