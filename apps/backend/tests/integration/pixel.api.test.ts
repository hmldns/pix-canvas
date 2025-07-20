import request from 'supertest';
import app from '../../src/app';
import { Pixel } from '../../src/models/pixel.model';

describe('Pixel API Integration Tests', () => {
  describe('GET /api/pixels', () => {
    it('should return empty canvas when no pixels exist', async () => {
      console.log('🧪 Testing empty canvas retrieval...');
      
      const response = await request(app)
        .get('/api/pixels')
        .expect(200);
      
      console.log('📊 Empty canvas response:', response.body);
      
      // Verify response structure
      expect(response.body).toHaveProperty('pixels');
      expect(Array.isArray(response.body.pixels)).toBe(true);
      expect(response.body.pixels).toHaveLength(0);
      
      console.log('✅ Empty canvas test passed');
    });
    
    it('should return current canvas state with existing pixels', async () => {
      console.log('🧪 Testing canvas with existing pixels...');
      
      // Create test pixels directly in database
      const testPixels = [
        { x: 0, y: 0, color: '#FF0000', userId: 'test-user-1', timestamp: new Date('2024-01-01T10:00:00Z') },
        { x: 1, y: 0, color: '#00FF00', userId: 'test-user-2', timestamp: new Date('2024-01-01T11:00:00Z') },
        { x: 0, y: 0, color: '#0000FF', userId: 'test-user-1', timestamp: new Date('2024-01-01T12:00:00Z') }, // Overwrites first pixel
        { x: 10, y: 10, color: '#FFFFFF', userId: 'test-user-3', timestamp: new Date('2024-01-01T13:00:00Z') },
      ];
      
      await Pixel.insertMany(testPixels);
      console.log('📊 Created test pixels in database');
      
      const response = await request(app)
        .get('/api/pixels')
        .expect(200);
      
      console.log('📊 Canvas state response:', response.body);
      
      // Verify response structure
      expect(response.body).toHaveProperty('pixels');
      expect(Array.isArray(response.body.pixels)).toBe(true);
      
      // Should return 3 pixels (last-write-wins for coordinate 0,0)
      expect(response.body.pixels).toHaveLength(3);
      
      // Verify pixel structure
      response.body.pixels.forEach((pixel: any) => {
        expect(pixel).toHaveProperty('x');
        expect(pixel).toHaveProperty('y');
        expect(pixel).toHaveProperty('color');
        expect(typeof pixel.x).toBe('number');
        expect(typeof pixel.y).toBe('number');
        expect(typeof pixel.color).toBe('string');
        expect(pixel.color).toMatch(/^#[0-9A-F]{6}$/i);
      });
      
      // Verify last-write-wins logic (pixel at 0,0 should be blue)
      const pixelAt00 = response.body.pixels.find((p: any) => p.x === 0 && p.y === 0);
      expect(pixelAt00).toBeTruthy();
      expect(pixelAt00.color).toBe('#0000FF');
      
      console.log('✅ Canvas with pixels test passed');
    });
  });
  
  describe('GET /api/pixels/region', () => {
    beforeEach(async () => {
      // Setup test pixels for region tests
      const testPixels = [
        { x: 0, y: 0, color: '#FF0000', userId: 'test-user-1', timestamp: new Date() },
        { x: 1, y: 1, color: '#00FF00', userId: 'test-user-2', timestamp: new Date() },
        { x: 5, y: 5, color: '#0000FF', userId: 'test-user-3', timestamp: new Date() },
        { x: 10, y: 10, color: '#FFFFFF', userId: 'test-user-4', timestamp: new Date() },
      ];
      
      await Pixel.insertMany(testPixels);
    });
    
    it('should return pixels in specified region', async () => {
      console.log('🧪 Testing region pixel retrieval...');
      
      const response = await request(app)
        .get('/api/pixels/region')
        .query({ minX: 0, minY: 0, maxX: 2, maxY: 2 })
        .expect(200);
      
      console.log('📊 Region pixels response:', response.body);
      
      // Should return 2 pixels within the region (0,0) and (1,1)
      expect(response.body.pixels).toHaveLength(2);
      
      // Verify all pixels are within the requested region
      response.body.pixels.forEach((pixel: any) => {
        expect(pixel.x).toBeGreaterThanOrEqual(0);
        expect(pixel.x).toBeLessThanOrEqual(2);
        expect(pixel.y).toBeGreaterThanOrEqual(0);
        expect(pixel.y).toBeLessThanOrEqual(2);
      });
      
      console.log('✅ Region pixel retrieval test passed');
    });
    
    it('should return empty array for region with no pixels', async () => {
      console.log('🧪 Testing empty region...');
      
      const response = await request(app)
        .get('/api/pixels/region')
        .query({ minX: 100, minY: 100, maxX: 200, maxY: 200 })
        .expect(200);
      
      expect(response.body.pixels).toHaveLength(0);
      
      console.log('✅ Empty region test passed');
    });
    
    it('should return 400 for missing query parameters', async () => {
      console.log('🧪 Testing missing parameters...');
      
      const response = await request(app)
        .get('/api/pixels/region')
        .query({ minX: 0, minY: 0 }) // Missing maxX and maxY
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Bad Request');
      
      console.log('✅ Missing parameters test passed');
    });
    
    it('should return 400 for invalid coordinates', async () => {
      console.log('🧪 Testing invalid coordinates...');
      
      const response = await request(app)
        .get('/api/pixels/region')
        .query({ minX: 'invalid', minY: 0, maxX: 10, maxY: 10 })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Bad Request');
      
      console.log('✅ Invalid coordinates test passed');
    });
    
    it('should return 400 for out-of-bounds coordinates', async () => {
      console.log('🧪 Testing out-of-bounds coordinates...');
      
      const response = await request(app)
        .get('/api/pixels/region')
        .query({ minX: -1, minY: 0, maxX: 10, maxY: 10 })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Bad Request');
      
      console.log('✅ Out-of-bounds coordinates test passed');
    });
  });
});