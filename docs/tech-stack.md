# Tech Stack Overview - Product Teardown Platform

## Current Architecture

The shipped app is a two-part Node/React codebase:

- `backend/` serves the API with Express.
- `frontend/` renders the product experience with React and Vite.
- There is no Python analysis service and no Supabase integration in the current implementation.

## Frontend

- React 19.
- Vite for development, build, and preview.
- Tailwind CSS for layout and component styling.
- React Markdown for rendering teardown content.
- Headless UI for the command palette.
- Browser `localStorage` for saved preferences, the "My product" baseline, and a local mirror of persisted history/feedback.

## Backend

- Express for HTTP routing.
- OpenAI SDK and Anthropic SDK for model calls.
- Joi for request validation.
- Helmet for security headers.
- CORS for browser access from the Vite dev server.
- express-rate-limit for general and analysis-specific throttling.
- Axios for evidence fetching and Turnstile verification.
- Lightweight file-backed persistence for analyses and feedback.

## Product Flow

1. The user submits a product name or URL.
2. The frontend normalizes the input and sends `POST /api/analysis`.
3. The backend validates the payload and checks provider availability.
4. If a URL is present, the backend attempts constrained evidence ingestion from the product site and related pages.
5. The selected model is prompted to return structured JSON whose section values are markdown strings.
6. The backend prefers structured JSON parsing, then falls back to markdown section extraction if the model output is malformed.
7. The backend persists analyses in a lightweight file store, and the frontend renders the teardown, mirrors it locally, and allows editing and comparison.

## Evidence and Trust

- Evidence ingestion is intentionally constrained to the same origin and a small set of common pages.
- Sources are surfaced in the UI with ids, snippets, and links.
- Each section is tagged with a coarse evidence basis and confidence score.
- Citations are only accepted when they match fetched source ids.

## Anti-Abuse

- General request rate limiting is enabled at the app level.
- Analysis requests have a separate hourly limit.
- Optional Cloudflare Turnstile can be enabled in both backend and frontend.
- A lightweight concurrency fuse prevents too many analyses from running at once.

## Current Limits

- No database-backed persistence layer yet.
- No auth.
- No server-side analytics warehouse.
- No streaming response pipeline.
- No structured database schema for analyses yet.

## Current Scripts

Backend:

- `npm start`
- `npm run dev`
- `npm test`
- `npm run test:watch`

Frontend:

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`
- `npm run test`
- `npm run test:ui`
