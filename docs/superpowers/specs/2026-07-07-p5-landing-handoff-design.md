> **Historical design record.** This spec predates the A LOT MORE design system (adopted 2026-09-05)
> and references the retired Blue Hour / Golden Hour system. Read it for history and reasoning, not for
> rules. The source of truth is [`docs/design/`](../../design/README.md).

# P5 Landing → Studio Handoff — Design Spec

**Date:** 2026-07-07
**Status:** Approved (scope confirmed by product owner: all four gaps; certificate specimen for the revenue arc)
**Program:** `2026-07-01-studio-funnel-revamp-program.md`, phase P5 ("Value→studio handoff aligned to the new system/primitives")
**Design law:** `DESIGN.md` v3 — Dual-Lighting System seam spec + invariant 4 ("the certificate is the sun")

## Context

P5 was specced 2026-07-01, before the Blue Hour landing rebuild (#93), the dawn
studio handoff (`DawnStudioLink`, 2026-07-05), and the six-channel hero
interactivity (#95). Those passes already delivered most of P5's original
surface: the landing value hook (hero verdict plate + `SignalLedger` typical
band), the privacy-preserving session-storage address handoff
(`lib/address-handoff.ts` → `FeasibilityStudio` auto-search), the 520ms dawn
ramp on every studio-bound CTA, and estimate-honest copy throughout.

Diffing what shipped against DESIGN.md's seam spec and the program's
principles leaves four verified gaps:

1. **The first-run wizard interrupts the handoff (defect).**
   `shouldShowWizard` (`lib/wizard-state.ts`) only checks the URL for a
   scenario, but the handed-off address travels via session storage. A
   first-time mobile guest who typed their address on the landing gets the
   wizard modal asking for it *again* — a direct violation of the seam rule
   "no onboarding modal" and of the money-within-3-seconds rule.
2. **Studio arrival breaks the seam.** `app/studio/page.tsx` shows
   "Loading studio..." on plain sand with no money figure while auth
   resolves. DESIGN.md: "A money-green figure must be visible within 3
   seconds of arrival. No onboarding modal, no spinner-on-white."
3. **The revenue arc is missing from the landing story.** The studio spine
   ends at Certificate ($) and Builders ($), but the landing narrative
   (OwnerPath steps 01–03, DuskShowcase) stops at the free report. Invariant
   4 explicitly calls for the certificate "embedded on the night landing (a
   lit window in a dark house)."
4. **No end-to-end journey test.** `e2e/hero.spec.ts` verifies URL privacy
   but never that the studio consumes the address, suppresses the wizard,
   and keeps the money moment.

## Decisions

- **Wizard yields to a pending handoff.** Add a non-destructive
  `peekAddressQuery()` to `lib/address-handoff.ts`; `shouldShowWizard` gains
  a required `hasPendingAddress` input. Peek (not consume) because the
  hydration effect that runs later still needs the value.
- **Dawn arrival plate (interim seam).** The auth-loading splash becomes a
  parchment plate showing the typical rent band in forest Cormorant
  (`lf-money-lg`) with the "typical · supported markets" eyebrow — money
  visible from the first arrival frame. The full "settle-and-stamp studio
  assembly" choreography from the seam spec stays a separate future phase.
  `TYPICAL_MARKET` moves from `components/landing/nocturne/typical-market.ts`
  to `lib/typical-market.ts` so a daylight surface never imports from the
  nocturne folder.
- **Certificate specimen section** (`CertificateSpecimen.tsx`), placed
  between DuskShowcase and ClosingCall: daylight parchment card (`lf-*`
  tokens, Cormorant figures, forest money, brick "Concept · not a permit"
  stamp) on the night ground — the sanctioned co-appearance. The left column
  extends OwnerPath's numbering with destinations 04 (Own the record —
  certificate, paid) and 05 (Meet your builders — builder connect).
  OwnerPath itself stays 3 steps (product-owner choice). No CTA in the
  section — ClosingCall follows immediately and keeps the single quiet ask.
- **Journey e2e** (`e2e/handoff.spec.ts`): desktop + mobile tests submit a
  deliberately unresolvable address so the studio's `role="alert"` banner
  proves the handed-off search ran in *both* keyed and keyless
  environments; assert money visibility, wizard suppression, and URL
  privacy.

## Success criteria

- Mobile first-visit from the landing hero lands in the searched studio
  sheet with no wizard.
- A money figure is visible from the first frame of `/studio` arrival
  (arrival plate) through step 1 (demo-parcel `MoneyFigure`).
- The landing narrative reaches both revenue destinations; the specimen
  renders parchment + Cormorant per invariant 4.
- Journey e2e green on desktop-chromium and mobile-chromium, with and
  without live API keys.
- Release gate green: `npm run lint && npm run test && npx tsc --noEmit && npm run build`.

## Out of scope

- Settle-and-stamp studio assembly choreography (seam spec's full arrival
  animation) — future phase.
- OwnerPath restructure (stays 3 steps), Remotion composition changes,
  new payment surfaces, P6 builder-dashboard alignment.
