# Product Teardown Platform

An AI-powered competitive analysis platform that generates structured product teardowns to help product managers and entrepreneurs understand market positioning and strategies.

## 🚀 Features

- **Multi-Provider AI Analysis**: Choose between OpenAI GPT-4o Mini and Anthropic Claude 3.5 Haiku
- **Structured Analysis**: Get insights in 4 key areas:
  - User Onboarding patterns
  - Pricing Strategy 
  - Value Propositions
  - Competitive Differentiation
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Real-time Analysis**: Fast analysis generation with progress indicators
- **Error Handling**: Graceful handling of API failures and rate limits
- **Comprehensive Testing**: Full test coverage for both frontend and backend
- **Environment Configuration**: Flexible API URL configuration for different environments
- **Code Quality**: ESLint configuration with proper React hooks linting and test globals
- **Comprehensive Environment Validation**: Robust startup validation with detailed error reporting and configuration guidance

## 🛠️ Tech Stack

### Frontend
- **React 19** with modern hooks
- **Vite** for fast development
- **Tailwind CSS** for styling
- **React Hook Form** for form management

### Backend
- **Express.js** API server
- **OpenAI SDK** for GPT integration
- **Anthropic SDK** for Claude integration
- **Joi** for input validation
- **Rate limiting** and security middleware
- **Jest** + **Supertest** for API testing

### Testing
- **Frontend**: Vitest + React Testing Library
- **Backend**: Jest + Supertest
- **Coverage**: Comprehensive test suites for components and API endpoints

## 📋 Prerequisites

- Node.js 20.9.0 or higher
- npm or yarn
- OpenAI API key (optional)
- Anthropic API key (optional)

## 🔧 Setup Instructions

### 1. Clone the Repository
```bash
git clone <repository-url>
cd product-teardown-platform
```

### 2. Backend Setup
```bash
cd backend
npm install

# Create environment file
cp .env.example .env

# Edit .env with your API keys and configuration
OPENAI_API_KEY=your-openai-api-key-here
ANTHROPIC_API_KEY=your-anthropic-api-key-here

# Optional: Customize rate limiting (defaults provided)
# RATE_LIMIT_WINDOW_MS=900000          # 15 minutes in milliseconds
# RATE_LIMIT_MAX_REQUESTS=100          # Max requests per window
# ANALYSIS_RATE_LIMIT_WINDOW_MS=3600000 # 1 hour in milliseconds  
# ANALYSIS_RATE_LIMIT_MAX_REQUESTS=10   # Max analysis requests per window
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install

# Optional: Set custom API URL (defaults to http://localhost:3001)
# Create .env.local for custom configuration
echo "VITE_API_URL=http://localhost:3001" > .env.local
```

### 4. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
Server will run on http://localhost:3001

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend will run on http://localhost:5173

## 🔑 API Keys Configuration

