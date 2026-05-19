const express = require('express');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const { ingestProductEvidence } = require('../utils/urlEvidence');
const { hasTurnstileConfigured, verifyTurnstileToken } = require('../utils/turnstile');
const fileStore = require('../utils/fileStore');

const router = express.Router();
const MISSING_SECTION_TEXT = 'Analysis not available for this section.';
const SYSTEM_PROMPT = [
  'You are a product analysis expert with deep knowledge of software products and business models.',
  'You MUST provide specific, detailed analysis about the exact product requested - never generic frameworks or instructional content.',
  'Base your analysis on actual product knowledge and provided evidence, and make reasonable labeled inferences when needed.',
  'If evidence sources are provided, use them as grounding context and add citations like [src_1] when referencing them.',
  'Return ONLY valid JSON that matches the requested schema.'
].join(' ');
const DEFAULT_OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5.2';
const DEFAULT_ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-1-20250805';
const FOCUS_PRESETS = {
  general: {
    label: 'General teardown',
    guidance: 'Balance onboarding, pricing, value proposition, differentiation, and action plan equally.',
  },
  onboarding: {
    label: 'Onboarding & activation',
    guidance: 'Emphasize first-run experience, activation moments, time to value, setup friction, invitation loops, and activation metrics.',
  },
  pricing: {
    label: 'Pricing & packaging',
    guidance: 'Emphasize packaging, tiers, monetization levers, buyer objections, expansion paths, and pricing experiments.',
  },
  positioning: {
    label: 'Positioning & differentiation',
    guidance: 'Emphasize ICP, messaging, competitive alternatives, category framing, proof points, and defensible differentiation.',
  },
  growth: {
    label: 'Growth opportunities',
    guidance: 'Emphasize acquisition loops, retention drivers, expansion opportunities, product-led growth signals, and concrete experiments.',
  },
};
const SECTION_ORDER = [
  ['onboarding', 'User Onboarding'],
  ['pricing', 'Pricing Strategy'],
  ['valueProps', 'Value Propositions'],
  ['competitive', 'Competitive Differentiation'],
  ['actionPlan', 'Action Plan / Next Steps'],
  ['deltaVsMyProduct', 'Delta vs My product'],
];

// Initialize AI clients
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null;

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
}) : null;

// Rate limit for analysis endpoint
const analysisLimit = rateLimit({
  windowMs: parseInt(process.env.ANALYSIS_RATE_LIMIT_WINDOW_MS) || 60 * 60 * 1000, // Default: 1 hour
  max: parseInt(process.env.ANALYSIS_RATE_LIMIT_MAX_REQUESTS) || 10, // Default: 10 analyses per hour per IP
  message: { error: 'Analysis rate limit exceeded. Try again in an hour.' }
});

// Lightweight per-instance concurrency fuse (helps prevent runaway cost under bursts/bots).
let inFlightAnalyses = 0;
const maxInFlightAnalyses = parseInt(process.env.ANALYSIS_MAX_CONCURRENCY) || 3;

// Validation schema
const analysisSchema = Joi.object({
  productName: Joi.string().min(1).max(200).required(),
  productUrl: Joi.string().uri().optional(),
  userGoals: Joi.string().max(1000).optional(),
  focusPreset: Joi.string().valid(...Object.keys(FOCUS_PRESETS)).default('general'),
  aiProvider: Joi.string().valid('openai', 'anthropic').default('openai'),
  turnstileToken: Joi.string().max(5000).optional(),
  myProduct: Joi.object({
    name: Joi.string().min(1).max(200).required(),
    url: Joi.string().uri().optional(),
    notes: Joi.string().max(2000).optional(),
  }).optional(),
});

const persistedAnalysisSchema = Joi.object({
  id: Joi.string().min(1).max(200).required(),
  product_name: Joi.string().min(1).max(200).required(),
  product_url: Joi.string().uri().allow('', null).optional(),
  my_product: Joi.object({
    name: Joi.string().min(1).max(200).required(),
    url: Joi.string().uri().allow('', null).optional(),
    notes: Joi.string().max(2000).allow('', null).optional(),
  }).allow(null).optional(),
  user_goals: Joi.string().max(1000).allow('', null).optional(),
  focus_preset: Joi.string().valid(...Object.keys(FOCUS_PRESETS)).allow('', null).optional(),
  ai_provider: Joi.string().valid('openai', 'anthropic').required(),
  analysis_data: Joi.object({
    sections: Joi.object().required(),
    evidence: Joi.object().required(),
    sources: Joi.array().required(),
    rawAnalysis: Joi.string().required(),
    generatedAt: Joi.string().required(),
    model: Joi.string().max(200).optional(),
    summary: Joi.object().unknown(true).optional(),
    quality: Joi.object().unknown(true).optional(),
    diagnostics: Joi.object().unknown(true).optional(),
    originalSections: Joi.object().optional(),
    edits: Joi.object().optional(),
  }).required(),
  created_at: Joi.string().required(),
}).required();

