# LotFoundry — AI Parcel + Style-Matched ADU Plan

## Goal

Add AI assistance to the existing address-to-feasibility workflow without replacing deterministic parcel, zoning, coverage, or financial calculations.

The MVP adds two AI surfaces:

1. **AI Parcel + Permit Brief** — after a user enters an address and parcel data loads, produce one response covering lot fit, key risks, the typical jurisdiction-grounded approval timeline, and next steps. The same result is recorded in the Certificate of Feasibility.
2. **AI Style Match** — let the user upload a home photo, analyze the visible architectural style, and generate a mock ADU concept that visually matches the home.

## Product Principles

- Parcel facts stay deterministic: Regrid, Google, fallback parcel data, and `calculateFeasibility` remain the source of truth.
- AI interprets and explains facts; it does not invent zoning, setbacks, tax, financing, or permit approvals.
- OpenAI calls run only on server routes. The browser never receives `OPENAI_API_KEY`.
- AI outputs are clearly labeled as conceptual estimates, not permitting or construction advice.
- AI generation is user-triggered to control cost.

## Phase 1 — Implemented in this branch

### Server routes

- `POST /api/ai/project-brief`
  - Input: active parcel, ADU config, and the full feasibility result.
  - Output: one structured brief with parcel interpretation, merged risks, an allow-listed permit track and stage timeline, deduplicated next steps, and a disclaimer.
  - Requires auth, is rate-limited, and uses deterministic permit-track/stage tools before the model can finalize its response.
  - This is the user-facing studio and certificate path; the earlier single-purpose parcel-insights and permit-pathway routes were removed in its favor.

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

- The existing `ConstraintsPanel` now includes one `AIProjectBriefPanel` with one generation action for both the parcel readout and approval timeline.
- `FeasibilityStudio` owns the generated brief so the same object flows into `CertificatePanel`, `ReportPreview`, and HTML/CSV downloads without a second user action.
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
4. Sign in and click **Generate** under **AI parcel + timeline**.
5. Confirm one brief returns the parcel summary, risks, permit track, stage ranges, and next steps.
6. Open the Certificate step and confirm that the same brief appears in the certificate preview and HTML/CSV exports.
7. Upload a JPG/PNG/WebP home photo in **AI style match**.
8. Click **Generate matching ADU**.
9. Confirm a style summary and generated concept image appear.

## Phase 2 — Recommended Next

- Persist generated project briefs and selected AI concepts into saved scenarios/share links.
- Add generated concept images to the certificate/report export.
- Add a cost guardrail: daily per-user AI request limits for Firebase-authenticated users.
- Add moderation/safety logging for uploaded image failures.
- Add prompt/eval fixtures for common home styles.
