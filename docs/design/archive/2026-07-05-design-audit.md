# LotFoundry — Design Audit (2026-07-05)

**Supersedes:** `VISUAL-DESIGN-AUDIT.md` (deleted — it audited the pre-Blue Hour system: Outfit/Manrope/Geist Mono, no dual-lighting split. `DESIGN.md` v3 replaced that system on 2026-06-10 through 2026-07-05; this audit checks the codebase against the *current* doc.)

> Historical audit snapshot. It records findings from the 2026-07-05 surface;
> `DESIGN.md` and `docs/design-audits/2026-07-15-studio-color-ux.md` are the
> current references. PR #139 resolves the accessibility color-role and focus
> guidance that this snapshot predates.

**Scope:** `app/**`, `components/**` (TSX + CSS), cross-referenced against `DESIGN.md` v3.
**Method:** Five parallel searches — typography/color, spacing/radius/layout, responsiveness/mobile, accessibility (WCAG 2.2 AA), component consistency/motion — each grepping and reading source, verified with file:line citations below.

## Verdict

The foundation is genuinely strong: token discipline, accessibility (focus rings, ARIA, reduced-motion, alt text, forms) are close to exemplary, and the money/forest/amber/clay semantic rules are respected almost everywhere. The gaps cluster in three places: (1) a handful of **hardcoded/off-scale values that have drifted from the token system** — the same drift pattern DESIGN.md's own Decisions Log has caught and fixed twice before (money scale, micro-print tier); (2) **inconsistent adoption of shared components** (`Button`, `StatusChip`, `Bezel`) — the primitives exist and are well-built, but several panels hand-roll what they already provide; (3) a small number of **mobile edge cases** (touch targets, one fixed-width menu, one unscaled pill radius). Two files, `BuilderInbox.tsx` and `InspirationGalleryPanel.tsx`, showed up as the weakest surfaces across *multiple* independent passes — worth a dedicated cleanup pass each.

No WCAG 2.2 AA blockers were found. No sanctioned design decisions are being contradicted — DESIGN.md's own rules are simply not 100% propagated to every file yet.

---

## 1. Visual Consistency

### 1.1 Color — hardcoded hex outside the token system (HIGH)

`lib/feasibility-verdict.ts` defines every verdict color via CSS variable *except* the on-dark variants for "Needs Review" and "Unlikely," which are raw hex with no corresponding token:

