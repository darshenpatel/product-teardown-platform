const request = require('supertest');
const express = require('express');
const analysisRouter = require('../analysis');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/analysis', analysisRouter);

describe('Analysis Route', () => {
  describe('POST /api/analysis', () => {
    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/analysis')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('"productName" is required');
    });

    it('should validate product name length', async () => {
      const response = await request(app)
        .post('/api/analysis')
        .send({
          productName: 'a'.repeat(201) // Exceeds 200 char limit
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should validate URL format when provided', async () => {
      const response = await request(app)
        .post('/api/analysis')
        .send({
          productName: 'TestProduct',
          productUrl: 'not-a-valid-url'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should validate AI provider options', async () => {
      const response = await request(app)
        .post('/api/analysis')
        .send({
          productName: 'TestProduct',
          aiProvider: 'invalid-provider'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should return error when no API keys configured', async () => {
      // Clear env vars for this test
      const originalOpenAI = process.env.OPENAI_API_KEY;
      const originalAnthropic = process.env.ANTHROPIC_API_KEY;
      
      delete process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      const response = await request(app)
        .post('/api/analysis')
        .send({
          productName: 'TestProduct',
          aiProvider: 'openai'
        })
        .expect(500);

      expect(response.body).toHaveProperty('error', 'OpenAI API not configured');

      // Restore env vars
      if (originalOpenAI) process.env.OPENAI_API_KEY = originalOpenAI;
      if (originalAnthropic) process.env.ANTHROPIC_API_KEY = originalAnthropic;
    });

    it('should accept valid request structure', async () => {
      const validRequest = {
        productName: 'TestProduct',
        productUrl: 'https://example.com',
        userGoals: 'Test goals',
        aiProvider: 'openai'
      };

      // This will fail due to missing API key, but we're testing validation
      const response = await request(app)
        .post('/api/analysis')
        .send(validRequest);

      // Should pass validation (400 = validation error, 500 = API error)
      expect(response.status).not.toBe(400);
    });
  });
});