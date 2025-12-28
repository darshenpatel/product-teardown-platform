require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const envValidator = require('./utils/envValidator');

// Validate environment variables on startup
const validationResults = envValidator.validate();
const isValidEnvironment = envValidator.handleResults(validationResults);

// Extract validation results for use in server startup
const { hasValidOpenAI, hasValidAnthropic } = validationResults;

const app = express();
const PORT = process.env.PORT || 3001;

// Trust the first proxy (Render/Cloudflare) so req.ip and rate limiting work correctly in production.
// Without this, all traffic can appear to come from the proxy and break per-IP abuse protection.
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
const defaultCorsOrigins = ['http://localhost:5173', 'http://localhost:4173']; // vite dev + vite preview
const envCorsOrigins = (process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()).filter(Boolean)
  : []
);

let allowedCorsOrigins = envCorsOrigins.length > 0 ? envCorsOrigins : defaultCorsOrigins;
// In local/dev, always allow the common Vite ports even if CORS_ORIGIN is set to only one of them.
if ((process.env.NODE_ENV || 'development') !== 'production') {
  allowedCorsOrigins = Array.from(new Set([...allowedCorsOrigins, ...defaultCorsOrigins]));
}

app.use(cors({
  origin: (origin, callback) => {
    // No Origin header (e.g., curl/server-to-server). Set a stable default for local dev + tests.
    if (!origin) return callback(null, allowedCorsOrigins[0]);

    if (allowedCorsOrigins.includes(origin)) return callback(null, origin);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // Default: 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Default: 100 requests per window
  message: { error: 'Too many requests from this IP' }
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/analysis', require('./routes/analysis'));
app.use('/api/feedback', require('./routes/feedback'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log('🚀 Product Teardown Platform API');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Server: http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 CORS Origin(s): ${allowedCorsOrigins.join(', ')}`);
    
    // Show validated AI providers
    const providers = [];
    if (hasValidOpenAI) providers.push('OpenAI ✓');
    if (hasValidAnthropic) providers.push('Anthropic ✓');
    console.log(`🤖 AI Providers: ${providers.join(', ') || 'None configured'}`);
    
    console.log(`🔍 Health Check: http://localhost:${PORT}/health`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Ready to process analysis requests!\n');
  });
}

module.exports = app;