- [lib/feasibility-verdict.ts:89](../../lib/feasibility-verdict.ts#L89) — `onDark: "#E0B463"` (used again at [line 109](../../lib/feasibility-verdict.ts#L109))
- [lib/feasibility-verdict.ts:94](../../lib/feasibility-verdict.ts#L94) — `onDark: "#D98A77"` (used again at [line 111](../../lib/feasibility-verdict.ts#L111))

Compare to the correct pattern two lines above: `onDark: "var(--color-lf-money-on-dark)"`. These two hex values render the "review" and "blocked" verdicts on dark surfaces (`IncomeRail`, `ConstraintsPanel`) and should become named tokens (e.g. `--color-lf-amber-on-dark-verdict`, or just reuse the existing `--lf-amber-on-dark` / a new brick-on-dark token) so a future palette tweak doesn't miss them.

*Everything else color-related checked out clean*: no purple, no arbitrary Tailwind color utilities (`text-red-500` etc.), no stray Fraunces outside the landing, no Inter/Roboto/system-ui, correct `amber-ink` vs `amber-on-dark` usage everywhere else, forest/clay/brick semantics respected, `ln-glow` correctly fenced to the landing.

### 1.2 Typography — kicker tracking drift (MEDIUM, recurring)

DESIGN.md ruled eyebrow/kicker tracking to a single `0.14em` on 2026-07-04. That fix didn't reach every file — 12+ sites still hardcode `0.16em`, `0.18em`, or `0.2em`:

- [components/builder/BuilderInbox.tsx:522](../../components/builder/BuilderInbox.tsx#L522), [:722](../../components/builder/BuilderInbox.tsx#L722), [:809](../../components/builder/BuilderInbox.tsx#L809) — `tracking-[0.16em]`
- [components/builder/BuilderMoneyBand.tsx:40](../../components/builder/BuilderMoneyBand.tsx#L40) — `tracking-[0.16em]`
- [components/builder/LeadCard.tsx:133](../../components/builder/LeadCard.tsx#L133) — `tracking-[0.16em]`
- [components/builder/UnlockSlip.tsx:120](../../components/builder/UnlockSlip.tsx#L120) — `tracking-[0.16em]`
- [components/studio/BeforeAfterBoard.tsx:206](../../components/studio/BeforeAfterBoard.tsx#L206) — `tracking-[0.2em]` (the "Concept · not a permit" stamp)
- [components/studio/FieldBookIndex.tsx:36](../../components/studio/FieldBookIndex.tsx#L36) — `tracking-[0.18em]`
- [components/studio/IncomeRail.tsx:37](../../components/studio/IncomeRail.tsx#L37) — `tracking-[0.16em]`
- [components/studio/ReportPreview.tsx:70](../../components/studio/ReportPreview.tsx#L70) — `tracking-[0.18em]` (also see 1.3 below)
- [components/studio/StudioShell.tsx:89](../../components/studio/StudioShell.tsx#L89), [:95](../../components/studio/StudioShell.tsx#L95), [:147](../../components/studio/StudioShell.tsx#L147) — `0.18em` / `0.16em` / `0.16em`

This is the same convergence pattern DESIGN.md's Decisions Log already caught twice (money scale on 2026-07-03, micro-print tier on 2026-07-04). Worth a single find/replace pass to `tracking-[0.14em]` across all of these, then a lint rule or shared `.lf-kicker`/`.lf-dataprint` class to prevent recurrence — right now every eyebrow is a hand-typed Tailwind arbitrary value instead of a shared utility class.

### 1.3 Micro-print floor (LOW, likely intentional)

- [components/studio/ReportPreview.tsx:70](../../components/studio/ReportPreview.tsx#L70) — `text-[8px]` on the "Concept" stamp, below the documented 9px informational floor. This is a decorative facsimile (mini certificate thumbnail preview), which DESIGN.md's 2026-07-04 ruling explicitly exempts — but the exemption should be a code comment at this call site, since it's the one place someone could plausibly "fix" it to 9px and be wrong, or copy the pattern somewhere it doesn't apply.

### 1.4 Border-radius: pill-radius system

**Violation — mobile pill not scaled down (MEDIUM):**
- [components/landing/nocturne/BlueHourHero.tsx:166](../../components/landing/nocturne/BlueHourHero.tsx#L166) — the hero search form's mobile radius is `max-sm:rounded-3xl` and the button drops to `max-sm:rounded-2xl` ([line 182](../../components/landing/nocturne/BlueHourHero.tsx#L182)), but the **input itself stays `rounded-full`** at every breakpoint. On a narrow, full-width stacked layout that's exactly the "oblong stadium" DESIGN.md's rule (2026-06-27 pill-radius revert) says to scale down instead of forcing full pill. Fix: add `max-sm:rounded-2xl` to the input to match the button.

**Violation — double-nested rounded card (HIGH, explicit anti-slop rule):**
- [components/builder/BuilderInbox.tsx:616-617](../../components/builder/BuilderInbox.tsx#L616) — a `rounded-lg` frame wraps another bordered block, i.e. "rounded card floating inside a rounded card," which Anti-Slop Rules explicitly ban. Flatten to one frame, or replace with the `Bezel` primitive for intentional depth.

**Arbitrary badge dimensions instead of scale values (MEDIUM, recurring):**
- [components/ui/StatusChip.tsx:67](../../components/ui/StatusChip.tsx#L67) — `h-[22px]`
- [components/builder/UnlockSlip.tsx:154](../../components/builder/UnlockSlip.tsx#L154) — `h-[30px] w-[30px]` with `border-[1.5px]`
- [components/studio/ConstraintsPanel.tsx:262](../../components/studio/ConstraintsPanel.tsx#L262) — `h-[22px]` + `px-[9px]`

Circle indicators that *do* follow the equal-width/height rule correctly: [StepRail.tsx:75](../../components/ui/StepRail.tsx#L75) (`h-7 w-7`) and [StepRail.tsx:66](../../components/ui/StepRail.tsx#L66) (`h-4 w-4`) — good reference pattern to copy into the three sites above.

**Recurring arbitrary `border-[1.5px]` (LOW–MEDIUM):** used in 7+ places (`BlueHourHero`, `BuilderInbox`, `LeadCard`, `UnlockSlip`, `BeforeAfterBoard`, `ReportPreview`, `StyleMatchPanel`) for the "instrument-grade" border DESIGN.md specifies. Since it's intentional and repeated, it should be a token/utility (e.g. `border-instrument`) rather than a hand-typed bracket value in every file — purely a maintainability note, not a visual bug.

**Landing grid — one symmetrical 3-col violation (HIGH):**
- [components/landing/nocturne/OwnerPath.tsx:43](../../components/landing/nocturne/OwnerPath.tsx#L43) — `md:grid-cols-3` of identical step cards is exactly the "symmetrical Bootstrap grid" Anti-Slop Rules ban. By contrast, `DuskShowcase.tsx` ([line 22](../../components/landing/nocturne/DuskShowcase.tsx#L22), [line 69](../../components/landing/nocturne/DuskShowcase.tsx#L69)) does this correctly with asymmetric `grid-cols-[1.15fr_1fr]` splits — worth using as the template to rework `OwnerPath` into an asymmetric or staggered layout.

**`Bezel` primitive is under-deployed (LOW):** [components/ui/Bezel.tsx](../../components/ui/Bezel.tsx) is well-built (concentric radius, warm inner highlight) but only imported once, in `AuthLayout.tsx`. Not a violation, but a missed opportunity — several flat single-box cards (landing feature cards, builder lead cards) are candidates.

### 1.5 Gradients (MEDIUM, contained)

Anti-Slop Rules ban decorative gradient *fills* outside the Blue Hour landing's photographic scrims:

- [components/studio/InspirationGalleryPanel.tsx:112](../../components/studio/InspirationGalleryPanel.tsx#L112) — `bg-gradient-to-t from-black/20 via-transparent to-transparent` legibility overlay on a photo card. Arguably a legibility scrim (sanctioned) rather than decoration — but it's on a Golden Hour surface, not the landing, so it's at minimum worth a design-lead confirmation that the scrim exception extends there.
- [components/FeasibilityStudio.tsx:76](../../components/FeasibilityStudio.tsx#L76) — a `radial-gradient`/`linear-gradient` combo used purely as a loading-state background. This one reads as decorative, not a photographic scrim — candidate to replace with a solid espresso/mahogany surface.
- `components/ParcelScene.tsx:74,164-168` — gradients used for 3D scene sky backdrop and canvas shadow rendering. These are scene-technical (WebGL/canvas material, not UI chrome) and almost certainly fall outside the rule's intent — flagging for awareness only, not recommending a change.

---

## 2. UI/UX Patterns & Component Consistency

### 2.1 Raw hand-rolled buttons instead of `Button` (HIGH, most impactful single fix)

`components/ui/Button.tsx` already covers `primary`/`secondary`/`ghost`/`commit` variants and an `xs` size for compact rows — but at least nine call sites re-implement button styling inline instead of using it:

- [components/studio/AIPropertyInsightsPanel.tsx:103-111](https://github.com/torralba85/YardUp/blob/65b9123cf8a0a58e554c92a68eb79eb25721a761/components/studio/AIPropertyInsightsPanel.tsx#L103)
- [components/studio/AIStyleMatchPanel.tsx:92-100](https://github.com/torralba85/YardUp/blob/10abae1fb804293aafeab6af898001e73ae1361a/components/studio/AIStyleMatchPanel.tsx#L92)
- [components/studio/PermitGuidePanel.tsx:199-206](../../components/studio/PermitGuidePanel.tsx#L199)
- [components/builder/BuilderDashboard.tsx:167-174](../../components/builder/BuilderDashboard.tsx#L167)
- [components/builder/BuilderInbox.tsx:231-248, 254-276, 526-554, 700-718, 727-755](../../components/builder/BuilderInbox.tsx#L231) — the single worst offender, six+ separate raw-button blocks
- [components/studio/InspirationGalleryPanel.tsx:135-159](../../components/studio/InspirationGalleryPanel.tsx#L135)
- [components/studio/ConstraintsPanel.tsx:199-206](../../components/studio/ConstraintsPanel.tsx#L199)

Beyond visual drift risk, this means focus-ring, disabled-state, and press-physics (`motion-safe:active:scale-[0.98]`) fixes made to `Button` won't propagate to these — they have to be fixed N times instead of once.

### 2.2 Hand-rolled badges instead of `StatusChip` (MEDIUM)

Same pattern, smaller blast radius:

- [components/studio/BuildersPanel.tsx:111-114](../../components/studio/BuildersPanel.tsx#L111) — "Licensed" badge
- [components/builder/BuilderInbox.tsx:469-477](../../components/builder/BuilderInbox.tsx#L469) — lock-status badge
- [components/studio/InspirationGalleryPanel.tsx:116-120, 169-175, 182-188](../../components/studio/InspirationGalleryPanel.tsx#L116) — style tags
- [components/studio/PermitGuidePanel.tsx:104-113](../../components/studio/PermitGuidePanel.tsx#L104) — risk-level badge (Clear/Review/Blocked — exactly `StatusChip`'s job)

### 2.3 Loading/empty/error state coverage — solid

Checked `BuildersPanel`, `BuilderDashboard`, `BuilderInbox`, `AIPropertyInsightsPanel`, `AIStyleMatchPanel`, `CertificatePanel`: all have deliberate, differentiated loading/empty/error treatment with contextual messaging (not generic spinners). Two minor gaps: `ConstraintsPanel` shows a parcel error alert with no retry CTA, and `FeasibilityInspector` has no explicit offline state. Low priority.

### 2.4 Cross-cutting observation

`BuilderInbox.tsx` and `InspirationGalleryPanel.tsx` are the two files that recur across *every* audit pass (raw buttons, duplicated badges, double-nested card, ungated transitions, gradient overlay). If you only have time for one cleanup pass beyond the token fixes above, do these two files — fixing them collapses several findings at once rather than being five separate one-line patches.

---

## 3. Responsiveness & Mobile

Overall mobile UX is coherent — the wizard flow doesn't duplicate/diverge from desktop terminology, safe-area insets are handled on the header and sheet, and the Blue Hour hero's scroll-scrub degrades cleanly under `prefers-reduced-motion` (falls back to a still photo, no jank).

**Touch targets below comfort minimum (MEDIUM):**
- [components/studio/DeleteAccountButton.tsx:65](../../components/studio/DeleteAccountButton.tsx#L65), [:73](../../components/studio/DeleteAccountButton.tsx#L73) — delete/cancel buttons use `py-1 text-[11px]`, rendering roughly 24–28px tall. These are destructive-action buttons, the category where an accidental miss is worst; bump to `min-h-11` (44px) at minimum.

**320px reflow risk (MEDIUM, WCAG 1.4.10):**
- [components/studio/mobile/MobileHeader.tsx:75](../../components/studio/mobile/MobileHeader.tsx#L75) — account dropdown is a fixed `w-60` (240px). On a 320px-wide phone with the menu right-aligned, this can clip or force horizontal scroll. Swap to `max-w-[calc(100vw-2rem)]` so it always fits with margin.

**Pill radius not scaled on mobile (MEDIUM — same root cause as 1.4):**
- [components/landing/nocturne/BlueHourHero.tsx:172](../../components/landing/nocturne/BlueHourHero.tsx#L172) — hero search input stays `rounded-full` when the form stacks vertically on mobile; only the button scales down. Fix both at once (see 1.4).

**Minor / low severity:**
- [components/studio/mobile/MobileStudio.tsx:130](https://github.com/torralba85/YardUp/blob/65b9123cf8a0a58e554c92a68eb79eb25721a761/components/studio/mobile/MobileStudio.tsx#L130) — the coach-mark tooltip has no safe-area-aware positioning; could sit under a notch on some devices.
- [components/studio/mobile/WizardFlow.tsx:133-144](https://github.com/torralba85/YardUp/blob/65b9123cf8a0a58e554c92a68eb79eb25721a761/components/studio/mobile/WizardFlow.tsx#L133) — demo preset pills have no explicit wrap/overflow strategy at 320px; worth a quick visual check on a small device.

Everything else checked (fixed-width elements that could force horizontal scroll, `AerialView`/3D canvas mobile handling, landing hero responsive image sizing) came back clean.

---

## 4. Accessibility (WCAG 2.2 AA)

**No blockers.** This is the strongest area of the codebase — semantic landmarks (`<main>`, `<aside aria-label>`, `<nav>`), correct heading hierarchy, zero clickable-div anti-patterns, consistent `focus-visible:ring-lf-clay` (matching the 2026-06-25 decision to move focus rings off amber), a working skip-to-content link, roving-tabindex keyboard navigation in `StepRail`, and global + component-level `prefers-reduced-motion` guards were all verified directly in code.

Two real (non-blocking) gaps:

1. **Focus doesn't return to trigger after modal close (MEDIUM):** [components/auth/AuthModal.tsx](../../components/auth/AuthModal.tsx) — closing the modal doesn't restore focus to whatever button opened it (e.g. from `StudioShell.tsx:219`). Keyboard users lose their place. Fix: store a ref to the trigger element and `.focus()` it in the `onClose` callback.
2. **No visible required-field indicator (LOW, WCAG 3.3.2):** [components/builder/BuilderProfileForm.tsx:97-137](../../components/builder/BuilderProfileForm.tsx#L97) — fields use the native `required` attribute but have no visible `*` or `aria-required` for sighted users who don't trigger browser validation UI.

One cosmetic note: [components/ui/MoneyFigure.tsx](../../components/ui/MoneyFigure.tsx)'s count-up animation has no `aria-live`/`aria-label` — screen readers only get the value once it's in the DOM (fine functionally, but adding `aria-label={formattedValue}` would make the final figure explicit rather than incidental).

---

## 5. Motion

`use-count-up.ts` and the `.lf-stamp`/`.lf-fade-in`/`.ln-reveal` keyframes in `globals.css` correctly implement the "settle and stamp, never bounce" rule with proper `prefers-reduced-motion` guards and ease-out/no-overshoot curves. No spring or bounce easing found anywhere.

**One gap:** [components/studio/InspirationGalleryPanel.tsx](../../components/studio/InspirationGalleryPanel.tsx) — lines 94, 100, 109, 126, 138–159 use `transition-all duration-300/700` and `group-hover:scale-105` directly, without the `motion-safe:` guard the rest of the codebase uses consistently. Same file flagged in sections 1.5 and 2 above — a single pass over this component would fix several unrelated-looking findings at once.

---

## Priority Action List

1. **HIGH** — Tokenize the two hardcoded hex colors in `lib/feasibility-verdict.ts` (§1.1).
2. **HIGH** — Fix the double-nested rounded card in `BuilderInbox.tsx:616-617` (§1.4) and migrate its raw buttons/badges to `Button`/`StatusChip` (§2.1, §2.2) — one file, several findings.
3. **HIGH** — Rework `OwnerPath.tsx`'s symmetrical 3-col grid to an asymmetric layout, using `DuskShowcase.tsx` as the template (§1.4).
4. **MEDIUM** — Sweep the ~12 kicker `tracking-[…]` outliers to `0.14em` (§1.2) — mechanical, low-risk, closes a drift pattern DESIGN.md has already flagged twice.
5. **MEDIUM** — Fix `BlueHourHero.tsx`'s mobile search input radius (§1.4/§3) and `MobileHeader.tsx`'s fixed-width dropdown (§3) — both are small, isolated CSS changes.
6. **MEDIUM** — Bump `DeleteAccountButton.tsx` touch targets to 44px (§3).
7. **MEDIUM** — Add the `motion-safe:` guard to `InspirationGalleryPanel.tsx`'s transitions and reconsider its gradient overlay (§1.5/§5) — same file as #2, worth doing together.
8. **MEDIUM** — Replace the decorative loading-state gradient in `FeasibilityStudio.tsx:76` (§1.5).
9. **MEDIUM** — Add focus-return to `AuthModal.tsx` on close (§4).
10. **LOW** — Migrate the remaining raw buttons/badges outside `BuilderInbox`/`InspirationGalleryPanel` (§2.1, §2.2) as time allows.
11. **LOW** — Visible required-field indicators on `BuilderProfileForm.tsx` (§4); comment the intentional 8px exception in `ReportPreview.tsx` (§1.3); consider wider `Bezel` adoption (§1.4).

## What's Already Excellent — Leave Alone

- Token system and semantic color discipline (forest/clay/amber/brick separation, amber-ink vs amber-on-dark contrast fix already shipped).
- Accessibility foundation: focus-visible rings, ARIA, semantic landmarks, skip link, reduced-motion guards, alt text quality on every content image.
- `use-count-up` / `MoneyFigure` / `StepRail` — reference-quality implementations other components should copy from, not the other way around.
- Blue Hour landing's responsive/reduced-motion handling (`BlueHourHero.tsx`) and `DuskShowcase.tsx`'s asymmetric grid.
- Loading/empty/error state coverage across builder and AI panels.
