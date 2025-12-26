# Development Guidelines - Product Teardown Platform

## Frontend Development Guidelines (React)

### Component Architecture
```jsx
// Follow this component structure pattern
import React, { useState, useEffect } from 'react';
import { ComponentProps } from './types';
import './Component.css'; // Only if needed beyond Tailwind

const Component = ({ prop1, prop2, ...props }) => {
  // 1. State declarations
  const [state, setState] = useState(initialValue);
  
  // 2. Effects and hooks
  useEffect(() => {
    // Side effects
  }, [dependencies]);
  
  // 3. Event handlers
  const handleEvent = (event) => {
    // Handle event
  };
  
  // 4. Render logic
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <div className="component-container">
      {/* JSX content */}
    </div>
  );
};

export default Component;
```

### Styling Guidelines (Tailwind CSS)
```jsx
// Use semantic class groupings
<div className={`
  // Layout
  flex flex-col md:flex-row gap-4 p-6
  // Appearance
  bg-white border border-gray-200 rounded-lg shadow-sm
  // Interactive states
  hover:shadow-md transition-shadow duration-200
  // Responsive
  w-full max-w-4xl mx-auto
`}>
```

### State Management Patterns
```jsx
// Use custom hooks for complex state logic
const useAnalysis = () => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAnalysis = async (productData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await analysisAPI.create(productData);
      setAnalysis(result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { analysis, loading, error, fetchAnalysis };
};
```

### API Integration
```jsx
// services/api.js - Centralized API configuration
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  timeout: 10000,
});

// Request interceptor for auth
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Form Handling
```jsx
// Use react-hook-form for complex forms
import { useForm } from 'react-hook-form';

const ProductInputForm = ({ onSubmit }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm();

  const onFormSubmit = async (data) => {
    try {
      await onSubmit(data);
      reset();
    } catch (error) {
      // Handle error
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      <input
        {...register('productName', { required: 'Product name is required' })}
        className="w-full px-3 py-2 border rounded-md"
        placeholder="Enter product name or URL"
      />
      {errors.productName && (
        <p className="text-red-500 text-sm">{errors.productName.message}</p>
      )}
      
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white py-2 rounded-md disabled:opacity-50"
      >
        {isSubmitting ? 'Analyzing...' : 'Analyze Product'}
      </button>
    </form>
  );
};
```

## Backend Development Guidelines (Express.js)

### Route Structure
```javascript
// routes/analysis.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const analysisController = require('../controllers/analysisController');
const auth = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimiting');

const router = express.Router();

// POST /api/analysis - Create new analysis
router.post(
  '/',
  rateLimit.analysisLimit, // Rate limiting
  auth.optional, // Optional auth for MVP
  [
    body('productName').notEmpty().withMessage('Product name is required'),
    body('productUrl').optional().isURL().withMessage('Must be valid URL'),
    body('userGoals').optional().isLength({ max: 500 })
  ],
  analysisController.create
);

// GET /api/analysis/:id - Get specific analysis
router.get('/:id', analysisController.getById);

// GET /api/analysis - Get user's analyses (requires auth)
router.get('/', auth.required, analysisController.getUserAnalyses);

module.exports = router;
```

### Controller Pattern
```javascript
// controllers/analysisController.js
const { validationResult } = require('express-validator');
const analysisService = require('../services/analysisService');
const logger = require('../utils/logger');

const analysisController = {
  async create(req, res) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { productName, productUrl, userGoals } = req.body;
      const userId = req.user?.id; // Optional for MVP

      // Create analysis
      const analysis = await analysisService.createAnalysis({
        productName,
        productUrl,
        userGoals,
        userId
      });

      logger.info('Analysis created', { analysisId: analysis.id, productName });

      res.status(201).json({
        success: true,
        data: analysis
      });
    } catch (error) {
      logger.error('Analysis creation failed', { error: error.message });
      res.status(500).json({
        error: 'Analysis creation failed',
        message: error.message
      });
    }
  },

  async getById(req, res) {
    try {
      const { id } = req.params;
      const analysis = await analysisService.getAnalysisById(id);
      
      if (!analysis) {
        return res.status(404).json({
          error: 'Analysis not found'
        });
      }

      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      logger.error('Failed to fetch analysis', { error: error.message });
      res.status(500).json({
        error: 'Failed to fetch analysis'
      });
    }
  }
};