router.get('/', async (req, res) => {
  try {
    const analyses = await fileStore.list('analyses');
    return res.json({
      success: true,
      data: analyses,
    });
  } catch (error) {
    console.error('Failed to list analyses:', error);
    return res.status(500).json({
      error: 'Failed to list analyses',
      message: error.message || 'Unable to load saved analyses.',
    });
  }
});

// POST /api/analysis - Create new analysis
router.post('/', analysisLimit, async (req, res) => {
  let aiProviderForError = 'openai';
  try {
    if (inFlightAnalyses >= maxInFlightAnalyses) {
      return res.status(503).json({
        error: 'Server busy',
        message: 'Too many analyses in progress. Please try again in a moment.'
      });
    }
    inFlightAnalyses += 1;

    // Log incoming request data for debugging
    console.log('📥 Analysis request received:', JSON.stringify(req.body, null, 2));

    // Validate input
    const { error, value } = analysisSchema.validate(req.body);
    if (error) {
      console.log('❌ Validation failed:', error.details.map(d => d.message));
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const { productName, productUrl, userGoals, focusPreset, aiProvider, myProduct, turnstileToken } = value;
    aiProviderForError = aiProvider;

    // Anti-abuse: require Turnstile token only when configured.
    // This keeps local/dev and test environments frictionless.
    if (process.env.NODE_ENV !== 'test' && hasTurnstileConfigured()) {
      const verification = await verifyTurnstileToken({
        token: turnstileToken,
        remoteip: req.ip,
      });
      if (!verification.success) {
        return res.status(403).json({
          error: 'Verification failed',
          message: 'Captcha verification failed. Please retry.',
          // Useful for debugging configuration; not sensitive.
          codes: verification.errorCodes,
        });
      }
    }

    // Fail fast if provider isn't configured (avoids unnecessary URL fetching)
    if (aiProvider === 'anthropic' && !anthropic) {
      return res.status(500).json({
        error: 'Anthropic API not configured',
        message: 'Anthropic API key is missing. Please try OpenAI instead.'
      });
    }

    if (aiProvider !== 'anthropic' && !openai) {
      return res.status(500).json({
        error: 'OpenAI API not configured',
        message: 'OpenAI API key is missing. Please configure API keys.'
      });
    }

    // Optional evidence ingestion (hybrid evidence): fetch URL + common pages and pass to the model as context.
    // Disable network fetching during tests to keep them deterministic.
    const evidence = process.env.NODE_ENV === 'test'
      ? { sources: [], contextForPrompt: '', limitations: ['Evidence ingestion disabled in test environment.'] }
      : await ingestProductEvidence(productUrl);

    const expectsDeltaSection = Boolean(myProduct && myProduct.name);

    const structuredAnalysis = await generateQualityCheckedAnalysis({
      aiProvider,
      productName,
      productUrl,
      userGoals,
      focusPreset,
      evidence,
      myProduct,
      expectsDeltaSection,
    });

    const persistedAnalysis = {
      id: generateId(),
      product_name: productName,
      product_url: productUrl,
      my_product: myProduct,
      user_goals: userGoals,
      focus_preset: focusPreset,
      ai_provider: aiProvider,
      analysis_data: structuredAnalysis,
      created_at: new Date().toISOString()
    };

    await fileStore.save('analyses', persistedAnalysis);

    res.status(201).json({
      success: true,
      data: persistedAnalysis
    });

  } catch (error) {
    console.error('Analysis creation failed:', error);
    console.error('Error details:', {
      code: error.code,
      status: error.status,
      message: error.message,
      response: error.response?.data || error.response
    });
    
    // Handle authentication errors first
    if (error.status === 401 || error.code === 'invalid_api_key' || error.code === 'authentication_error') {
      return res.status(401).json({
        error: 'API authentication failed',
        message: `Invalid ${aiProviderForError === 'anthropic' ? 'Anthropic' : 'OpenAI'} API key. Please check your API key in the .env file.`
      });
    }
    
    // Handle quota/rate limit errors
    if (error.code === 'insufficient_quota' || error.status === 429 || error.response?.status === 429) {
      const isQuotaError = error.code === 'insufficient_quota' || error.message?.toLowerCase().includes('quota');
      return res.status(429).json({
        error: isQuotaError ? 'API quota exceeded' : 'Rate limit exceeded',
        message: isQuotaError 
          ? `Your ${aiProviderForError === 'anthropic' ? 'Anthropic' : 'OpenAI'} API quota has been exceeded. Please check your API account or try the other provider.`
          : 'Too many requests. Please wait a moment and try again.'
      });
    }
    
    // Handle other API errors
    if (error.response?.data) {
      return res.status(error.status || 500).json({
        error: 'API error',
        message: error.response.data.error?.message || error.message || 'Unable to generate analysis. Please try again.'
      });
    }
    
    res.status(500).json({
      error: 'Analysis creation failed',
      message: error.message || 'Unable to generate analysis. Please try again.'
    });
  } finally {
    inFlightAnalyses = Math.max(0, inFlightAnalyses - 1);
  }
});

router.put('/:id', async (req, res) => {
  try {
    const existing = await fileStore.findById('analyses', req.params.id);
    if (!existing) {
      return res.status(404).json({
        error: 'Analysis not found',
        message: 'The requested analysis could not be found.',
      });
    }

    const candidate = {
      ...req.body,
      id: req.params.id,
    };

    const { error, value } = persistedAnalysisSchema.validate(candidate);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map((detail) => detail.message),
      });
    }

    await fileStore.save('analyses', value);

    return res.json({
      success: true,
      data: value,
    });
  } catch (error) {
    console.error('Failed to update analysis:', error);
    return res.status(500).json({
      error: 'Failed to update analysis',
      message: error.message || 'Unable to update analysis right now.',
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const existing = await fileStore.findById('analyses', req.params.id);
    if (!existing) {
      return res.status(404).json({
        error: 'Analysis not found',
        message: 'The requested analysis could not be found.',
      });
    }

    await fileStore.remove('analyses', req.params.id);
    return res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete analysis:', error);
    return res.status(500).json({
      error: 'Failed to delete analysis',
      message: error.message || 'Unable to delete analysis right now.',
    });
  }
});

