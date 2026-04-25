const request = require('supertest');
const fs = require('fs/promises');
const path = require('path');

describe('Feedback persistence integration', () => {
  let app;
  let originalEnv;
  let mockConsoleLog;
  let mockConsoleWarn;
  let mockConsoleError;
  let dataDir;

  beforeEach(async () => {
    jest.resetModules();

    dataDir = path.join('/tmp', `ptp-feedback-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    await fs.rm(dataDir, { recursive: true, force: true });

    originalEnv = process.env;
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      OPENAI_API_KEY: 'sk-1234567890abcdef1234567890abcdef1234567890abcdef123',
      CORS_ORIGIN: 'http://localhost:5173',
      PTP_DATA_DIR: dataDir,
    };

    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    app = require('../app');
  });

  afterEach(async () => {
    process.env = originalEnv;
    mockConsoleLog.mockRestore();
    mockConsoleWarn.mockRestore();
    mockConsoleError.mockRestore();
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  it('persists feedback submissions and lists them back', async () => {
    const createResponse = await request(app)
      .post('/api/feedback')
      .send({
        analysisId: 'analysis_123',
        productName: 'Linear',
        rating: 'up',
        comment: 'The evidence summary was strong.',
        context: {
          aiProvider: 'openai',
          sourceCount: 2,
        },
      })
      .expect(201);

    expect(createResponse.body).toEqual({
      success: true,
      data: expect.objectContaining({
        id: expect.stringMatching(/^fb_\d+_[a-z0-9]{8}$/),
        analysisId: 'analysis_123',
        productName: 'Linear',
        rating: 'up',
        comment: 'The evidence summary was strong.',
        context: {
          aiProvider: 'openai',
          sourceCount: 2,
        },
        created_at: expect.any(String),
      }),
    });

    const listResponse = await request(app)
      .get('/api/feedback')
      .expect(200);

    expect(listResponse.body).toEqual({
      success: true,
      data: [expect.objectContaining({
        analysisId: 'analysis_123',
        productName: 'Linear',
        rating: 'up',
      })],
    });
  });
});
