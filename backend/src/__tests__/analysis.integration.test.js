const request = require('supertest');
const fs = require('fs/promises');
const path = require('path');

const mockOpenAiCreate = jest.fn();

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockOpenAiCreate,
      },
    },
  }));
});

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn(),
    },
  }));
});

describe('POST /api/analysis integration', () => {
  let app;
  let originalEnv;
  let mockConsoleLog;
  let mockConsoleWarn;
  let mockConsoleError;
  let dataDir;

  beforeEach(async () => {
    jest.resetModules();
    mockOpenAiCreate.mockReset();

    dataDir = path.join('/tmp', `ptp-analysis-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
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

    mockOpenAiCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              sections: {
                onboarding: '**Onboarding Flow**\n- Guided workspace setup',
                pricing: '**Pricing Model**\n- Freemium plus team tiers',
                valueProps: '**Primary Value**\n- Faster planning cycles',
                competitive: '**Strengths**\n- Tight execution loops',
                actionPlan: '**What to copy**\n- Shorten activation path',
                deltaVsMyProduct: '',
              },
            }),
          },
        },
      ],
    });

    app = require('../app');
  });

  afterEach(async () => {
    process.env = originalEnv;
    mockConsoleLog.mockRestore();
    mockConsoleWarn.mockRestore();
    mockConsoleError.mockRestore();
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  it('returns the expected teardown contract for a successful OpenAI analysis', async () => {
    const response = await request(app)
      .post('/api/analysis')
      .send({
        productName: 'Linear',
        productUrl: 'https://linear.app',
        userGoals: 'Focus on onboarding and pricing',
        aiProvider: 'openai',
      })
      .expect(201);

    expect(mockOpenAiCreate).toHaveBeenCalledTimes(1);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          id: expect.stringMatching(/^analysis_\d+_[a-z0-9]{9}$/),
          product_name: 'Linear',
          product_url: 'https://linear.app',
          user_goals: 'Focus on onboarding and pricing',
          ai_provider: 'openai',
          created_at: expect.any(String),
          analysis_data: expect.objectContaining({
            generatedAt: expect.any(String),
            rawAnalysis: expect.stringContaining('## 1. User Onboarding'),
            sources: [],
            sections: expect.objectContaining({
              onboarding: expect.stringContaining('Guided workspace setup'),
              pricing: expect.stringContaining('Freemium plus team tiers'),
              valueProps: expect.stringContaining('Faster planning cycles'),
              competitive: expect.stringContaining('Tight execution loops'),
              actionPlan: expect.stringContaining('Shorten activation path'),
              deltaVsMyProduct: 'Analysis not available for this section.',
            }),
            evidence: expect.objectContaining({
              overall: expect.objectContaining({
                basis: 'inferred',
                confidence: expect.any(Number),
                limitations: ['Evidence ingestion disabled in test environment.'],
              }),
              onboarding: expect.objectContaining({
                basis: 'inferred',
                sourceIds: [],
              }),
            }),
          }),
        }),
      })
    );
  });

  it('persists analyses so they can be listed, updated, and deleted', async () => {
    const createResponse = await request(app)
      .post('/api/analysis')
      .send({
        productName: 'Linear',
        productUrl: 'https://linear.app',
        aiProvider: 'openai',
      })
      .expect(201);

    const created = createResponse.body.data;

    const listResponse = await request(app)
      .get('/api/analysis')
      .expect(200);

    expect(listResponse.body).toEqual({
      success: true,
      data: [expect.objectContaining({ id: created.id, product_name: 'Linear' })],
    });

    const updated = {
      ...created,
      analysis_data: {
        ...created.analysis_data,
        sections: {
          ...created.analysis_data.sections,
          actionPlan: '**What to copy**\n- Launch guided templates first',
        },
        edits: {
          actionPlan: {
            updatedAt: new Date().toISOString(),
          },
        },
      },
    };

    const updateResponse = await request(app)
      .put(`/api/analysis/${created.id}`)
      .send(updated)
      .expect(200);

    expect(updateResponse.body.data.analysis_data.sections.actionPlan).toContain('Launch guided templates first');

    const deleteResponse = await request(app)
      .delete(`/api/analysis/${created.id}`)
      .expect(200);

    expect(deleteResponse.body).toEqual({ success: true });

    const finalListResponse = await request(app)
      .get('/api/analysis')
      .expect(200);

    expect(finalListResponse.body).toEqual({
      success: true,
      data: [],
    });
  });
});
