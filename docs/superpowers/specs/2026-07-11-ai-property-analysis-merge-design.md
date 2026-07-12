# Merged AI Property Analysis — Preview → Certificate Upsell — Design

**Date:** 2026-07-11
**Status:** Implemented same-day (autonomous session); review welcome

## Problem

The studio's right rail stacks two disconnected AI panels:

- **AI Property Insights** ("Translate the parcel data") — anonymous-capable, single-shot readout: headline, summary, best fit, risks, next steps.
- **AI Permit Pathway** ("Map the approval timeline") — sign-in-gated, agentic (grounded in `lib/server/permit-rules.ts` tools): permit track, staged timeline, review flags, next steps.

Two Generate buttons, two overlapping "next steps" lists, two disclaimers — and neither drives revenue. The user direction: merge them into **one cohesive, thorough analysis of the property**, show a **free preview**, and attach the **full analysis to the paid Certificate of Feasibility** so the preview sells the certificate.

## Goals

1. One panel, one Generate action, one cohesive narrative covering what the lot allows, what it could earn, and how permitting will likely go.
2. Everyone (including guests) can generate a **preview** — enough substance to be credible, clearly less than the whole.
3. The **full analysis** requires the certificate purchase, verified **server-side**; it renders in the panel and is attached to the certificate artifact (`ReportPreview` strip + downloadable engraved HTML/text certificate).
4. Old panels, routes, and API functions are removed — no dead surface left behind.

## Non-Goals

- Persisting generated analyses (matches today's panels: in-memory per session).
- Changing certificate pricing/checkout (reuses `certificateKey`, `useCertificateAccess`, `hasCertificate`).
- Touching the Style-Match / ADU-concept AI flow.

## Approaches Considered

1. **Client-side stitch** — call both existing routes, render together. Rejected: two narratives glued, no cohesive story, paid gating client-side only (trivially bypassed), keeps both routes alive.
2. **Two-tier generation** — cheap single-shot for preview, agentic run for full. Rejected: preview and full can contradict each other (different permit tracks/timelines), doubling prompt maintenance.
3. **One generation, server-side redaction** *(chosen)* — one agentic run produces the full analysis; the route returns it whole only to verified purchasers, otherwise returns a **redacted preview of the same content** plus honest locked-content counts. The preview can never contradict the full version because it *is* the full version, cut down. Paid content never leaves the server for non-purchasers.

## Design

### Contract (`lib/ai-types.ts`)

- `AIPropertyAnalysis` (full): `headline`, `summary`, `bestFit`, `risks[]` (2–4, merged property + permit review flags), `permitTrack {name, type, basis}`, `permitStages[]` (tool-grounded), `totalEstWeeksLow/High`, `recommendedNextSteps[]` (3–5 unified), `disclaimer`.
- `AIPropertyAnalysisPreview`: `headline`, `summary`, `permitTrack {name, type}` (no basis), `totalEstWeeksLow/High`, `firstRisk`, `locked {riskCount, stageCount, nextStepCount}`, `disclaimer`.
- `AIPropertyAnalysisResponse = { tier: "full", analysis } | { tier: "preview", preview }` — discriminated union.
- Input = the superset the old insights route took (`parcel`, `config`, full `result` pick). Old `AIParcelInsights*` / `AIPermitPathway*` top-level types are removed; `AIRiskLevel`, `AIParcelRisk`, `AIPermitStage` remain shared primitives.

### Server

- `lib/server/ai-pipeline.ts` gains two optional definition fields, both backward-compatible:
  - `auth?: "required" | "optional"` (default `"required"`) — optional auth resolves a uid when a valid Bearer token is present, else `null`, instead of 401-ing.
  - `finalize?: (output, {uid, input}) => Promise<unknown>` — post-process the structured output before responding (default: identity).
- `lib/server/panels/property-analysis.ts` (new): merged output schema, cohesive system prompt, the same two grounding tools (`lookup_permit_tracks`, `get_stage_benchmarks`, required in sequence), `redactAnalysisToPreview()` (pure, exported for tests), and `finalize` = purchased (`hasCertificate(uid, certificateKey(parcel))`) ? full : preview. Rate limit 8/min (replaces two panels).
- `app/api/ai/property-analysis/route.ts` (new) = `createAIPanelRoute(propertyAnalysisDef)`, `maxDuration = 90`.
- Deleted: `app/api/ai/parcel-insights/`, `app/api/ai/permit-pathway/`, `lib/server/panels/permit-pathway.ts` (+ test, superseded by the new def's tests).

### Client

- `components/studio/AIPropertyAnalysisPanel.tsx` (new) replaces both panels inside `ConstraintsPanel` (desktop rail + mobile sheet automatically):
  - Header: mono eyebrow "AI property analysis", title "The whole property, in plain English", one clay Generate button (all users).
  - `tier: "preview"` render: headline + summary, permit track + weeks band (display-serif figure), the one risk card, then a **rectangular dashed locked frame** (read-only content frame per the pill-radius system): what the full analysis contains (real counts), "attached to your Certificate of Feasibility", and a forest **commit** CTA "Unlock with the certificate — {price}" routing to the Certificate step (`onViewCertificate`).
  - `tier: "full"` render: complete unified layout (summary → best fit → risks → permit track/timeline/stages → next steps → disclaimer) with a "Purchased" chip; the panel reports the analysis upward.
- `ConstraintsPanel` passes through `onViewCertificate` and a new `onAnalysis` callback; `FeasibilityStudio` stores the full analysis and forwards it to both `ReportPreview` instances and the report builders.
- `ReportPreview` lists "AI property analysis" in "Report Includes" and shows a compact permit-track line when the analysis is attached.
- `lib/report.ts`: `ReportInput.analysis?` — the engraved HTML certificate gains an "AI Property Analysis" section (permit track + staged timeline + risks; `recommendedNextSteps` replace the generic three when present); text certificate gains the same in plain text. CSV unchanged.
- `lib/ai-api.ts`: `requestPropertyAnalysis(input, idToken?)`; old request functions removed.

### Guest / auth / purchase matrix

| Caller | Response |
|---|---|
| Guest (no token) | preview |
| Signed in, not purchased | preview |
| Signed in, purchased (server-verified) | full |
| `LOTFOUNDRY_ALLOW_PUBLIC_API` dev mode | uid `local-dev` → purchase check runs (demo unlock flag grants apply) |

## Error Handling

Unchanged taxonomy via `createAIRouteErrorResponse`; panel shows the existing brick alert. Purchase-check failures degrade to preview (never 500 the whole analysis for a Firestore hiccup) and log.

## Testing

- `lib/server/panels/property-analysis.test.ts` — input validation; redaction (drops basis/stages/steps, keeps first risk, counts honest); finalize gating with stubbed `hasCertificate`.
- `lib/server/ai-pipeline.test.ts` — optional-auth path and finalize hook.
- `components/studio/AIPropertyAnalysisPanel.test.tsx` — preview render (lock + counts + CTA fires `onViewCertificate`), full render, error state, key function.
- `lib/report.test.ts` — analysis section renders when provided, absent otherwise.
- Release gate: `npm run lint && npm run test && npx tsc --noEmit && npm run build`.

## Rollout / Risk

No schema/Firestore changes; the only new read is `certificatePurchases` from an AI route (Admin SDK, existing collection). Removing two public `/api/ai/*` routes is safe: both were only called by the panels this change replaces. Docs (`CLAUDE.md`, `AGENTS.md`, `README.md`) updated to name the new route.