module.exports = analysisController;
```

### Service Layer Pattern
```javascript
// services/analysisService.js
const supabase = require('../config/supabase');
const aiService = require('./aiService');
const logger = require('../utils/logger');

const analysisService = {
  async createAnalysis({ productName, productUrl, userGoals, userId }) {
    try {
      // Generate AI analysis
      const analysisData = await aiService.generateAnalysis({
        productName,
        productUrl,
        userGoals
      });

      // Save to database
      const { data, error } = await supabase
        .from('analyses')
        .insert({
          user_id: userId,
          product_name: productName,
          product_url: productUrl,
          user_goals: userGoals,
          analysis_data: analysisData
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      logger.error('Analysis creation failed', { error: error.message });
      throw new Error('Failed to create analysis');
    }
  },

  async getAnalysisById(id) {
    const { data, error } = await supabase
      .from('analyses')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Database query failed', { error: error.message });
      throw new Error('Database query failed');
    }

    return data;
  }
};

module.exports = analysisService;
```

### AI Service Integration
```javascript
// services/aiService.js
const OpenAI = require('openai');
const logger = require('../utils/logger');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const aiService = {
  async generateAnalysis({ productName, productUrl, userGoals }) {
    try {
      const prompt = this.buildAnalysisPrompt(productName, productUrl, userGoals);
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "You are a product analysis expert. Provide structured, actionable insights."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });

      const analysisText = completion.choices[0].message.content;
      
      // Parse and structure the analysis
      const structuredAnalysis = this.parseAnalysisResponse(analysisText);
      
      return structuredAnalysis;
    } catch (error) {
      logger.error('AI analysis failed', { error: error.message });
      throw new Error('AI analysis generation failed');
    }
  },

  buildAnalysisPrompt(productName, productUrl, userGoals) {
    const basePrompt = `
Analyze the product "${productName}" ${productUrl ? `(${productUrl})` : ''}.

Focus on these four key areas:
1. User Onboarding - How do they introduce new users to the product?
2. Pricing Strategy - What's their monetization approach?
3. Value Propositions - What core value do they promise users?
4. Competitive Differentiation - What makes them unique?

${userGoals ? `User's specific goals: ${userGoals}` : ''}

Provide structured, actionable insights for each area.
`;
    return basePrompt.trim();
  },

  parseAnalysisResponse(analysisText) {
    // Parse the AI response into structured sections
    // This could be enhanced with more sophisticated parsing
    const sections = {
      onboarding: this.extractSection(analysisText, 'onboarding'),
      pricing: this.extractSection(analysisText, 'pricing'),
      valueProps: this.extractSection(analysisText, 'value'),
      competitive: this.extractSection(analysisText, 'competitive')
    };

    return {
      sections,
      rawAnalysis: analysisText,
      generatedAt: new Date().toISOString()
    };
  },

  extractSection(text, keyword) {
    // Simple section extraction - enhance as needed
    const lines = text.split('\n');
    const sectionLines = lines.filter(line => 
      line.toLowerCase().includes(keyword.toLowerCase())
    );
    return sectionLines.join('\n').trim() || 'Analysis not available for this section.';
  }
};

module.exports = aiService;
```

## Error Handling Standards

### Frontend Error Boundaries
```jsx
// components/ErrorBoundary.jsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Log to monitoring service in production
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Backend Error Middleware
```javascript
// middleware/errorHandler.js
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: isDevelopment ? err.message : 'Something went wrong',
    ...(isDevelopment && { stack: err.stack })
  });
};

module.exports = errorHandler;
```

## Testing Guidelines

### Frontend Testing (Jest + React Testing Library)
```jsx
// __tests__/ProductInputForm.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProductInputForm from '../components/ProductInputForm';

