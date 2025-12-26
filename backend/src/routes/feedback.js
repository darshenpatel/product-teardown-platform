const express = require('express');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');

const router = express.Router();

const feedbackLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // plenty for a single-user app, still prevents abuse
  message: { error: 'Too many feedback submissions from this IP. Please try again later.' }
});

const feedbackSchema = Joi.object({
  analysisId: Joi.string().min(1).max(200).required(),
  productName: Joi.string().min(1).max(200).required(),
  rating: Joi.string().valid('up', 'down').required(),
  comment: Joi.string().max(2000).allow('').optional(),
  context: Joi.object().unknown(true).optional()
});

// POST /api/feedback - Receive feedback on an analysis
router.post('/', feedbackLimit, async (req, res) => {
  try {
    const { error, value } = feedbackSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    // MVP: log feedback and return success. Later: persist to DB / analytics pipeline.
    console.log('📝 Feedback received:', JSON.stringify({
      ...value,
      receivedAt: new Date().toISOString()
    }, null, 2));

    return res.status(201).json({
      success: true
    });
  } catch (err) {
    console.error('Feedback submission failed:', err);
    return res.status(500).json({
      error: 'Feedback submission failed',
      message: err.message || 'Unable to accept feedback right now.'
    });
  }
});

module.exports = router;