router.delete('/', async (req, res) => {
  try {
    await fileStore.clear('analyses');
    return res.json({ success: true });
  } catch (error) {
    console.error('Failed to clear analyses:', error);
    return res.status(500).json({
      error: 'Failed to clear analyses',
      message: error.message || 'Unable to clear analyses right now.',
    });
  }
});

// Helper functions
async function generateQualityCheckedAnalysis({
  aiProvider,
  productName,
  productUrl,
  userGoals,
  focusPreset,
  evidence,
  myProduct,
  expectsDeltaSection,
}) {
  const startedAt = Date.now();
  let retryCount = 0;
  const model = getAnalysisModel(aiProvider);
  const prompt = buildAnalysisPrompt(productName, productUrl, userGoals, evidence.contextForPrompt, myProduct, focusPreset);
  const parseOptions = {
    sources: evidence.sources,
    evidenceLimitations: evidence.limitations,
    expectsDeltaSection,
    model,
  };

  const initialText = await callAnalysisProvider(aiProvider, prompt);
  let analysis = parseAnalysisResponse(initialText, parseOptions);
  let assessment = assessAnalysisQuality(analysis, {
    sources: evidence.sources,
    expectsDeltaSection,
  });
  let retried = false;

  if (!assessment.passed) {
    retryCount = 1;
    retried = true;
    const retryText = await callAnalysisProvider(
      aiProvider,
      buildQualityRetryPrompt(prompt, assessment.warnings)
    );
    const retryAnalysis = parseAnalysisResponse(retryText, parseOptions);
    const retryAssessment = assessAnalysisQuality(retryAnalysis, {
      sources: evidence.sources,
      expectsDeltaSection,
    });

    analysis = retryAnalysis;
    assessment = retryAssessment;
  }

  return attachQualityAssessment(analysis, assessment, {
    aiProvider,
    model,
    retryCount,
    retried,
    sourceCount: Array.isArray(evidence.sources) ? evidence.sources.length : 0,
    generationTimeMs: Date.now() - startedAt,
  });
}

async function callAnalysisProvider(aiProvider, prompt) {
  const model = getAnalysisModel(aiProvider);

  if (aiProvider === 'anthropic') {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 3500,
      temperature: 0.3,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    return response.content[0].text;
  }

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.3,
    max_tokens: 3500,
  });

  return completion.choices[0].message.content;
}

function getAnalysisModel(aiProvider) {
  return aiProvider === 'anthropic'
    ? DEFAULT_ANTHROPIC_MODEL
    : DEFAULT_OPENAI_MODEL;
}

function buildQualityRetryPrompt(originalPrompt, warnings) {
  return `${originalPrompt}

QUALITY FIX REQUIRED:
Your previous response did not meet the teardown quality bar.
Fix these issues before returning the same JSON shape:
${(warnings || []).map((warning) => `- ${warning}`).join('\n')}

Return ONLY the corrected JSON. Keep the same keys. Make every section specific, evidence-aware, and PM-actionable.`;
}

