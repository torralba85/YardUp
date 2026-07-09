# LotFoundry — AI Parcel + Style-Matched ADU Plan

## Goal

Add AI assistance to the existing address-to-feasibility workflow without replacing deterministic parcel, zoning, coverage, or financial calculations.

The MVP adds two AI surfaces:

1. **AI Property Insights** — after a user enters an address and parcel data loads, summarize what the lot appears to support, key risks, and next steps.
2. **AI Style Match** — let the user upload a home photo, analyze the visible architectural style, and generate a mock ADU concept that visually matches the home.

## Product Principles

- Parcel facts stay deterministic: Regrid, Google, fallback parcel data, and `calculateFeasibility` remain the source of truth.
- AI interprets and explains facts; it does not invent zoning, setbacks, tax, financing, or permit approvals.
- OpenAI calls run only on server routes. The browser never receives `OPENAI_API_KEY`.
- AI outputs are clearly labeled as conceptual estimates, not permitting or construction advice.
- AI generation is user-triggered to control cost.

## Phase 1 — Implemented in this branch

### Server routes

- `POST /api/ai/parcel-insights`
  - Input: active parcel, ADU config, feasibility result.
  - Output: structured JSON with headline, summary, best fit, risks, next steps, and disclaimer.
  - Uses OpenAI Responses API structured outputs.

- `POST /api/ai/adu-concept`
  - Input: uploaded image file plus active parcel and ADU config.
  - Step 1: uses vision to extract home style cues and a recommended ADU configuration.
  - Step 2: uses image generation to create a style-matched conceptual ADU image.
  - Output: structured style analysis plus a base64 PNG data URL.

### Shared client code

- `lib/ai-types.ts` defines UI-safe AI result types.
- `lib/ai-api.ts` provides client fetch helpers and user-friendly error handling.
- `lib/server/openai.ts` centralizes server-side OpenAI Responses API calls.

### UI integration

- The existing `ConstraintsPanel` now includes:
  - `AIPropertyInsightsPanel`
  - `AIPermitPathwayPanel`
- Style-matched ADU concepts live on the Design step via `StyleMatchPanel`, embedded in `InspirationGalleryPanel`.

This keeps AI close to the feasibility decision point without disrupting the existing massing controls or report workflow.

## Environment Variables

Add this server-only variable before using the AI features:

```bash
OPENAI_API_KEY=<server-side OpenAI API key>
```

Optional model overrides:

```bash
OPENAI_TEXT_MODEL=gpt-5.5
OPENAI_IMAGE_MODEL=gpt-5.5
```

## Verification

Run:

```bash
npm run lint
npm run test
npx tsc --noEmit
npm run build
```

Manual smoke test:

1. Start the app.
2. Search a real address or use a demo parcel.
3. Open the Feasibility tab.
4. Click **Generate AI readout**.
5. Confirm the insight card returns a summary, risks, and next steps.
6. Upload a JPG/PNG/WebP home photo in **AI style match**.
7. Click **Generate matching ADU**.
8. Confirm a style summary and generated concept image appear.

## Phase 2 — Recommended Next

- Persist selected AI concepts into saved scenarios.
- Add generated concept images to the certificate/report export.
- Add a cost guardrail: daily per-user AI request limits for Firebase-authenticated users.
- Add moderation/safety logging for uploaded image failures.
- Add prompt/eval fixtures for common home styles.
