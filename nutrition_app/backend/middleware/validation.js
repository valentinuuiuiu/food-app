const Joi = require('joi');

const validateUser = (req, res, next) => {
    const schema = Joi.object({
        name: Joi.string().required(),
        age: Joi.number().integer().min(0).max(150).required(),
        weight: Joi.number().min(0).required(),
        height: Joi.number().min(0).required(),
        healthConditions: Joi.array().items(Joi.string()).optional()
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }
    next();
};

const validateHealthProfile = (req, res, next) => {
    const schema = Joi.object({
        gender: Joi.string().valid('male', 'female', 'other').required(),
        weight: Joi.number().min(0).required(),
        height: Joi.number().min(0).required(),
        age: Joi.number().integer().min(0).max(150).required(),
        activityLevel: Joi.string().valid('sedentary', 'light', 'moderate', 'high', 'very_high').required(),
        dietaryRestrictions: Joi.array().items(Joi.string()).optional()
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }
    next();
};

const validateHealthCondition = (req, res, next) => {
    const schema = Joi.object({
        userId: Joi.string().required(),
        condition: Joi.string().required(),
        severity: Joi.string().valid('mild', 'moderate', 'severe').required(),
        symptoms: Joi.array().items(Joi.string()).optional()
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }
    next();
};

module.exports = {
    validateUser,
    validateHealthProfile,
    validateHealthCondition
};