function buildAnalysisPrompt(productName, productUrl, userGoals, evidenceContextForPrompt, myProduct, focusPreset = 'general') {
  let prompt = `You are analyzing the specific product "${productName}"`;
  
  if (productUrl) {
    prompt += ` (${productUrl})`;
  }

  const hasMyProduct = Boolean(myProduct && myProduct.name);
  const totalSections = hasMyProduct ? 6 : 5;
  
  prompt += `.\n\nIMPORTANT REQUIREMENTS:
- You MUST provide specific, actionable analysis about ${productName} only
- DO NOT provide generic frameworks, templates, or instructional content
- DO NOT say things like "To analyze..." or "Framework to apply..." or "I'd recommend visiting..."
- You MUST base your analysis on actual knowledge of ${productName}
- If you don't have specific information, make reasonable inferences based on typical patterns for similar products and label them as inferred
- Return ONLY valid JSON
- Do NOT wrap the JSON in markdown fences
- Each section value must be a markdown string with scannable bullets/subheadings
- Keep inline citations like [src_1] inside the markdown strings when evidence supports a claim
- Every section must connect: observation -> implication -> action
- Avoid generic strategy language unless it is tied directly to ${productName}
- The action plan experiments must include a hypothesis, success metric, and expected decision

Provide detailed analysis in exactly these ${totalSections} sections:

## 1. User Onboarding
**Onboarding Flow**: Describe the actual steps new users take when first using ${productName}
**Time to Value**: How quickly do users get their first meaningful result or benefit
**Highlights**: What makes their onboarding experience stand out or work well

## 2. Pricing Strategy  
**Pricing Model**: What specific pricing approach does ${productName} use (freemium, per-seat, tiered, etc.)
**Tiers**: List their actual pricing tiers with approximate costs and key features
**Strategy**: Why this pricing model works for their target market and business model
**Competitive Position**: How their pricing compares to competitors in their space

## 3. Value Propositions
**Primary Value**: The main problem ${productName} solves and core benefit it provides
**Secondary Benefits**: Additional value users get from using the product
**Target Audience**: Who specifically benefits most from this product
**Differentiators**: What makes ${productName} unique compared to alternatives

## 4. Competitive Differentiation

**Strengths**:
- [Specific strength of ${productName}]
- [Another specific strength]
- [Third specific strength]

**Weaknesses**:
- [Specific limitation or weakness of ${productName}]
- [Another specific weakness]
- [Third specific weakness]

**Opportunities**:
- [Specific market opportunity for ${productName}]
- [Another specific opportunity]
- [Third specific opportunity]

**Threats**:
- [Specific competitive threat to ${productName}]
- [Another specific threat]
- [Third specific threat]`;

  prompt += `\n\n## 5. Action Plan / Next Steps\n` +
    `Provide a concrete, PM-friendly action plan for how someone should use this teardown to improve their own product.\n` +
    `Use these sub-sections and keep bullets scannable:\n` +
    `**What to copy**: 3–5 concrete elements to emulate\n` +
    `**What to avoid**: 3–5 pitfalls/tradeoffs\n` +
    `**Experiments to run**: 3–5 experiments (include a hypothesis, success metric, and expected decision)\n` +
    `**Metrics to watch**: 3–5 metrics that would validate the strategy\n` +
    `**Open questions**: 3–5 questions to resolve with further evidence\n` +
    `If you reference evidence sources, cite them inline like [src_1].`;

  if (hasMyProduct) {
    prompt += `\n\nMY PRODUCT BASELINE:\n- Name: ${myProduct.name}`;
    if (myProduct.url) {
      prompt += `\n- URL: ${myProduct.url}`;
    }
    if (myProduct.notes) {
      prompt += `\n- Notes: ${myProduct.notes}`;
    }

    prompt += `\n\n## 6. Delta vs My product\n` +
      `Provide explicit, actionable differences between ${productName} and My product (${myProduct.name}).\n` +
      `This section must be directly usable as a checklist for improving My product.\n` +
      `Use these sub-sections:\n` +
      `**Biggest deltas**: 3–7 bullets (what ${productName} does differently)\n` +
      `**What to change in My product**: 3–7 concrete recommendations\n` +
      `**Risks/tradeoffs**: 2–5 bullets\n` +
      `**Quick wins (1–2 weeks)**: 3–5 bullets\n` +
      `**Bigger bets (1–2 months)**: 2–4 bullets\n` +
      `If you reference evidence sources, cite them inline like [src_1].`;
  }

  if (userGoals) {
    prompt += `\n\nUser's specific goals: ${userGoals}`;
  }

  const preset = FOCUS_PRESETS[focusPreset] || FOCUS_PRESETS.general;
  prompt += `\n\nTEARDOWN FOCUS PRESET: ${preset.label}\n${preset.guidance}\nUse this as emphasis only; still return the same complete section schema.`;

  if (evidenceContextForPrompt) {
    prompt += `\n\n${evidenceContextForPrompt}`;
  } else {
    prompt += `\n\nEVIDENCE NOTE:\n- No external evidence sources were available. If you make inferences, be explicit that they are inferred (not directly sourced).`;
  }

  prompt += `\n\nReturn JSON in exactly this shape:
{
  "summary": {
    "headline": "one sentence specific verdict",
    "topTakeaways": ["3 specific PM takeaways"],
    "keyRisks": ["2-4 risks or caveats"],
    "openQuestions": ["2-4 questions to resolve with more evidence"],
    "recommendedNextMove": "one concrete next step"
  },
  "sections": {
    "onboarding": "markdown string",
    "pricing": "markdown string",
    "valueProps": "markdown string",
    "competitive": "markdown string",
    "actionPlan": "markdown string",${hasMyProduct ? '\n    "deltaVsMyProduct": "markdown string"' : '\n    "deltaVsMyProduct": ""'}
  },
  "quality": {
    "confidenceNotes": ["short notes on what is sourced vs inferred"],
    "evidenceGaps": ["important missing evidence or uncertainty"]
  }
}

Rules for the JSON:
- Include all keys exactly as shown above
- Use an empty string for deltaVsMyProduct only when no comparison baseline exists
- Do not include extra top-level keys beyond summary, sections, and quality
- Do not include explanatory text before or after the JSON

Remember: Provide SPECIFIC analysis about ${productName}, not generic business frameworks or instructions.\nIf you reference evidence sources, add citations like [src_1].`;
  
  return prompt;
}

