# Frontend

React/Vite frontend for the Product Teardown Platform.

## What It Includes

- Omnibox-style product input that accepts a name or URL.
- Optional focus/goals field.
- Optional "My product" baseline for delta comparisons.
- Analysis history loaded from the backend and mirrored in browser `localStorage`.
- Compare view for saved analyses.
- Editable teardown sections.
- Evidence badges, source links, and raw-analysis fallback.
- Feedback widget that persists to the backend and stores a local fallback copy.
- Optional Turnstile widget when `VITE_TURNSTILE_SITE_KEY` is set.

## Scripts

- `npm run dev` starts the Vite dev server.
- `npm run build` creates the production build.
- `npm run preview` previews the production build.
- `npm run lint` runs ESLint.
- `npm run test` runs Vitest.
- `npm run test:ui` opens the Vitest UI.

## Environment

Create `frontend/.env.local` if you want to override defaults:

```bash
VITE_API_URL=http://localhost:3001
VITE_TURNSTILE_SITE_KEY=your-site-key
```

## Notes

- The frontend prefers backend persistence for saved analyses and feedback, then keeps a local mirror as fallback.
- The UI is wired to the current backend contract, not the older Figma prototype shape.
- Frontend lint, tests, and production build are all passing on the current branch.
