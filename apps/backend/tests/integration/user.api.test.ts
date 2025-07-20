import request from 'supertest';
import app from '../../src/app';
import { User } from '../../src/models/user.model';

describe('User API Integration Tests', () => {
  describe('POST /api/users', () => {
    it('should create a new user successfully', async () => {
      console.log('🧪 Testing user creation...');
      
      const response = await request(app)
        .post('/api/users')
        .expect(201);
      
      console.log('📊 User creation response:', response.body);
      
      // Verify response structure
      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('nickname');
      expect(response.body).toHaveProperty('color');
      
      // Verify data types and formats
      expect(typeof response.body.userId).toBe('string');
      expect(typeof response.body.nickname).toBe('string');
      expect(typeof response.body.color).toBe('string');
      expect(response.body.color).toMatch(/^#[0-9A-F]{6}$/i);
      
      // Verify user was saved to database
      const savedUser = await User.findOne({ userId: response.body.userId });
      expect(savedUser).toBeTruthy();
      expect(savedUser!.nickname).toBe(response.body.nickname);
      expect(savedUser!.color).toBe(response.body.color);
      
      // Verify session cookie was set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const userIdCookie = cookies.find((cookie: string) => cookie.startsWith('userId='));
      expect(userIdCookie).toBeDefined();
      
      console.log('✅ User creation test passed');
    });
    
    it('should create multiple unique users', async () => {
      console.log('🧪 Testing multiple user creation...');
      
      const users = [];
      
      // Create 3 users
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/api/users')
          .expect(201);
        
        users.push(response.body);
        console.log(`📊 Created user ${i + 1}:`, response.body);
      }
      
      // Verify all users have unique IDs and nicknames
      const userIds = users.map(user => user.userId);
      const nicknames = users.map(user => user.nickname);
      
      expect(new Set(userIds).size).toBe(3);
      expect(new Set(nicknames).size).toBe(3);
      
      // Verify all users are saved in database
      const savedUsers = await User.find();
      expect(savedUsers).toHaveLength(3);
      
      console.log('✅ Multiple user creation test passed');
    });
  });
  
  describe('GET /api/users/me', () => {
    it('should return current user info when authenticated', async () => {
      console.log('🧪 Testing current user retrieval...');
      
      // First create a user
      const createResponse = await request(app)
        .post('/api/users')
        .expect(201);
      
      // Extract cookie from creation response
      const cookies = createResponse.headers['set-cookie'];
      const userIdCookie = cookies.find((cookie: string) => cookie.startsWith('userId='));
      
      // Use the cookie to get current user info
      const response = await request(app)
        .get('/api/users/me')
        .set('Cookie', userIdCookie)
        .expect(200);
      
      console.log('📊 Current user response:', response.body);
      
      // Verify response matches created user
      expect(response.body.userId).toBe(createResponse.body.userId);
      expect(response.body.nickname).toBe(createResponse.body.nickname);
      expect(response.body.color).toBe(createResponse.body.color);
      
      console.log('✅ Current user retrieval test passed');
    });
    
    it('should return 401 when not authenticated', async () => {
      console.log('🧪 Testing unauthenticated access...');
      
      const response = await request(app)
        .get('/api/users/me')
        .expect(401);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Unauthorized');
      
      console.log('✅ Unauthenticated access test passed');
    });
    
    it('should return 404 when user not found in database', async () => {
      console.log('🧪 Testing non-existent user...');
      
      // Create a fake cookie with non-existent user ID
      const fakeUserId = 'user-nonexistent-123';
      const fakeCookie = `userId=${fakeUserId}`;
      
      const response = await request(app)
        .get('/api/users/me')
        .set('Cookie', fakeCookie)
        .expect(404);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Not Found');
      
      console.log('✅ Non-existent user test passed');
    });
  });
});