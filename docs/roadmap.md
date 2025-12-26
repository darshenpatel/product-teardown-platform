# Roadmap: Product Teardown Platform

## Product direction
- **Primary wedge (next 4–8 weeks)**: PM-focused competitive teardown (onboarding, pricing, value props, differentiation).
- **Evidence bar (v1)**: Hybrid — cite sources when available; otherwise label inference/uncertainty.

## Phase 1 — Trust & evidence (ship first)
### Outcomes
- Users can paste a product URL and see **citations** and **confidence**.
- Users can quickly understand **what is sourced vs inferred**.

### Milestones
- URL ingestion (homepage + pricing + docs best-effort) with timeouts and size limits.
- `sources[]` returned in the analysis payload.
- Per-section evidence meta (basis, confidence, limitations).
- UI renders sources and evidence badges.

### Success metrics
- % analyses with ≥ 2 sources (when `productUrl` provided)
- User-reported trust (“Was this accurate?”)
- Median analysis latency (keep within acceptable bounds)

## Phase 2 — Workflow & retention
### Outcomes
- Users can return, browse prior analyses, and compare competitors.
- Teardowns become an asset, not a one-off answer.

### Milestones
- Save analysis history (local-first; later account-backed).
- Compare view (2–3 competitors side-by-side).
- Export/share improvements (markdown/doc-friendly + shareable links later).

### Success metrics
- Repeat usage (analyses/user/week)
- # saved comparisons created
- Export/share events

## Phase 3 — Expand into 4 “modes”
Once evidence + workflow are solid, add output modes that reuse the same evidence pipeline + storage.

### Mode A — Battlecards (PMM / Sales)
- Objections, landmines, talk tracks, traps, “when to use vs not use”.
- Integration targets: Slack/Teams, CRM, Notion/Confluence (later).

### Mode B — UX teardown
- Concrete flow critique, friction scoring, screenshots/flow capture (later).
- Requires richer evidence capture (screens, recordings, or curated libraries).

### Mode C — Founder validation
- Market map, ICP hypotheses, positioning recommendations, wedge suggestions.
- Requires competitor set management + market context signals.

## Technical notes
- **Backend** currently lives in `backend/src/routes/analysis.js` and returns parsed markdown sections.
- Evidence ingestion starts in Node (no Python required); `ai-services/` can be introduced later if you want deeper scraping or specialized pipelines.


