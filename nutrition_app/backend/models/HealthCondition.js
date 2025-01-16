const mongoose = require('mongoose');

const healthConditionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    condition: {
        type: String,
        required: true,
        trim: true
    },
    severity: {
        type: String,
        enum: ['mild', 'moderate', 'severe'],
        required: true
    },
    symptoms: [{
        type: String,
        trim: true
    }],
    dateRecorded: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('HealthCondition', healthConditionSchema);