### OpenAI Setup
1. Get your API key from [OpenAI Platform](https://platform.openai.com/)
2. Add to `backend/.env`: `OPENAI_API_KEY=your-key-here`

### Anthropic Setup
1. Get your API key from [Anthropic Console](https://console.anthropic.com/)
2. Add to `backend/.env`: `ANTHROPIC_API_KEY=your-key-here`

**Note**: You need at least one API key configured. The app will show appropriate error messages if keys are missing.

## 🎯 Usage

1. **Navigate** to http://localhost:5173
2. **Enter** a product name (e.g., "Slack", "Notion")
3. **Optionally** add a product URL and specific goals
4. **Choose** your preferred AI provider (OpenAI or Anthropic)
5. **Click** "Generate Analysis"
6. **View** the structured analysis results

## 📁 Project Structure

```
product-teardown-platform/
├── frontend/                 # React application
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   │   ├── ProductInputForm.jsx
│   │   │   ├── AnalysisDisplay.jsx
│   │   │   ├── LoadingState.jsx
│   │   │   └── __tests__/   # Component tests
│   │   ├── __tests__/       # App-level tests
│   │   ├── test/            # Test configuration
│   │   └── App.jsx          # Main application
│   ├── vitest.config.js     # Test configuration
│   └── package.json         # Dependencies & scripts
├── backend/                 # Express API server
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   │   ├── analysis.js  # Analysis route
│   │   │   └── __tests__/   # Route tests
│   │   ├── __tests__/      # App-level tests
│   │   └── app.js          # Server setup
│   ├── jest.config.js      # Test configuration
│   ├── .env.example        # Environment template (CORS fixed)
│   └── package.json        # Dependencies & scripts
├── docs/                   # Documentation
└── README.md
```

## 🔧 Development

### Backend Development
- Uses **nodemon** for auto-restart
- **Configurable rate limiting**: Environment-based rate limiting for general API and analysis endpoints
- **CORS** enabled for localhost:5173
- **Security** headers with helmet
- **Comprehensive environment validation** with smart placeholder detection and step-by-step configuration guidance

### Frontend Development
- **Hot Module Replacement** with Vite
- **Tailwind CSS** for rapid styling
- **Form validation** with React Hook Form
- **Loading states** and error handling
- **Environment-based API URL** configuration
- **ESLint** with React hooks rules and test globals configured

## 🧪 Testing

### Running Tests

**Backend Tests:**
```bash
cd backend
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
```

**Frontend Tests:**
```bash
cd frontend
npm test              # Run all tests
npm run test:ui       # Run tests with UI
npm run lint          # Run ESLint (no warnings/errors)
```

### Test Coverage
- **Backend**: 36 tests covering API endpoints, validation, error handling, CORS, and comprehensive environment validation
- **Frontend**: 9 tests covering component rendering, form validation, and user interactions
- **Test Frameworks**: Jest (backend) + Vitest (frontend) with React Testing Library
- **Code Quality**: ESLint passes with zero warnings/errors, including proper React hooks dependencies
- **Environment Validation**: Dedicated test suite for API key validation, port validation, rate limiting, and configuration checks

## 🚧 Upcoming Features

- [ ] User authentication
- [ ] Analysis history storage (Supabase)
- [ ] Advanced analysis options
- [ ] Export functionality
- [ ] Collaborative features

## 🐛 Troubleshooting

### Frontend Won't Start
- Ensure Node.js version compatibility
- Try: `rm -rf node_modules && npm install`

### Backend API Errors & Environment Issues
- **Environment Validation**: Server performs comprehensive validation on startup
- **API Key Issues**: 
  - Rejects placeholder values ('your-api-key-here', 'example-key', etc.)
  - Validates OpenAI key format (must start with 'sk-' and be proper length)
  - Requires at least one valid API key (OpenAI or Anthropic)
- **Configuration Help**: Server provides step-by-step guidance for fixing configuration
- **Startup Messages**: Clear validation results with warnings and errors
- Verify rate limits haven't been exceeded
- Check console for detailed error messages

**Example Startup Error:**
```
🔧 ENVIRONMENT VALIDATION
================================

⚠️  WARNINGS:
   ⚠️  ANTHROPIC_API_KEY not configured
   ⚠️  → Anthropic functionality will be disabled

❌ ERRORS:
   ❌ CRITICAL: No valid AI provider API keys found
   ❌ Required: Set at least one of OPENAI_API_KEY or ANTHROPIC_API_KEY

💡 QUICK FIX GUIDE:
   1. Copy template: cp .env.example .env
   2. Get OpenAI key: https://platform.openai.com/api-keys
   3. Get Anthropic key: https://console.anthropic.com/
   4. Replace placeholder values in .env file
   5. Restart the server

🚫 SERVER STARTUP BLOCKED
```

### CORS Issues
- Ensure backend is running on port 3001
- Frontend should be on port 5173
- Check that `CORS_ORIGIN=http://localhost:5173` in backend `.env`

### Test Failures
- Run `npm test` in both frontend and backend directories
- Check for missing dependencies: `npm install`
- For frontend test warnings about `act()`, these are non-blocking and tests still pass

### Linting Issues
- Run `npm run lint` in the frontend directory to check for code quality issues
- ESLint is configured with React hooks rules and test globals
- All React hooks dependencies are properly configured to avoid warnings

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

**Built with ❤️ for product managers and entrepreneurs**