# Project Brief Preview Tier — Certificate Upsell — Design

**Date:** 2026-07-12
**Status:** Implemented
**Builds on:** the unified certificate AI brief (PR #110, refined in #118). Resolves the product gap the closed draft #114 targeted, on #110's architecture.

## Problem

After #110, one `AIProjectBriefPanel` generates the complete parcel + timeline brief for **any signed-in user, free**, in the studio rail — while the paid Certificate of Feasibility lists that same brief as part of its contents. There is no incentive gradient: users can read everything the certificate would record without buying it. The requested product mechanic: show a **free preview** of the analysis and attach the **full version to the purchased certificate**, so the preview sells the unlock.

## Design

One generation, **server-side redaction**. The route runs the same agentic brief generation for everyone; only verified purchasers receive it whole. The preview *is* the full brief, cut down — it can never contradict the paid content, and the paid depth never leaves the server for non-purchasers.

### Contract (`lib/ai-types.ts`)

- `AIProjectBriefPreview`: `headline`, `summary`, `permitTrack {name, type}` (statutory basis withheld), `totalEstWeeksLow/High`, `firstRisk` (top risk in full), `locked {riskCount, stageCount, nextStepCount}` (honest counts), `disclaimer`.
- `AIProjectBriefResponse = { tier: "full", brief } | { tier: "preview", preview }` — the new `/api/ai/project-brief` payload.

### Server

- `lib/server/ai-pipeline.ts`: optional `finalize(output, {uid, input})` hook on `AIPanelDefinition`, applied after `runAgentic` (default identity; backward compatible — auth stays required).
- `lib/server/panels/project-brief.ts`: exported pure `redactBriefToPreview()`; `finalize` returns full when `hasCertificate(uid, certificateKey(input.parcel))`, else the redacted preview. A purchase-ledger read failure degrades to preview (never fails the brief) and logs a warning.

### Client

- `FeasibilityStudio` stores the tiered response; derives `projectBrief` (full tier only) for the certificate panel, report preview, and HTML/CSV exports — a preview can never be recorded into the artifact. `ConstraintsPanel` passes the full response plus `onViewCertificate` into the panel.
- `AIProjectBriefPanel` renders by tier. Preview: headline + summary with a rectangular "Preview" data chip, the approval-path band (track name/type + total weeks), the single top risk, then a dashed locked frame stating the full brief's honest contents ("N ranked risks · M permit stages with week-by-week timing · K recorded next steps — attached to your engraved Certificate of Feasibility") with a forest **commit** CTA "Unlock with the certificate — {price}" routing to the Certificate step. Full: unchanged #110 layout.
- Post-purchase behavior is unchanged: the certificate auto-open flow (#118) regenerates when no full brief is held, now receiving `tier: "full"`, which attaches to the certificate and its exports.

## Testing

- `project-brief.test.ts`: redaction keeps the hook and drops basis/bestFit/stages/steps (serialization check), counts honest, empty-risk fallback; finalize full-for-purchaser / preview-for-non-purchaser / preview-on-ledger-error.
- `ai-pipeline.test.ts`: finalize payload replaces the raw output; hook receives `{uid, input}`.
- `AIProjectBriefPanel.test.tsx`: preview shows hook + locked counts + CTA firing `onViewCertificate`, and does **not** render the paid depth; full render unchanged.

## Risk

No schema/Firestore changes; the only new server read is the existing `certificatePurchases` collection from the AI route via the Admin SDK. Dev/demo: `LOTFOUNDRY_DEMO_UNLOCKS` grants still produce real ledger docs, so demo purchases unlock the full tier end-to-end.
