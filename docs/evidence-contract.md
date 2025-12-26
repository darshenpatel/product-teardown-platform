# Evidence Contract (Hybrid): Sources + Confidence

## Goal
Increase trust without slowing the UX too much:
- **If evidence is available** (e.g., product site / pricing page / docs), **cite it**.
- **If evidence is not available**, allow reasonable inference, but **label it clearly**.

This contract is designed to work with the current backend approach (LLM returns markdown; backend parses into 4 sections).

## Response shape (v1)
Backend returns:

```json
{
  "success": true,
  "data": {
    "id": "analysis_...",
    "product_name": "Notion",
    "product_url": "https://www.notion.so",
    "user_goals": "...",
    "ai_provider": "openai",
    "analysis_data": {
      "sections": {
        "onboarding": "markdown...",
        "pricing": "markdown...",
        "valueProps": "markdown...",
        "competitive": "markdown..."
      },
      "evidence": {
        "overall": {
          "basis": "inferred|mixed|sourced",
          "confidence": 0.0,
          "limitations": []
        },
        "onboarding": {
          "basis": "inferred|mixed|sourced",
          "confidence": 0.0,
          "sourceIds": [],
          "limitations": []
        },
        "pricing": { "basis": "inferred|mixed|sourced", "confidence": 0.0, "sourceIds": [], "limitations": [] },
        "valueProps": { "basis": "inferred|mixed|sourced", "confidence": 0.0, "sourceIds": [], "limitations": [] },
        "competitive": { "basis": "inferred|mixed|sourced", "confidence": 0.0, "sourceIds": [], "limitations": [] }
      },
      "sources": [
        {
          "id": "src_1",
          "url": "https://example.com/pricing",
          "title": "Pricing - Example",
          "type": "pricing|homepage|docs|blog|other",
          "fetchedAt": "2025-01-01T00:00:00.000Z",
          "snippet": "Short excerpt used for grounding..."
        }
      ],
      "rawAnalysis": "full markdown response",
      "generatedAt": "2025-01-01T00:00:00.000Z"
    },
    "created_at": "2025-01-01T00:00:00.000Z"
  }
}
```

### Field semantics
- **`sources[]`**: the evidence corpus we actually fetched and used as grounding context.
  - `snippet` is short and safe to return to the UI (do not return full scraped text).
- **`evidence.*.basis`**:
  - `sourced`: most claims are directly grounded in sources.
  - `mixed`: some claims grounded; some inferred.
  - `inferred`: no usable sources; model relied on general knowledge/inference.
- **`confidence`**: a coarse 0–1 score (v1 is heuristic; later can be model-estimated).
- **`limitations[]`**: explicit missing data issues (e.g., “pricing behind auth”, “URL not reachable”).

## URL ingestion (v1)
If `productUrl` is provided:
- Fetch the **exact URL**.
- Attempt a small set of **derived URLs** on the same origin (best-effort, short timeouts):
  - `/pricing`, `/plans`
  - `/signup`, `/register`
  - `/docs`, `/help`, `/features`

Constraints/safety:
- Short timeout (e.g., 6–10s) and max download size.
- Only parse `text/html` (skip binaries).
- Strip scripts/styles; extract readable text; truncate to a bounded size for prompts.

If `productUrl` is missing:
- v1 does not crawl the web. Mark evidence as `inferred`.

## Prompting + citations (v1)
We instruct the model to:
- Use sources when present.
- Reference sources inline using **source IDs** (example: `... [src_1]`).
- Avoid inventing citations; only use the provided IDs.

## UI placement (v1)
In `AnalysisDisplay`:
- **Header**: show “Evidence basis” + confidence (e.g., `Mixed • 0.7`) and a “Sources” drawer.
- **Per section**: show a small badge:
  - `SOURCED` (green), `MIXED` (blue), `INFERRED` (amber)
  - optional confidence number
  - optional “View sources used” link (filters to `sourceIds`)


