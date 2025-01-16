const redis = require('redis');

// Initialize Redis client
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379
});

redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});

redisClient.on('connect', () => {
  console.log('Connected to Redis');
});

// Redis-based data operations
const db = {
  // User operations
  createUser: async (userData) => {
    const userId = `user:${Date.now()}`;
    await redisClient.hSet(userId, userData);
    return userId;
  },

  getUser: async (userId) => {
    return redisClient.hGetAll(userId);
  },

  // Meal plan operations
  saveMealPlan: async (userId, mealPlan) => {
    const planId = `plan:${Date.now()}`;
    await redisClient.hSet(planId, {
      ...mealPlan,
      userId,
      createdAt: Date.now()
    });
    await redisClient.sAdd(`user_plans:${userId}`, planId);
    return planId;
  },

  getMealPlans: async (userId) => {
    const planIds = await redisClient.sMembers(`user_plans:${userId}`);
    const plans = await Promise.all(
      planIds.map(async (id) => redisClient.hGetAll(id))
    );
    return plans.sort((a, b) => b.createdAt - a.createdAt);
  },

  deleteMealPlan: async (planId) => {
    const plan = await redisClient.hGetAll(planId);
    if (plan.userId) {
      await redisClient.sRem(`user_plans:${plan.userId}`, planId);
    }
    await redisClient.del(planId);
  },

  // General query
  query: async (pattern) => {
    const keys = await redisClient.keys(pattern);
    return Promise.all(keys.map(key => redisClient.hGetAll(key)));
  }
};

module.exports = db;
