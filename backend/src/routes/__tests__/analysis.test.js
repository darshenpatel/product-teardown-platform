const request = require('supertest');
const express = require('express');
const analysisRouter = require('../analysis');
const { __test__ } = analysisRouter;

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

  describe('structured analysis parsing', () => {
    it('should prefer structured JSON sections when present', () => {
      const analysisText = JSON.stringify({
        sections: {
          onboarding: '**Onboarding Flow**\n- Guided workspace setup [src_1]',
          pricing: '**Pricing Model**\n- Freemium with paid team tiers [src_1]',
          valueProps: '**Primary Value**\n- Faster planning cycles',
          competitive: '**Strengths**\n- Tight execution loops',
          actionPlan: '**What to copy**\n- Shorten activation path',
          deltaVsMyProduct: '**Biggest deltas**\n- Stronger templates',
        }
      });

      const parsed = __test__.parseAnalysisResponse(analysisText, {
        sources: [{ id: 'src_1' }],
        expectsDeltaSection: true,
      });

      expect(parsed.sections.onboarding).toContain('Guided workspace setup');
      expect(parsed.sections.pricing).toContain('Freemium');
      expect(parsed.sections.deltaVsMyProduct).toContain('Stronger templates');
      expect(parsed.evidence.onboarding.sourceIds).toEqual(['src_1']);
      expect(parsed.rawAnalysis).toContain('## 1. User Onboarding');
    });

    it('should parse fenced JSON output', () => {
      const analysisText = [
        'Here is the analysis payload:',
        '```json',
        JSON.stringify({
          sections: {
            onboarding: 'Guided setup',
            pricing: 'Tiered plans',
            valueProps: 'Cross-functional visibility',
            competitive: 'Fast issue triage',
            actionPlan: 'Run onboarding experiment',
            deltaVsMyProduct: '',
          }
        }, null, 2),
        '```'
      ].join('\n');

      const parsed = __test__.parseAnalysisResponse(analysisText, {
        expectsDeltaSection: false,
      });

      expect(parsed.sections.onboarding).toBe('Guided setup');
      expect(parsed.sections.actionPlan).toBe('Run onboarding experiment');
      expect(parsed.sections.deltaVsMyProduct).toBe('Analysis not available for this section.');
    });

    it('should fall back to markdown extraction when structured output is malformed', () => {
      const analysisText = [
        '## 1. User Onboarding',
        'Strong activation with templates.',
        '',
        '## 2. Pricing Strategy',
        'Tiered pricing with a freemium entry point.',
        '',
        '## 3. Value Propositions',
        'Clear collaboration benefits.',
        '',
        '## 4. Competitive Differentiation',
        'Strong execution and product polish.',
        '',
        '## 5. Action Plan / Next Steps',
        'Test a faster workspace setup flow.',
      ].join('\n');

      const parsed = __test__.parseAnalysisResponse(`{"sections": "oops"}\n${analysisText}`, {
        expectsDeltaSection: false,
      });

      expect(parsed.sections.onboarding).toContain('Strong activation');
      expect(parsed.sections.pricing).toContain('Tiered pricing');
      expect(parsed.rawAnalysis).toContain('## 1. User Onboarding');
    });
  });
});