function parseAnalysisResponse(analysisText, options = {}) {
  const {
    sources = [],
    evidenceLimitations = [],
    expectsDeltaSection = false,
    model,
  } = options;

  const structuredPayload = parseStructuredPayload(analysisText, expectsDeltaSection);
  const usedStructuredPayload = Boolean(structuredPayload?.sections);
  const sections = structuredPayload?.sections || extractSectionsFromMarkdown(analysisText, expectsDeltaSection);

  const parsed = {
    sections,
    evidence: buildEvidenceMeta(sections, sources, evidenceLimitations),
    sources,
    rawAnalysis: usedStructuredPayload
      ? buildRawAnalysisFromSections(sections, expectsDeltaSection)
      : analysisText,
    generatedAt: new Date().toISOString(),
    model,
  };

  if (structuredPayload?.summary) {
    parsed.summary = structuredPayload.summary;
  }

  if (structuredPayload?.quality) {
    parsed.quality = structuredPayload.quality;
  }

  return parsed;
}

function parseStructuredSections(text, expectsDeltaSection) {
  return parseStructuredPayload(text, expectsDeltaSection)?.sections || null;
}

function parseStructuredPayload(text, expectsDeltaSection) {
  const jsonCandidate = extractJsonCandidate(text);
  if (!jsonCandidate) return null;

  try {
    const parsed = JSON.parse(jsonCandidate);
    const sectionContainer = parsed?.sections && typeof parsed.sections === 'object'
      ? parsed.sections
      : parsed;

    if (!sectionContainer || typeof sectionContainer !== 'object' || Array.isArray(sectionContainer)) {
      return null;
    }

    const normalized = normalizeSections(sectionContainer, expectsDeltaSection);
    const requiredKeys = ['onboarding', 'pricing', 'valueProps', 'competitive', 'actionPlan'];
    const hasAllRequiredSections = requiredKeys.every((key) => normalized[key] !== MISSING_SECTION_TEXT);

    if (!hasAllRequiredSections) {
      return null;
    }

    return {
      sections: normalized,
      summary: normalizeSummary(parsed?.summary),
      quality: normalizeQuality(parsed?.quality),
    };
  } catch {
    return null;
  }
}

function normalizeSummary(summary) {
  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) {
    return null;
  }

  const normalized = {
    headline: normalizeSingleLine(summary.headline),
    topTakeaways: normalizeStringArray(summary.topTakeaways).slice(0, 3),
    keyRisks: normalizeStringArray(summary.keyRisks).slice(0, 4),
    openQuestions: normalizeStringArray(summary.openQuestions).slice(0, 4),
    recommendedNextMove: normalizeSingleLine(summary.recommendedNextMove),
  };

  const hasContent = Object.values(normalized).some((value) => (
    Array.isArray(value) ? value.length > 0 : Boolean(value)
  ));

  return hasContent ? normalized : null;
}

function normalizeQuality(quality) {
  if (!quality || typeof quality !== 'object' || Array.isArray(quality)) {
    return null;
  }

  const normalized = {
    confidenceNotes: normalizeStringArray(quality.confidenceNotes),
    evidenceGaps: normalizeStringArray(quality.evidenceGaps),
    warnings: normalizeStringArray(quality.warnings),
  };

  const hasContent = Object.values(normalized).some((value) => value.length > 0);
  return hasContent ? normalized : null;
}

function normalizeSingleLine(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeStringArray(value) {
  if (!value) return [];
  const items = Array.isArray(value) ? value : [value];

  return items
    .map((item) => normalizeSingleLine(item))
    .filter(Boolean);
}

function extractJsonCandidate(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed;
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch && fencedMatch[1]) {
    const fenced = fencedMatch[1].trim();
    if (fenced.startsWith('{') && fenced.endsWith('}')) {
      return fenced;
    }
  }

  return extractBalancedJsonObject(trimmed);
}

