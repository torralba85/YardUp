# P4 — Builders Destination (Referral Loop) Design Spec

**Date:** 2026-07-01
**Program:** `2026-07-01-studio-funnel-revamp-program.md`
**Depends on:** P1 (Builders step exists), existing marketplace plumbing
**Status:** Approved to build

---

## Goal

Make the homeowner-facing **Builders step a real destination** that closes the referral loop. The builder-side charging already exists end-to-end (`connectionRequests` → `leadUnlocks` $49 / bulk credits, Stripe + webhook + Firestore rules); what's missing is the homeowner surface: today the step is a bare centered CTA that opens a modal, with no evidence of *who* they'd be connecting with.

## Model — what already works (do not rebuild)

1. Homeowner submits `BuilderLeadPanel` → `createConnectionRequest` writes a redacted preview root + gated PII subdoc, matched to builders by service area.
2. Matched builders see the banded preview in their inbox and **pay to unlock** the contact (the referral charge — LotFoundry's builder revenue).
3. `getMatchedBuilders(builders, "City, ST")` + `fetchActiveBuilders()` already compute matching client-side.

## What P4 adds

### `BuildersPanel` (new; replaces the inline `BuildersStep`)

The step body, used by desktop and mobile branches:

- **Signed-in:** fetch active builders once on mount, match to the active parcel's city. Render **matched-builder cards**: company name, "Licensed" chip when a license number exists, service-area chips. Never show builder contact email/phone — contact flows through the referral, not around it. A count line ("3 builders serve Seattle, WA").
- **Zero matches:** honest empty state — "No builders are registered for {city} yet" + still allow submitting (the request waits for network growth) or disable with guidance, matching `handleBuilderLeadSubmit`'s existing "no local builders" error. Keep the existing behavior: the submit errors when no builders match, so disable the CTA and say why.
- **Guest:** value framing + "Sign in to see matched builders" (opens the auth modal).
- **Transparency line (business-model honesty):** "Free for homeowners — builders pay LotFoundry for the introduction, never you."
- **Connect CTA** (`Button variant="commit"`) opens the existing `BuilderLeadPanel` modal (tested flow, untouched).

### Wiring

- Desktop `activeStep === "builders"` and the mobile `builders` sheet branch render `BuildersPanel` (drop the inline `BuildersStep`).
- Panel fetches via `fetchActiveBuilders` and filters via `getMatchedBuilders` — no new server code, no rules changes.

## Accessibility

- Cards are a list (`ul/li`) with the count announced in text. Chips are label+icon (StatusChip conventions).
- Loading state `aria-busy`; guest CTA and connect CTA are real 44px `Button`s.

## Success criteria

- Builders step shows matched builders (signed-in), an honest zero-state, or a sign-in prompt (guest) — on desktop and mobile.
- Builder contact info is never rendered pre-connect (referral can't be bypassed).
- Connect still flows through `BuilderLeadPanel` → `createConnectionRequest` (existing referral loop intact; builder pays to unlock).
- Unit tests: matched rendering, zero-state disable, guest state, connect callback (mocked `marketplace-firestore`).
- Release gate green: `lint && test && tsc --noEmit && build`.

## Non-goals

- New charging mechanics (already exist), builder dashboard changes (P6), ranking/sorting algorithms (network is small).
