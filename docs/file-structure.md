# File Structure - Product Teardown Platform

## Project Root Structure
```
product-teardown-platform/
├── frontend/                 # React application
├── backend/                  # Express.js API server
├── ai-services/             # Python AI analysis services
├── docs/                    # Documentation (PRDs, guides)
├── .gitignore
├── README.md
└── docker-compose.yml       # For local development
```

## Frontend Structure (React)
```
frontend/
├── public/
│   ├── index.html
│   ├── favicon.ico
│   └── manifest.json
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── common/          # Generic components
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Loading.jsx
│   │   │   └── Layout.jsx
│   │   ├── forms/           # Form-specific components
│   │   │   ├── ProductInput.jsx
│   │   │   └── VoiceInput.jsx
│   │   └── analysis/        # Analysis display components
│   │       ├── AnalysisCard.jsx
│   │       ├── OnboardingSection.jsx
│   │       ├── PricingSection.jsx
│   │       ├── ValuePropSection.jsx
│   │       └── CompetitiveSection.jsx
│   ├── pages/               # Page components
│   │   ├── Home.jsx
│   │   ├── Analysis.jsx
│   │   ├── History.jsx
│   │   └── Profile.jsx
│   ├── hooks/               # Custom React hooks
│   │   ├── useAuth.js
│   │   ├── useAnalysis.js
│   │   └── useVoiceInput.js
│   ├── services/            # API and external services
│   │   ├── api.js           # API client configuration
│   │   ├── supabase.js      # Supabase client
│   │   └── analysis.js      # Analysis-related API calls
│   ├── utils/               # Utility functions
│   │   ├── constants.js
│   │   ├── helpers.js
│   │   └── validation.js
│   ├── styles/              # Global styles and Tailwind
│   │   ├── globals.css
│   │   └── components.css
│   ├── App.jsx              # Main App component
│   ├── index.js             # Entry point
│   └── setupTests.js
├── package.json
├── tailwind.config.js
└── .env.local
```

## Backend Structure (Express.js)
```
backend/
├── src/
│   ├── controllers/         # Route handlers
│   │   ├── analysisController.js
│   │   ├── userController.js
│   │   └── healthController.js
│   ├── middleware/          # Express middleware
│   │   ├── auth.js          # Authentication middleware
│   │   ├── validation.js    # Request validation
│   │   ├── rateLimiting.js  # Rate limiting
│   │   └── errorHandler.js
│   ├── routes/              # API route definitions
│   │   ├── analysis.js
│   │   ├── users.js
│   │   └── index.js
│   ├── services/            # Business logic
│   │   ├── analysisService.js
│   │   ├── aiService.js     # AI integration logic
│   │   └── supabaseService.js
│   ├── utils/               # Utility functions
│   │   ├── logger.js
│   │   ├── validators.js
│   │   └── constants.js
│   ├── config/              # Configuration files
│   │   ├── database.js
│   │   ├── supabase.js
│   │   └── ai.js
│   └── app.js               # Express app setup
├── tests/                   # Test files
│   ├── integration/
│   └── unit/
├── package.json
├── .env
└── .env.example
```

## AI Services Structure (Python)
```
ai-services/
├── src/
│   ├── analysis/            # Analysis modules
│   │   ├── __init__.py
│   │   ├── onboarding_analyzer.py
│   │   ├── pricing_analyzer.py
│   │   ├── value_prop_analyzer.py
│   │   └── competitive_analyzer.py
│   ├── data/                # Data collection modules
│   │   ├── __init__.py
│   │   ├── web_scraper.py
│   │   ├── app_store_scraper.py
│   │   └── social_scraper.py
│   ├── models/              # AI model interfaces
│   │   ├── __init__.py
│   │   ├── openai_client.py
│   │   ├── claude_client.py
│   │   └── prompt_templates.py
│   ├── utils/               # Utility functions
│   │   ├── __init__.py
│   │   ├── text_processing.py
│   │   ├── data_validation.py
│   │   └── cache.py
│   └── main.py              # FastAPI app (if using FastAPI)
├── requirements.txt
├── .env
└── Dockerfile
```

## Documentation Structure
```
docs/
├── prd.md                   # Product Requirements Document
├── tech-stack.md            # Technical architecture overview
├── api-docs.md              # API documentation
├── deployment.md            # Deployment instructions
├── contributing.md          # Development guidelines
└── user-guide.md            # End-user documentation
```

## Configuration Files

### Frontend Package.json Dependencies
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.0",
    "axios": "^1.3.0",
    "react-hook-form": "^7.43.0",
    "@headlessui/react": "^1.7.0",
    "lucide-react": "^0.263.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^3.1.0",
    "tailwindcss": "^3.2.0",
    "autoprefixer": "^10.4.13",
    "postcss": "^8.4.21",
    "vite": "^4.1.0"
  }
}
```

### Backend Package.json Dependencies
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^6.0.1",
    "dotenv": "^16.0.3",
    "@supabase/supabase-js": "^2.7.0",
    "axios": "^1.3.0",
    "express-rate-limit": "^6.7.0",
    "joi": "^17.7.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.20",
    "jest": "^29.3.0",
    "supertest": "^6.3.0"
  }
}
```

### Python Requirements
```txt
fastapi==0.89.0
uvicorn==0.20.0
openai==0.26.0
anthropic==0.2.0
requests==2.28.0
beautifulsoup4==4.11.0
python-dotenv==0.21.0
pydantic==1.10.0
```

## Environment Templates

### Frontend (.env.local)
```bash
REACT_APP_API_URL=http://localhost:3001
REACT_APP_SUPABASE_URL=your-supabase-project-url
REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
REACT_APP_ENVIRONMENT=development
```

### Backend (.env)
```bash
NODE_ENV=development
PORT=3001
SUPABASE_URL=your-supabase-project-url
SUPABASE_SERVICE_KEY=your-supabase-service-key
OPENAI_API_KEY=your-openai-api-key
AI_SERVICE_URL=http://localhost:8000
CORS_ORIGIN=http://localhost:3000
```

### AI Services (.env)
```bash
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
SUPABASE_URL=your-supabase-project-url
SUPABASE_SERVICE_KEY=your-supabase-service-key
CACHE_TTL=3600
```