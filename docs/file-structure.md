# File Structure - Product Teardown Platform

## Actual Repo Layout

```text
product-teardown-platform/
├── backend/                  # Express API server
├── frontend/                 # React/Vite frontend
├── figma-make-prototype/     # Auxiliary prototype bundle from Figma Make
├── figma-make-mcp/           # MCP server for Figma Make workflows
├── docs/                     # Project documentation
├── README.md
└── ...
```

## Frontend

```text
frontend/
├── src/
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   ├── main.jsx
│   ├── __tests__/
│   ├── components/
│   │   ├── ProductInputForm.jsx
│   │   ├── AnalysisDisplay.jsx
│   │   ├── LoadingState.jsx
│   │   ├── AnalysisHistory.jsx
│   │   ├── AnalysisCompare.jsx
│   │   ├── FeedbackWidget.jsx
│   │   ├── CommandPalette.jsx
│   │   └── TurnstileWidget.jsx
│   │   └── __tests__/
│   └── test/
├── public/
├── package.json
├── vite.config.js
├── vitest.config.js
└── tailwind.config.js
```

## Backend

```text
backend/
├── src/
│   ├── app.js
│   ├── routes/
│   │   ├── analysis.js
│   │   ├── feedback.js
│   │   └── __tests__/
│   ├── utils/
│   │   ├── envValidator.js
│   │   ├── turnstile.js
│   │   └── urlEvidence.js
│   └── __tests__/
├── package.json
├── jest.config.js
├── .env.example
└── .env
```

## Prototype And Tooling Folders

`figma-make-prototype/` contains a separate prototype app and example assets from the original design-to-code flow. It is not the main shipped product, but it is useful as a reference bundle.

`figma-make-mcp/` contains a small MCP server used to inspect Figma Make files and prototype metadata.

## What Is Not Present

- No `ai-services/` directory in the actual repo.
- No Supabase client code.
- No production database models or migrations.
- No router-level analytics or user auth modules.
- No shared monorepo workspace file at the root.
