# Review Guide

This guide is for reviewing the MVP as a product, not continuing feature development.

## Goal

Validate that the core product loop feels coherent and reliable:

1. create a teardown
2. inspect evidence and sources
3. save and reopen the teardown
4. compare multiple teardowns
5. edit a section
6. submit feedback

## Reviewer Setup

1. Install dependencies in `backend/` and `frontend/`.
2. Copy `backend/.env.example` to `backend/.env`.
3. Add at least one real API key:
   - `OPENAI_API_KEY`
   - or `ANTHROPIC_API_KEY`
4. Optionally create `frontend/.env.local` with:

```bash
VITE_API_URL=http://localhost:3001
```

5. Start both servers:

```bash
cd backend && npm run dev
cd frontend && npm run dev
```

6. Open `http://localhost:5173`.

## Suggested Review Flow

### 1. Happy Path

- Enter a product name and URL.
- Add a short focus prompt like `Focus on onboarding and pricing`.
- Generate a teardown.

What to look for:

- analysis completes successfully
- sections are readable and structured
- evidence badge appears
- sources are visible and linked

### 2. Persistence

- Open the library.
- Reopen the saved teardown.
- Refresh the browser and confirm the teardown is still available.

What to look for:

- saved teardown remains available
- title, date, provider, and source state look correct

### 3. Editing

- Open one section.
- Edit and save it.
- Return to the library and reopen the teardown.

What to look for:

- edits persist
- original-vs-edited toggle still works

### 4. Comparison

- Generate or save a second teardown.
- Select 2 saved teardowns in the library.
- Open compare view.

What to look for:

- compare view is usable
- sections align well enough to review across products

### 5. Feedback

- Submit one positive or negative feedback item.

What to look for:

- feedback succeeds without breaking the page
- success state is clear

## MVP Boundaries

These are known non-goals for the current review:

- no auth
- no multi-user separation
- no database
- no export workflow beyond copy / print
- no collaboration features

## Recommended Review Questions

- Does the product feel trustworthy enough to discuss with others?
- Are the outputs specific enough to be useful?
- Does the evidence presentation increase confidence?
- Is the library / compare loop good enough for repeat use?
- Are there any happy-path blockers that make the MVP hard to demo?
