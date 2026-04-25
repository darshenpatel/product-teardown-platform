const express = require('express');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const fileStore = require('../utils/fileStore');

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

router.get('/', async (req, res) => {
  try {
    const feedback = await fileStore.list('feedback');
    return res.json({
      success: true,
      data: feedback,
    });
  } catch (err) {
    console.error('Failed to list feedback:', err);
    return res.status(500).json({
      error: 'Failed to list feedback',
      message: err.message || 'Unable to load feedback right now.'
    });
  }
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

    const savedFeedback = {
      id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      analysisId: value.analysisId,
      productName: value.productName,
      rating: value.rating,
      comment: value.comment || '',
      context: value.context || {},
      created_at: new Date().toISOString(),
    };

    await fileStore.save('feedback', savedFeedback);

    console.log('📝 Feedback received:', JSON.stringify(savedFeedback, null, 2));

    return res.status(201).json({
      success: true,
      data: savedFeedback,
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

