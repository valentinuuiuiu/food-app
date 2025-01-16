const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const User = require('../models/User');
const { generateToken } = require('../utils/auth');

let mongoServer;
let testUser;
let authToken;

describe('User Routes Tests', () => {
    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        await User.deleteMany({});

        // Create test user
        testUser = new User({
            email: 'test@example.com',
            password: 'password123',
            name: 'Test User',
            healthProfile: {
                age: 30,
                height: 170,
                weight: 70,
                gender: 'male',
                activityLevel: 'moderate',
                dietaryRestrictions: ['vegetarian']
            },
            preferences: {
                theme: 'dark',
                notifications: true
            }
        });
        await testUser.save();

        // Generate auth token
        authToken = generateToken({ userId: testUser._id });
    });

    describe('GET /profile', () => {
        it('should get user profile', async () => {
            const response = await request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('email', testUser.email);
            expect(response.body).toHaveProperty('name', testUser.name);
            expect(response.body).not.toHaveProperty('password');
        });

        it('should require authentication', async () => {
            await request(app)
                .get('/api/users/profile')
                .expect(401);
        });
    });

    describe('PUT /profile', () => {
        it('should update user profile', async () => {
            const updatedProfile = {
                name: 'Updated Name',
                email: 'updated@example.com'
            };

            const response = await request(app)
                .put('/api/users/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .send(updatedProfile)
                .expect(200);

            expect(response.body.user).toHaveProperty('name', updatedProfile.name);
            expect(response.body.user).toHaveProperty('email', updatedProfile.email);
        });

        it('should require authentication', async () => {
            await request(app)
                .put('/api/users/profile')
                .send({ name: 'New Name' })
                .expect(401);
        });
    });

    describe('PUT /health-profile', () => {
        it('should update health profile', async () => {
            const newProfile = {
                age: 35,
                height: 175,
                weight: 75,
                gender: 'male',
                activityLevel: 'high',
                dietaryRestrictions: ['vegan']
            };

            const response = await request(app)
                .put('/api/users/health-profile')
                .set('Authorization', `Bearer ${authToken}`)
                .send(newProfile)
                .expect(200);

            expect(response.body.healthProfile).toMatchObject(newProfile);
        });

        it('should require authentication', async () => {
            await request(app)
                .put('/api/users/health-profile')
                .send({ age: 35 })
                .expect(401);
        });

        it('should validate required fields', async () => {
            const invalidProfile = {
                age: 35 // Missing required fields
            };

            await request(app)
                .put('/api/users/health-profile')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidProfile)
                .expect(400);
        });
    });

    describe('GET /preferences', () => {
        it('should get user preferences', async () => {
            const response = await request(app)
                .get('/api/users/preferences')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toMatchObject(testUser.preferences);
        });

        it('should require authentication', async () => {
            await request(app)
                .get('/api/users/preferences')
                .expect(401);
        });
    });

    describe('PUT /preferences', () => {
        it('should update preferences', async () => {
            const newPreferences = {
                theme: 'light',
                notifications: false
            };

            const response = await request(app)
                .put('/api/users/preferences')
                .set('Authorization', `Bearer ${authToken}`)
                .send(newPreferences)
                .expect(200);

            expect(response.body.preferences).toMatchObject(newPreferences);
        });

        it('should require authentication', async () => {
            await request(app)
                .put('/api/users/preferences')
                .send({ theme: 'light' })
                .expect(401);
        });

        it('should merge with existing preferences', async () => {
            const partialPreferences = {
                theme: 'light'
            };

            const response = await request(app)
                .put('/api/users/preferences')
                .set('Authorization', `Bearer ${authToken}`)
                .send(partialPreferences)
                .expect(200);

            expect(response.body.preferences).toMatchObject({
                ...testUser.preferences,
                ...partialPreferences
            });
        });
    });
});
