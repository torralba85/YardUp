> **Historical design record.** This spec predates the A LOT MORE design system (adopted 2026-09-05)
> and references the retired Blue Hour / Golden Hour system. Read it for history and reasoning, not for
> rules. The source of truth is [`docs/design/`](../../design/README.md).

# Studio + Funnel Revamp — Program Spec

**Date:** 2026-07-01
**Status:** Approved (direction, scope, and monetization confirmed by product owner)
**Design source of truth:** `DESIGN.md` v2 ("Surveyor's desk at golden hour")

---

## Problem

The studio is "overwhelming, confusing, unviewable at times." Root causes, evidenced in code:

1. **Two competing navigation systems.** A 5-item desktop sidebar (`AppShell.tsx` `navItems`) *and* a 3-tab in-studio bar (`StudioTabBar.tsx`). They overlap and duplicate: the "Certificate" tab and the "Estimate Summary" sidebar item render the same `EstimateSummaryPanel`; "Export Preview" opens a modal. The user must hold two mental models.
2. **No narrative spine.** The funnel (value → local resources → regulations → builders → certificate) is never walked. Everything renders at once as a dense dashboard.
3. **The money figure is rendered four ways on one screen** — verdict band (44px), constraints rail (21px), metrics strip (3xl), estimate panel (2xl). Repetition reads as noise.
4. **Panel sprawl / redundancy.** AI Insights + Style-Match live both embedded in the constraints rail and as their own sidebar destinations; the Permit Guide is an orphan; the certificate and builder-connection (the two revenue moments) are buried in modals.
5. **"Unviewable" is a real layout defect.** The shell locks `lg:h-dvh lg:overflow-hidden` and forces the WebGL scene, a scrolling rail, and a 6-cell metrics strip to share one fixed viewport height; on short screens each collapses to a sliver. Ad-hoc z-index (`z-40`, `z-[100]`, `z-50`, `z-30`, `z-20`, `z-10` all coexisting) causes modal-stacking collisions.
6. **Accessibility debt.** 9.5–10px mono at low-contrast taupe, the dual-nav model, and modal stacking are WCAG 2.2 risks — and a store-review blocker for iOS/Android.

## North star

Collapse everything into **one guided spine that is the funnel**. A homeowner walks a single linear journey; the revenue moments are destinations on that journey, not bolted-on modals.

```
1  YOUR LOT            address search → "your backyard could earn $X/mo"  (value hook)
2  FEASIBILITY & RULES what the lot allows + local regulations + local resources + verdict
3  DESIGN (optional)   massing + inspiration/style-match, consolidated
4  CERTIFICATE  ($)    engraved Certificate of Feasibility — user-revenue moment (Stripe)
5  BUILDERS     ($)    matched local builders + connect — builder-referral moment (lead-unlock)
```

### Principles

- **One navigation model.** Desktop = a left **step rail** (replaces the 5-item sidebar; deletes the 3-tab bar). Mobile = a top **step progress** + simplified bottom nav mapped to the same five steps. `aria-current`, keyboard nav, logical focus order.
- **One money treatment.** A single canonical `MoneyFigure` component; the espresso band is the only hero render of `$/mo`. Other figures (NOI, cost, payback) are supporting facts, not competing headlines.
- **Content has a home.** Local regulations + resources consolidate into step 2. AI panels are rationalized (no double-mounting). Massing + inspiration consolidate into step 3.
- **Revenue is designed into the arc.** The paid certificate (step 4) and builder referral (step 5) are clear destinations with purpose-built purchase/connect surfaces wired to the existing Stripe + lead-unlock plumbing.
- **Viewability.** Replace the rigid single-viewport lock with a scroll-friendly layout that guarantees workable minimums for scene and content; introduce a z-index token scale to end modal collisions.
- **Accessibility (WCAG 2.2 AA) is not a phase, it is a constraint** on every phase: 4.5:1 text contrast, 44×44 targets, visible focus, SR landmarks per step, reduced-motion (already good). A final audit closes it out.

## Scope

All three surfaces (product owner chose "Everything"): **studio + marketing landing + builder dashboard**, with **real payment wiring** for both revenue moments. Existing plumbing to reuse (do not rebuild): `app/api/stripe/{checkout,checkout-credits,webhook}`, `lib/stripe.ts`, `lib/lead-unlock-*.ts`, `lib/server/lead-unlocks.ts`, `lib/marketplace*.ts`, `lib/report.ts`.

## Decomposition (each phase = its own spec → plan → build → verify → PR)

| Phase | Deliverable | Depends on |
|---|---|---|
| **P0 Foundation** | Spacing rhythm + z-index tokens; accessible primitives (`MoneyFigure`, `Button`, `Panel`/`PanelHeader`, `StatusChip`, `Field`/`Segmented`/`Slider`, `StepRail`/`StepProgress`). Prove by refactoring ≥2 call sites each. | — |
| **P1 Studio spine (desktop)** | Replace dual-nav with the 5-step spine; one money band; viewability + z-index fix. | P0 |
| **P2 Studio spine (mobile) + content merge** | Mobile step progress + nav; merge Feasibility+Rules+Resources; consolidate Design panels. | P0, P1 |
| **P3 Certificate (paid)** | Certificate destination + live Stripe checkout for complete-certificate generation. | P1 |
| **P4 Builders (referral)** | Builder destination + lead-unlock/referral charge on connect. | P1 |
| **P5 Landing** | Value→studio handoff aligned to the new system/primitives. | P0 |
| **P6 Builder dashboard** | Align builder-side surfaces to the new system. | P0 |

Accessibility fixes ride inside each phase; a final WCAG 2.2 AA audit + fix pass closes the program.

## Program-level success criteria

- A first-time homeowner can go address → value → rules → (design) → certificate → builder as one legible path, with only one navigation model on screen at a time.
- `$/mo` renders through a single component; no surface shows the headline money figure more than once.
- No fixed-viewport squeeze: the scene and primary content each keep a workable minimum at 768px height; no overlay z-index collisions.
- WCAG 2.2 AA: automated axe checks clean on each surface; manual keyboard + SR pass; contrast + target-size verified.
- Both revenue moments complete end-to-end against the existing Stripe/lead-unlock plumbing.
- Release gate green every phase: `npm run lint && npm run test && npx tsc --noEmit && npm run build`.

## Non-goals

- No new backend/payments architecture — reuse existing plumbing.
- No native (Swift/Kotlin) shells — web + PWA (PWABuilder wrapper) only.
- No feasibility-engine math changes (`lib/feasibility.ts` calculations stay intact).

## Related / prior art to reconcile

- `docs/superpowers/specs/2026-06-29-studio-field-book-redesign-design.md` (prior studio redesign — review for overlap before P1).
- `docs/superpowers/specs/2026-06-25-landing-income-rail-design.md` (income-led north star — keep).
- `docs/superpowers/specs/2026-07-01-bulk-lead-credits-design.md` (builder credits — relevant to P4).
