const express = require('express');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const { ingestProductEvidence } = require('../utils/urlEvidence');

const router = express.Router();

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

// Validation schema
const analysisSchema = Joi.object({
  productName: Joi.string().min(1).max(200).required(),
  productUrl: Joi.string().uri().optional(),
  userGoals: Joi.string().max(1000).optional(),
  aiProvider: Joi.string().valid('openai', 'anthropic').default('openai'),
  myProduct: Joi.object({
    name: Joi.string().min(1).max(200).required(),
    url: Joi.string().uri().optional(),
    notes: Joi.string().max(2000).optional(),
  }).optional(),
});

// POST /api/analysis - Create new analysis
router.post('/', analysisLimit, async (req, res) => {
  let aiProviderForError = 'openai';
  try {
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

    const { productName, productUrl, userGoals, aiProvider, myProduct } = value;
    aiProviderForError = aiProvider;

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

    // Build prompt
    const prompt = buildAnalysisPrompt(productName, productUrl, userGoals, evidence.contextForPrompt, myProduct);

    // Call AI provider
    let analysisText;
    
    if (aiProvider === 'anthropic') {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        temperature: 0.3,
        system: "You are a product analysis expert with deep knowledge of software products and business models. You MUST provide specific, detailed analysis about the exact product requested - never generic frameworks or instructional content. Base your analysis on actual product knowledge and make reasonable inferences when needed. If evidence sources are provided, use them as grounding context and add citations like [src_1] when referencing them. Format your response with clear markdown headers and bullet points for SWOT analysis.",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      });
      analysisText = response.content[0].text;
    } else {
      // Default to OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a product analysis expert with deep knowledge of software products and business models. You MUST provide specific, detailed analysis about the exact product requested - never generic frameworks or instructional content. Base your analysis on actual product knowledge and make reasonable inferences when needed. If evidence sources are provided, use them as grounding context and add citations like [src_1] when referencing them. Format your response with clear markdown headers and bullet points for SWOT analysis."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });
      analysisText = completion.choices[0].message.content;
    }
    
    // Parse response into structured sections
    const structuredAnalysis = parseAnalysisResponse(analysisText, evidence.sources, evidence.limitations);

    // For MVP, we'll return the analysis directly without database storage
    res.status(201).json({
      success: true,
      data: {
        id: generateId(),
        product_name: productName,
        product_url: productUrl,
        my_product: myProduct,
        user_goals: userGoals,
        ai_provider: aiProvider,
        analysis_data: structuredAnalysis,
        created_at: new Date().toISOString()
      }
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
  }
});

// Helper functions
function buildAnalysisPrompt(productName, productUrl, userGoals, evidenceContextForPrompt, myProduct) {
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
- If you don't have specific information, make reasonable inferences based on typical patterns for similar products

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
    `**Experiments to run**: 3–5 experiments (include a hypothesis + success metric)\n` +
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

  if (evidenceContextForPrompt) {
    prompt += `\n\n${evidenceContextForPrompt}`;
  } else {
    prompt += `\n\nEVIDENCE NOTE:\n- No external evidence sources were available. If you make inferences, be explicit that they are inferred (not directly sourced).`;
  }

  prompt += `\n\nRemember: Provide SPECIFIC analysis about ${productName}, not generic business frameworks or instructions.\nIf you reference evidence sources, add citations like [src_1].`;
  
  return prompt;
}

function parseAnalysisResponse(analysisText, sources = [], evidenceLimitations = []) {
  // Enhanced parsing for structured markdown responses
  const sections = {
    onboarding: extractSection(analysisText, ['onboarding', 'user onboarding']),
    pricing: extractSection(analysisText, ['pricing', 'pricing strategy']),
    valueProps: extractSection(analysisText, ['value proposition', 'value prop']),
    competitive: extractSection(analysisText, ['competitive', 'competitive analysis', 'differentiation']),
    actionPlan: extractSection(analysisText, ['action plan', 'next steps']),
    deltaVsMyProduct: extractSection(analysisText, ['delta vs my product', 'delta vs myproduct', 'delta vs my-product'])
  };

  return {
    sections,
    evidence: buildEvidenceMeta(sections, sources, evidenceLimitations),
    sources,
    rawAnalysis: analysisText,
    generatedAt: new Date().toISOString()
  };
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

function extractCitedSourceIds(text) {
  if (!text) return [];
  const matches = text.match(/\[src_\d+\]/g) || [];
  const ids = matches.map(m => m.slice(1, -1));
  return Array.from(new Set(ids));
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
    return 'Analysis not available for this section.';
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
  
  return result || 'Analysis not available for this section.';
}

function generateId() {
  return 'analysis_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

module.exports = router;