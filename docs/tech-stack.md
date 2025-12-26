# Tech Stack Overview - Product Teardown Platform

## Frontend Stack
### Framework: React 18+
- **Why**: Fast development, component reusability, large ecosystem
- **Key Libraries**:
  - `create-react-app` or `Vite` for quick setup
  - `react-router-dom` for navigation
  - `axios` for API calls
  - `react-hook-form` for form handling
  - `lucide-react` for icons

### Styling
- **CSS Framework**: Tailwind CSS
- **Why**: Utility-first, fast styling, consistent design system
- **Component Library**: Headless UI (for accessibility)

### State Management
- **Initial**: React built-in hooks (useState, useContext)
- **Future**: Zustand or Redux Toolkit if complexity grows

## Backend Stack
### Runtime: Node.js with Python Services
- **API Server**: Express.js (Node.js) for main API
- **AI Analysis**: Python services for model integration
- **Why**: Leverage Python's AI ecosystem while keeping API familiar

### AI/ML Integration
- **Primary**: OpenAI GPT-4 or Claude API
- **Backup**: Local models (Ollama) for cost optimization
- **Custom Prompts**: Structured templates for consistent analysis

## Database & Backend Services
### Database: Supabase (PostgreSQL)
- **Why**: 
  - Instant APIs and real-time subscriptions
  - Built-in authentication
  - File storage capabilities
  - Great developer experience

### Tables Structure (Initial)
```sql
-- Users table (handled by Supabase Auth)
-- analyses table
CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  product_name TEXT NOT NULL,
  product_url TEXT,
  user_goals TEXT,
  analysis_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Development Tools
### Code Editor: Cursor with Claude Code
- Integrated AI assistance for faster development
- Intelligent code completion and refactoring

### Version Control: Git + GitHub
- Feature branch workflow
- Automated deployments via GitHub Actions

### Package Management
- **Frontend**: npm or yarn
- **Backend**: npm for Node.js, pip for Python

## Deployment & Infrastructure
### Hosting: Vercel (Frontend) + Railway (Backend)
- **Frontend**: Vercel for React app (automatic deployments)
- **Backend**: Railway for Express API and Python services
- **Database**: Supabase hosted PostgreSQL

### Environment Management
```bash
# Frontend (.env.local)
REACT_APP_API_URL=http://localhost:3001
REACT_APP_SUPABASE_URL=your-supabase-url
REACT_APP_SUPABASE_ANON_KEY=your-anon-key

# Backend (.env)
OPENAI_API_KEY=your-openai-key
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-service-key
PORT=3001
```

## API Architecture
### RESTful Endpoints
```
POST /api/analyze
GET  /api/analyses/:id
GET  /api/analyses (user's analyses)
DELETE /api/analyses/:id
```

### Analysis Flow
1. User submits product data via frontend
2. Express API receives request, validates input
3. Python service called for AI analysis
4. Results stored in Supabase
5. Frontend displays structured output

## Development Phases
### Phase 1: MVP (Week 1-2)
- Basic React form
- Simple Express API
- OpenAI integration
- Static analysis display

### Phase 2: Enhancement (Week 3-4)
- Supabase integration
- User authentication
- Analysis history
- Improved UI/UX

### Phase 3: Optimization (Week 5+)
- Performance improvements
- Advanced features
- User feedback integration
- Production optimizations

## Performance Considerations
- **Frontend**: Code splitting, lazy loading
- **Backend**: API rate limiting, caching strategies
- **AI**: Prompt optimization, response streaming
- **Database**: Proper indexing, query optimization