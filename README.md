# Product Teardown Platform

An AI-powered competitive analysis app that generates structured product teardowns from a product name or URL. The current shipped version is a local-first MVP: a React/Vite frontend talks to an Express backend, optional evidence is pulled from product websites, and results can be saved, compared, edited, and annotated in the browser.

## What It Does

- Generates teardown sections for user onboarding, pricing strategy, value propositions, competitive differentiation, and next steps.
- Supports OpenAI or Anthropic as the analysis provider.
- Can ingest evidence from a product URL and nearby pages such as pricing, docs, help, and signup flows.
- Shows evidence source cards, confidence badges, and inline citations when the model references fetched sources.
- Persists analyses on the backend and mirrors them locally so users can revisit and compare previous teardowns.
- Supports a "My product" baseline for side-by-side delta analysis.
- Persists lightweight feedback through a `/api/feedback` endpoint and also stores a local fallback copy in the browser.
- Optionally enables Cloudflare Turnstile for abuse protection.

## Current Stack

- Frontend: React 19, Vite, Tailwind CSS, React Markdown, Headless UI.
- Backend: Express, OpenAI SDK, Anthropic SDK, Joi, Helmet, CORS, express-rate-limit, Axios.
- Testing: Vitest for frontend, Jest + Supertest for backend.
- Storage: lightweight backend file persistence plus browser `localStorage` as a fallback mirror. There is still no database in the current shipped app.

## Run It

### Install

```bash
cd backend
npm install

cd ../frontend
npm install
```

### Configure

Backend environment example:

```bash
cp backend/.env.example backend/.env
```

Frontend environment example:

```bash
echo "VITE_API_URL=http://localhost:3001" > frontend/.env.local
```

Optional Turnstile keys:

- Backend: `TURNSTILE_SECRET_KEY`
- Frontend: `VITE_TURNSTILE_SITE_KEY`

Optional local persistence override:

- Backend: `PTP_DATA_DIR`

### Start Development Servers

```bash
cd backend
npm run dev
```

```bash
cd frontend
npm run dev
```

## Review This MVP

If you want to show this to someone else, use this as the shortest clean path:

1. Start the backend and frontend dev servers.
2. Open `http://localhost:5173`.
3. Run one teardown with a product URL so evidence and sources show up.
4. Edit one section, then confirm it is still there after reopening the saved teardown from the library.
5. Compare two saved teardowns.
6. Submit one feedback item.

A fuller reviewer walkthrough lives in [docs/review-guide.md](/Users/darshen/Documents/product-teardown-platform/docs/review-guide.md).

## Commands

Backend:

- `npm run dev` starts the Express server with `nodemon`.
- `npm start` runs the server with plain `node`.
- `npm test` runs Jest.
- `npm run test:watch` runs Jest in watch mode.

Frontend:

- `npm run dev` starts Vite.
- `npm run build` creates the production bundle.
- `npm run preview` previews the production build.
- `npm run lint` runs ESLint.
- `npm run test` runs Vitest.
- `npm run test:ui` opens the Vitest UI.

## API Surface

- `GET /health` returns a simple health response.
- `GET /api/analysis` lists saved teardowns.
- `POST /api/analysis` creates a teardown.
- `PUT /api/analysis/:id` saves analysis edits.
- `DELETE /api/analysis/:id` deletes one saved teardown.
- `DELETE /api/analysis` clears all saved teardowns.
- `GET /api/feedback` lists persisted feedback.
- `POST /api/feedback` accepts feedback for an analysis.

## Product Notes

- Analyses and feedback are persisted on the backend as lightweight files, not in a database.
- The frontend still mirrors history and feedback locally so the app remains usable if the backend is temporarily unavailable.
- Evidence ingestion is best-effort and intentionally constrained to reduce risk and keep the flow fast.
- Persistent MVP data is written to `backend/data/` by default and is gitignored.

## Repo Layout

- `backend/` contains the Express API and tests.
- `frontend/` contains the React app and UI tests.
- `figma-make-prototype/` is an older Figma-derived prototype bundle kept for reference.
- `figma-make-mcp/` is an auxiliary MCP server for Figma Make workflows.
- `docs/` contains the product and technical notes.

## Known Gaps

- No authentication.
- No database-backed history.
- No collaborative workflows.
- No export pipeline beyond browser print / copy actions.
