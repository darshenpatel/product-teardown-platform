const request = require('supertest');
const fs = require('fs/promises');
const path = require('path');

const mockOpenAiCreate = jest.fn();

function buildGoodAnalysisPayload(overrides = {}) {
  const sections = {
    onboarding: [
      '**Onboarding Flow**',
      '- Linear moves new teams through workspace creation, team/project setup, and issue creation so the first useful artifact appears quickly.',
      '**Time to Value**',
      '- The first meaningful result is a populated project board, which helps users understand the workflow before inviting the whole team.',
      '**Highlights**',
      '- Observation: templates and defaults reduce blank-page setup. Implication: teams can evaluate fit faster. Action: mirror this with a guided first project.',
    ].join('\n'),
    pricing: [
      '**Pricing Model**',
      '- Linear uses a SaaS team-tier model with a low-friction entry path and paid expansion as teams standardize work management.',
      '**Tiers**',
      '- Free/startup-friendly entry, paid team plans, and enterprise packaging create a path from trial to organization-wide adoption.',
      '**Strategy**',
      '- Observation: pricing follows team maturity. Implication: users can start before procurement. Action: keep entry friction low and gate advanced admin value.',
      '**Competitive Position**',
      '- Linear competes on speed and opinionated workflow rather than broad-suite breadth, which supports premium positioning for product teams.',
    ].join('\n'),
    valueProps: [
      '**Primary Value**',
      '- Linear helps product and engineering teams move planning, issue tracking, and execution through a fast, keyboard-friendly workflow.',
      '**Secondary Benefits**',
      '- Teams get cleaner rituals, fewer status meetings, and a shared operating rhythm across roadmap and execution work.',
      '**Target Audience**',
      '- Product-minded engineering teams benefit most because the product rewards teams that already care about structured execution.',
      '**Differentiators**',
      '- Observation: the product emphasizes speed and craft. Implication: it attracts teams frustrated by heavyweight tools. Action: make performance part of the promise.',
    ].join('\n'),
    competitive: [
      '**Strengths**',
      '- Fast interface, strong product taste, and opinionated workflows make execution feel lighter for modern software teams.',
      '**Weaknesses**',
      '- Narrower breadth can be a limitation for companies that want one broad work-management platform for every department.',
      '**Opportunities**',
      '- Linear can expand deeper into planning rituals while preserving the speed and clarity that differentiated the product.',
      '**Threats**',
      '- Larger suites can bundle issue tracking into broader collaboration contracts and reduce willingness to adopt a separate tool.',
    ].join('\n'),
    actionPlan: [
      '**What to copy**',
      '- Copy the guided first-project path, opinionated defaults, and fast transition from signup to useful workspace artifact.',
      '**What to avoid**',
      '- Avoid copying surface polish without matching the workflow speed that makes the polish meaningful to users.',
      '**Experiments to run**',
      '- Hypothesis: a template-led setup will increase activation. Metric: percentage of new users creating a first project. Expected decision: ship if activation rises by 15%.',
      '**Metrics to watch**',
      '- Track time to first project, invite rate, week-one retained workspaces, and conversion from free to paid team usage.',
      '**Open questions**',
      '- Which first-run action most predicts retention, and which pricing gates users understand before talking to sales?',
    ].join('\n'),
    deltaVsMyProduct: 'Analysis not available for this section.',
  };

  return {
    summary: {
      headline: 'Linear wins by turning team planning into a fast, opinionated workflow.',
      topTakeaways: [
        'Reduce first-run ambiguity with opinionated setup defaults.',
        'Tie paid expansion to team maturity rather than initial exploration.',
        'Make workflow speed a product promise, not just a UI detail.',
      ],
      keyRisks: ['Authenticated onboarding details are inferred in test mode.'],
      openQuestions: ['Which activation milestone best predicts paid conversion?'],
      recommendedNextMove: 'Prototype a guided first-project setup and measure activation.',
    },
    sections,
    quality: {
      confidenceNotes: ['Test output is deterministic and not externally sourced.'],
      evidenceGaps: ['Evidence ingestion is disabled in test environment.'],
    },
    ...overrides,
  };
}

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
            content: JSON.stringify(buildGoodAnalysisPayload()),
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
    expect(mockOpenAiCreate.mock.calls[0][0].model).toBe('gpt-5.2');
    expect(response.body).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          id: expect.stringMatching(/^analysis_\d+_[a-z0-9]{9}$/),
          product_name: 'Linear',
          product_url: 'https://linear.app',
          user_goals: 'Focus on onboarding and pricing',
          focus_preset: 'general',
          ai_provider: 'openai',
          created_at: expect.any(String),
          analysis_data: expect.objectContaining({
            generatedAt: expect.any(String),
            model: 'gpt-5.2',
            diagnostics: expect.objectContaining({
              provider: 'openai',
              model: 'gpt-5.2',
              retried: false,
              retryCount: 0,
              sourceCount: 0,
              qualityPassed: true,
              qualityWarningCount: 0,
              generationTimeMs: expect.any(Number),
            }),
            rawAnalysis: expect.stringContaining('## 1. User Onboarding'),
            sources: [],
            summary: expect.objectContaining({
              headline: expect.stringContaining('Linear wins'),
              topTakeaways: expect.arrayContaining([
                expect.stringContaining('opinionated setup'),
              ]),
              recommendedNextMove: expect.stringContaining('guided first-project'),
            }),
            quality: expect.objectContaining({
              confidenceNotes: ['Test output is deterministic and not externally sourced.'],
              evidenceGaps: ['Evidence ingestion is disabled in test environment.'],
              passed: true,
              retried: false,
            }),
            sections: expect.objectContaining({
              onboarding: expect.stringContaining('workspace creation'),
              pricing: expect.stringContaining('team-tier'),
              valueProps: expect.stringContaining('keyboard-friendly workflow'),
              competitive: expect.stringContaining('Fast interface'),
              actionPlan: expect.stringContaining('template-led setup'),
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
                claims: expect.any(Array),
              }),
            }),
          }),
        }),
      })
    );
  });

  it('retries once when generated analysis fails the quality guard', async () => {
    mockOpenAiCreate
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                sections: {
                  onboarding: '**Onboarding Flow**\n- To analyze onboarding, review signup.',
                  pricing: '**Pricing Model**\n- Analysis content available.',
                  valueProps: '**Primary Value**\n- A specific strength of the product.',
                  competitive: '**Strengths**\n- Another specific strength.',
                  actionPlan: '**Experiments to run**\n- Test something.',
                  deltaVsMyProduct: '',
                },
              }),
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(buildGoodAnalysisPayload({
                quality: {
                  confidenceNotes: ['Corrected after quality feedback.'],
                  evidenceGaps: [],
                },
              })),
            },
          },
        ],
      });

    const response = await request(app)
      .post('/api/analysis')
      .send({
        productName: 'Linear',
        aiProvider: 'openai',
      })
      .expect(201);

    expect(mockOpenAiCreate).toHaveBeenCalledTimes(2);
    expect(mockOpenAiCreate.mock.calls[1][0].messages[1].content).toContain('QUALITY FIX REQUIRED');
    expect(response.body.data.analysis_data.sections.actionPlan).toContain('template-led setup');
    expect(response.body.data.analysis_data.quality).toEqual(expect.objectContaining({
      passed: true,
      retried: true,
    }));
    expect(response.body.data.analysis_data.diagnostics).toEqual(expect.objectContaining({
      retried: true,
      retryCount: 1,
      qualityPassed: true,
    }));
  });

  it('persists focus presets and injects preset guidance into the prompt', async () => {
    const response = await request(app)
      .post('/api/analysis')
      .send({
        productName: 'Linear',
        focusPreset: 'pricing',
        aiProvider: 'openai',
      })
      .expect(201);

    expect(response.body.data.focus_preset).toBe('pricing');
    expect(mockOpenAiCreate.mock.calls[0][0].messages[1].content).toContain('TEARDOWN FOCUS PRESET: Pricing & packaging');
  });

  it('uses OPENAI_MODEL override when configured', async () => {
    jest.resetModules();
    mockOpenAiCreate.mockReset();
    mockOpenAiCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify(buildGoodAnalysisPayload()),
          },
        },
      ],
    });

    process.env = {
      ...process.env,
      OPENAI_MODEL: 'gpt-5.5',
    };

    const overrideApp = require('../app');

    const response = await request(overrideApp)
      .post('/api/analysis')
      .send({
        productName: 'Linear',
        aiProvider: 'openai',
      })
      .expect(201);

    expect(mockOpenAiCreate).toHaveBeenCalledTimes(1);
    expect(mockOpenAiCreate.mock.calls[0][0].model).toBe('gpt-5.5');
    expect(response.body.data.analysis_data.model).toBe('gpt-5.5');
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