describe('ProductInputForm', () => {
  test('submits form with valid data', async () => {
    const mockOnSubmit = jest.fn();
    render(<ProductInputForm onSubmit={mockOnSubmit} />);
    
    const input = screen.getByPlaceholderText(/enter product name/i);
    const button = screen.getByRole('button', { name: /analyze/i });
    
    fireEvent.change(input, { target: { value: 'Spotify' } });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        productName: 'Spotify'
      });
    });
  });
});
```

### Backend Testing (Jest + Supertest)
```javascript
// tests/integration/analysis.test.js
const request = require('supertest');
const app = require('../../src/app');

describe('/api/analysis', () => {
  test('POST /api/analysis creates new analysis', async () => {
    const productData = {
      productName: 'Test Product',
      userGoals: 'Understanding pricing'
    };

    const response = await request(app)
      .post('/api/analysis')
      .send(productData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data.product_name).toBe('Test Product');
  });

  test('POST /api/analysis validates required fields', async () => {
    const response = await request(app)
      .post('/api/analysis')
      .send({})
      .expect(400);

    expect(response.body.error).toBe('Validation failed');
  });
});
```

## Performance Optimization Guidelines

### Frontend Performance
```jsx
// Use React.memo for expensive components
const AnalysisCard = React.memo(({ analysis }) => {
  return (
    <div className="analysis-card">
      {/* Complex rendering logic */}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function
  return prevProps.analysis.id === nextProps.analysis.id;
});

// Lazy loading for route components
const Analysis = React.lazy(() => import('../pages/Analysis'));
const History = React.lazy(() => import('../pages/History'));

// Use Suspense for loading states
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/analysis" element={<Analysis />} />
    <Route path="/history" element={<History />} />
  </Routes>
</Suspense>

// Optimize API calls with useMemo
const memoizedAnalysis = useMemo(() => {
  return processAnalysisData(rawAnalysis);
}, [rawAnalysis]);
```

### Backend Performance
```javascript
// middleware/cache.js - Simple in-memory caching
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 }); // 10 minutes

const cacheMiddleware = (duration = 600) => {
  return (req, res, next) => {
    const key = req.originalUrl;
    const cachedResponse = cache.get(key);
    
    if (cachedResponse) {
      return res.json(cachedResponse);
    }
    
    // Override res.json to cache the response
    const originalJson = res.json;
    res.json = function(body) {
      cache.set(key, body, duration);
      originalJson.call(this, body);
    };
    
    next();
  };
};

// Use in routes for GET requests
router.get('/api/analysis/:id', cacheMiddleware(300), analysisController.getById);
```

## Security Guidelines

### Frontend Security
```jsx
// Input sanitization
import DOMPurify from 'dompurify';

const SanitizedContent = ({ htmlContent }) => {
  const cleanHtml = DOMPurify.sanitize(htmlContent);
  return <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />;
};

// Environment variable validation
const config = {
  apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  supabaseUrl: process.env.REACT_APP_SUPABASE_URL,
  supabaseKey: process.env.REACT_APP_SUPABASE_ANON_KEY,
};

// Validate required env vars
Object.entries(config).forEach(([key, value]) => {
  if (!value && key !== 'apiUrl') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});
```

### Backend Security
```javascript
// middleware/security.js
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Rate limiting
const createRateLimit = (windowMs, max, message) => 
  rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
  });

const rateLimits = {
  general: createRateLimit(15 * 60 * 1000, 100, 'Too many requests'),
  analysis: createRateLimit(60 * 60 * 1000, 10, 'Analysis rate limit exceeded'),
  auth: createRateLimit(15 * 60 * 1000, 5, 'Too many login attempts')
};

// Input validation and sanitization
const { body, param, query } = require('express-validator');