function extractBalancedJsonObject(text) {
  let start = -1;
  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '{') {
      if (depth === 0) start = i;
      depth += 1;
      continue;
    }

    if (char === '}') {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

function normalizeSections(rawSections, expectsDeltaSection) {
  const normalized = {};

  for (const [key] of SECTION_ORDER) {
    const rawValue = rawSections?.[key];
    const normalizedValue = normalizeSectionValue(rawValue);

    if (key === 'deltaVsMyProduct' && !expectsDeltaSection) {
      normalized[key] = normalizedValue || MISSING_SECTION_TEXT;
      continue;
    }

    normalized[key] = normalizedValue || MISSING_SECTION_TEXT;
  }

  return normalized;
}

function normalizeSectionValue(value) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || '';
  }

  if (Array.isArray(value)) {
    const items = value
      .map(item => normalizeSectionValue(item))
      .filter(Boolean);

    if (items.length === 0) return '';
    return items.map(item => (item.startsWith('- ') ? item : `- ${item}`)).join('\n');
  }

  if (value && typeof value === 'object') {
    return Object.entries(value)
      .map(([label, itemValue]) => {
        const normalizedItem = normalizeSectionValue(itemValue);
        return normalizedItem
          ? `**${humanizeKey(label)}**\n${normalizedItem}`
          : '';
      })
      .filter(Boolean)
      .join('\n\n')
      .trim();
  }

  return '';
}