const validators = {
  productName: body('productName')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Product name must be 1-200 characters'),
    
  productUrl: body('productUrl')
    .optional()
    .isURL({ protocols: ['http', 'https'] })
    .withMessage('Must be a valid HTTP/HTTPS URL'),
    
  userGoals: body('userGoals')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('User goals must be less than 1000 characters')
};

module.exports = { rateLimits, validators };
```

## Database Guidelines

### Supabase Schema
```sql
-- Database schema with proper constraints and indexes
CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL CHECK (length(product_name) > 0),
  product_url TEXT CHECK (product_url ~ '^https?://'),
  user_goals TEXT CHECK (length(user_goals) <= 1000),
  analysis_data JSONB NOT NULL,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_analyses_user_id ON analyses(user_id);
CREATE INDEX idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX idx_analyses_product_name ON analyses USING gin(to_tsvector('english', product_name));

-- Row Level Security (RLS)
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- Users can only see their own analyses
CREATE POLICY "Users can view own analyses" ON analyses
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create analyses
CREATE POLICY "Users can create analyses" ON analyses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_analyses_updated_at 
  BEFORE UPDATE ON analyses 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Deployment Guidelines

### Docker Configuration
```dockerfile
# Dockerfile.frontend
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```dockerfile
# Dockerfile.backend
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
USER node
CMD ["npm", "start"]
```

### Environment Management
```bash
# scripts/deploy.sh
#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Build and push Docker images
docker build -t product-teardown-frontend -f Dockerfile.frontend .
docker build -t product-teardown-backend -f Dockerfile.backend .

# Deploy to Railway/Render/Vercel
echo "📦 Deploying to production..."

# Run database migrations if needed
echo "🗄️  Running database migrations..."

echo "✅ Deployment complete!"
```

## Monitoring and Logging

### Frontend Monitoring
```jsx
// utils/analytics.js
const analytics = {
  track: (event, properties = {}) => {
    if (process.env.NODE_ENV === 'production') {
      // Send to analytics service (PostHog, Mixpanel, etc.)
      console.log('Track:', event, properties);
    }
  },
  
  error: (error, context = {}) => {
    console.error('Frontend Error:', error, context);
    // Send to error tracking service (Sentry, LogRocket, etc.)
  }
};

export default analytics;

// Usage in components
const handleAnalysisSubmit = async (data) => {
  analytics.track('analysis_requested', {
    product_name: data.productName,
    has_url: !!data.productUrl,
    has_goals: !!data.userGoals
  });
  
  try {
    await submitAnalysis(data);
    analytics.track('analysis_completed');
  } catch (error) {
    analytics.error(error, { context: 'analysis_submission' });
  }
};
```

### Backend Logging
```javascript
// utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'product-teardown-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;
```

## Code Quality Standards

### ESLint Configuration
```json
{
  "extends": [
    "react-app",
    "react-app/jest",
    "@typescript-eslint/recommended"
  ],
  "rules": {
    "no-console": "warn",
    "no-unused-vars": "error",
    "prefer-const": "error",
    "no-var": "error",
    "object-shorthand": "error",
    "prefer-template": "error"
  }
}
```

### Prettier Configuration
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

## Git Workflow

### Branch Strategy
```bash
# Main branches
main           # Production-ready code
develop        # Integration branch for features

# Feature branches
feature/user-auth
feature/voice-input
feature/analysis-engine

# Hotfix branches
hotfix/critical-bug-fix

# Example workflow
git checkout develop
git pull origin develop
git checkout -b feature/analysis-display
# Make changes
git add .
git commit -m "feat: add analysis display components"
git push origin feature/analysis-display
# Create pull request to develop
```

### Commit Message Format
```bash
# Format: type(scope): description

feat(auth): add user authentication
fix(api): resolve analysis generation timeout
docs(readme): update installation instructions
style(ui): improve button hover states
refactor(analysis): extract common logic to utils
test(api): add integration tests for analysis endpoint
chore(deps): update dependencies to latest versions
```

This comprehensive set of guidelines should give you everything needed to start building with Claude Code in Cursor! Each document provides the structure and patterns for consistent, maintainable development.