function humanizeKey(key) {
  return String(key || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function extractSectionsFromMarkdown(analysisText, expectsDeltaSection) {
  const sections = {
    onboarding: extractSection(analysisText, ['onboarding', 'user onboarding']),
    pricing: extractSection(analysisText, ['pricing', 'pricing strategy']),
    valueProps: extractSection(analysisText, ['value proposition', 'value prop']),
    competitive: extractSection(analysisText, ['competitive', 'competitive analysis', 'differentiation']),
    actionPlan: extractSection(analysisText, ['action plan', 'next steps']),
    deltaVsMyProduct: expectsDeltaSection
      ? extractSection(analysisText, ['delta vs my product', 'delta vs myproduct', 'delta vs my-product'])
      : MISSING_SECTION_TEXT,
  };

  return sections;
}

function buildRawAnalysisFromSections(sections, expectsDeltaSection) {
  return SECTION_ORDER
    .filter(([key]) => expectsDeltaSection || key !== 'deltaVsMyProduct')
    .map(([key, label], index) => `## ${index + 1}. ${label}\n${sections?.[key] || MISSING_SECTION_TEXT}`)
    .join('\n\n')
    .trim();
}

function buildEvidenceMeta(sections, sources = [], evidenceLimitations = []) {
  const allowedSourceIds = new Set((sources || []).map(s => s.id));

  const sectionKeys = ['onboarding', 'pricing', 'valueProps', 'competitive', 'actionPlan', 'deltaVsMyProduct'];
  const perSection = {};

  for (const key of sectionKeys) {
    const content = sections?.[key] || '';
    const sourceIds = extractCitedSourceIds(content).filter(id => allowedSourceIds.has(id));

    const basis = sources.length === 0
      ? 'inferred'
      : (sourceIds.length > 0 ? 'sourced' : 'mixed');

    let confidence = basis === 'sourced' ? 0.75 : basis === 'mixed' ? 0.6 : 0.45;

    // Penalize confidence slightly when we hit evidence ingestion limitations.
    const penalty = Math.min(0.25, (evidenceLimitations || []).length * 0.03);
    confidence = Math.max(0.15, Math.min(0.95, confidence - penalty));

    perSection[key] = {
      basis,
      confidence,
      sourceIds,
      claims: extractEvidenceClaims(content, allowedSourceIds),
      limitations: evidenceLimitations || [],
    };
  }

  const sectionValues = Object.values(perSection);
  const avgConfidence = sectionValues.reduce((sum, s) => sum + (s.confidence || 0), 0) / Math.max(1, sectionValues.length);

  const overallBasis = sources.length === 0
    ? 'inferred'
    : (sectionValues.every(s => s.basis === 'sourced') ? 'sourced' : 'mixed');

  return {
    overall: {
      basis: overallBasis,
      confidence: Math.max(0.15, Math.min(0.95, avgConfidence)),
      limitations: evidenceLimitations || [],
    },
    onboarding: perSection.onboarding,
    pricing: perSection.pricing,
    valueProps: perSection.valueProps,
    competitive: perSection.competitive,
    actionPlan: perSection.actionPlan,
    deltaVsMyProduct: perSection.deltaVsMyProduct,
  };
}

function assessAnalysisQuality(analysis, options = {}) {
  const {
    sources = [],
    expectsDeltaSection = false,
  } = options;

  const warnings = [];
  const evidenceGaps = [];
  const sections = analysis?.sections || {};
  const requiredSectionKeys = expectsDeltaSection
    ? ['onboarding', 'pricing', 'valueProps', 'competitive', 'actionPlan', 'deltaVsMyProduct']
    : ['onboarding', 'pricing', 'valueProps', 'competitive', 'actionPlan'];

  for (const key of requiredSectionKeys) {
    const content = sections[key] || '';
    const label = humanizeKey(key);

    if (!content || content === MISSING_SECTION_TEXT) {
      warnings.push(`${label} is missing.`);
      continue;
    }

    if (content.replace(/\s+/g, ' ').trim().length < 180) {
      warnings.push(`${label} is too short to be a useful teardown section.`);
    }

    const missingSubsections = findMissingSubsections(key, content);
    if (missingSubsections.length > 0) {
      warnings.push(`${label} is missing expected subsections: ${missingSubsections.join(', ')}.`);
    }
  }

  const allSectionText = requiredSectionKeys
    .map((key) => sections[key] || '')
    .join('\n\n');

  const genericPhrases = [
    'to analyze',
    'framework to apply',
    "i'd recommend visiting",
    'specific strength of',
    'another specific',
    'third specific',
    'analysis available - check full details',
    'analysis content available',
  ];

  const lowerText = allSectionText.toLowerCase();
  for (const phrase of genericPhrases) {
    if (lowerText.includes(phrase)) {
      warnings.push(`Output contains generic filler phrase: "${phrase}".`);
    }
  }

  if ((sources || []).length > 0 && extractCitedSourceIds(allSectionText).length === 0) {
    warnings.push('Evidence sources were available, but the analysis did not cite any source IDs.');
    evidenceGaps.push('No inline citations were used despite fetched evidence sources.');
  }

  const summary = analysis?.summary;
  if (!summary?.headline) {
    warnings.push('Summary headline is missing.');
  }
  if (!Array.isArray(summary?.topTakeaways) || summary.topTakeaways.length < 3) {
    warnings.push('Summary needs exactly 3 useful top takeaways.');
  }
  if (!summary?.recommendedNextMove) {
    warnings.push('Summary recommended next move is missing.');
  }

  return {
    passed: warnings.length === 0,
    warnings: Array.from(new Set(warnings)),
    evidenceGaps,
  };
}

function findMissingSubsections(sectionKey, content) {
  const lower = String(content || '').toLowerCase();
  const expectedBySection = {
    onboarding: ['onboarding flow', 'time to value', 'highlights'],
    pricing: ['pricing model', 'tiers', 'strategy', 'competitive position'],
    valueProps: ['primary value', 'secondary benefits', 'target audience', 'differentiators'],
    competitive: ['strengths', 'weaknesses', 'opportunities', 'threats'],
    actionPlan: ['what to copy', 'what to avoid', 'experiments to run', 'hypothesis', 'metric', 'expected decision', 'metrics to watch', 'open questions'],
    deltaVsMyProduct: ['biggest deltas', 'what to change', 'risks', 'quick wins', 'bigger bets'],
  };

  return (expectedBySection[sectionKey] || [])
    .filter((needle) => !lower.includes(needle));
}

function attachQualityAssessment(analysis, assessment, diagnostics = {}) {
  const existingQuality = normalizeQuality(analysis?.quality) || {
    confidenceNotes: [],
    evidenceGaps: [],
    warnings: [],
  };

  return {
    ...analysis,
    quality: {
      ...existingQuality,
      confidenceNotes: existingQuality.confidenceNotes,
      evidenceGaps: Array.from(new Set([
        ...(existingQuality.evidenceGaps || []),
        ...(assessment.evidenceGaps || []),
      ])),
      warnings: Array.from(new Set([
        ...(existingQuality.warnings || []),
        ...(assessment.warnings || []),
      ])),
      passed: Boolean(assessment.passed),
      retried: Boolean(diagnostics.retried),
    },
    diagnostics: {
      provider: diagnostics.aiProvider,
      model: diagnostics.model || analysis?.model,
      retried: Boolean(diagnostics.retried),
      retryCount: Number.isInteger(diagnostics.retryCount) ? diagnostics.retryCount : 0,
      sourceCount: Number.isInteger(diagnostics.sourceCount) ? diagnostics.sourceCount : 0,
      qualityPassed: Boolean(assessment.passed),
      qualityWarningCount: Array.isArray(assessment.warnings) ? assessment.warnings.length : 0,
      generationTimeMs: Number.isFinite(diagnostics.generationTimeMs) ? diagnostics.generationTimeMs : 0,
    },
  };
}

function extractCitedSourceIds(text) {
  if (!text) return [];
  const matches = text.match(/\[src_\d+\]/g) || [];
  const ids = matches.map(m => m.slice(1, -1));
  return Array.from(new Set(ids));
}

function extractEvidenceClaims(text, allowedSourceIds = new Set()) {
  if (!text) return [];

  return String(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.match(/^#{1,6}\s+/))
    .map((line) => line.replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, '').trim())
    .filter((line) => line.length >= 30)
    .slice(0, 12)
    .map((line) => {
      const sourceIds = extractCitedSourceIds(line).filter((id) => allowedSourceIds.has(id));
      const lower = line.toLowerCase();
      const hasInferenceLanguage = ['inferred', 'likely', 'may ', 'could ', 'appears', 'suggests'].some((needle) => lower.includes(needle));

      return {
        text: line.replace(/\s+/g, ' '),
        basis: sourceIds.length > 0
          ? (hasInferenceLanguage ? 'mixed' : 'sourced')
          : 'inferred',
        sourceIds,
      };
    });
}

function extractSection(text, keywords) {
  const lines = text.split('\n');
  let sectionStartIndex = -1;
  
  // Find the section start - look for various header formats
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();
    
    // Check if this line contains any of our keywords
    const hasKeyword = keywords.some(keyword => lowerLine.includes(keyword.toLowerCase()));
    
    if (hasKeyword) {
      // Look for numbered section headers like "## 1. User Onboarding" or "## 4. Competitive Differentiation"
      if (line.match(/^#{1,3}\s+\d+\.\s+/)) {
        sectionStartIndex = i;
        break;
      }
      // Look for unnumbered headers like "## User Onboarding" or "## Pricing Strategy"
      if (line.match(/^#{1,3}\s+[^#]/)) {
        sectionStartIndex = i;
        break;
      }
      // Look for bold headers like "**User Onboarding**" or "**1. User Onboarding**"
      if (line.match(/^\*\*.*\*\*/) && hasKeyword) {
        sectionStartIndex = i;
        break;
      }
    }
  }
  
  if (sectionStartIndex === -1) {
    // Fallback: try to find section by keyword anywhere in the line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();
      if (keywords.some(keyword => lowerLine.includes(keyword.toLowerCase()))) {
        // Check if it's a header-like line (starts with #, **, or is short and bold-looking)
        if (line.match(/^#{1,3}/) || line.match(/^\*\*/) || (line.length < 100 && line.match(/^[A-Z]/))) {
          sectionStartIndex = i;
          break;
        }
      }
    }
  }
  
  if (sectionStartIndex === -1) {
    return MISSING_SECTION_TEXT;
  }
  
  // Collect lines from section start until next section
  const sectionLines = [];
  for (let i = sectionStartIndex; i < lines.length; i++) {
    const line = lines[i];
    
    // Stop if we hit the next numbered section (## 1., ## 2., etc.)
    if (i > sectionStartIndex && line.match(/^#{1,3}\s+\d+\.\s+/)) {
      break;
    }
    
    // Stop if we hit another major header (##) that's not part of this section
    if (i > sectionStartIndex + 2 && line.match(/^#{1,2}\s+[^#]/)) {
      // Check if this new header contains keywords from other sections
      const otherSectionKeywords = [
        ['onboarding', 'user onboarding'],
        ['pricing', 'pricing strategy'],
        ['value proposition', 'value prop'],
        ['competitive', 'competitive analysis', 'differentiation']
      ].flat().filter(k => !keywords.includes(k));
      
      const lowerLine = line.toLowerCase();
      if (otherSectionKeywords.some(keyword => lowerLine.includes(keyword.toLowerCase()))) {
        break;
      }
    }
    
    sectionLines.push(line);
  }
  
  // Remove the header line itself if it's just a header with no content
  let result = sectionLines.join('\n').trim();
  
  // If result is just a header or very short, try to get more content
  if (result.match(/^#{1,3}\s+/) && result.split('\n').length <= 2) {
    // Look for content after this section in the original text
    const originalIndex = lines.findIndex(l => l === sectionLines[0]);
    if (originalIndex !== -1) {
      // Get more lines after the header
      for (let i = originalIndex + 1; i < Math.min(originalIndex + 20, lines.length); i++) {
        const nextLine = lines[i];
        // Stop at next major section
        if (nextLine.match(/^#{1,2}\s+\d+\.\s+/) || nextLine.match(/^#{1,2}\s+[^#]/)) {
          const lowerNextLine = nextLine.toLowerCase();
          const otherKeywords = [
            'onboarding', 'user onboarding', 'pricing', 'pricing strategy',
            'value proposition', 'value prop', 'competitive', 'competitive analysis', 'differentiation'
          ].filter(k => !keywords.some(keyword => keyword.toLowerCase() === k.toLowerCase()));
          if (otherKeywords.some(k => lowerNextLine.includes(k))) {
            break;
          }
        }
        if (nextLine.trim()) {
          sectionLines.push(nextLine);
        }
      }
      result = sectionLines.join('\n').trim();
    }
  }
  
  return result || MISSING_SECTION_TEXT;
}

function generateId() {
  return 'analysis_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

module.exports = router;
module.exports.__test__ = {
  parseAnalysisResponse,
  parseStructuredSections,
  parseStructuredPayload,
  extractJsonCandidate,
  extractSectionsFromMarkdown,
  buildRawAnalysisFromSections,
  assessAnalysisQuality,
};
