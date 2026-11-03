# 2026-11-02 design system audit repairs

The 2026-11-02 re-audit of production master `88b8830` scored A LOT MORE 78/100, up from 63 on 09-30.
Every guarded rule held. `lf-*` aliases and raw hex classes are both at zero, `design:check` passes and
the token tests pass. The defects sat where no guard looked: text over the new cinematic hero photo,
checkboxes, spinners, and a doc that had not caught up with the landing. Andrew asked to "make suggested
fixes and improve where possible". Full audit: `LotFoundry/artifacts/design-system-audit-2026-11-02.md`.

## Defects repaired

| # | Defect | Repair |
|---|---|---|
| D1 | The required "Illustrative backyard home concept" label was 11px chalk at 72% on the bright half of the photo. Live glyph-pixel 5th percentile: 3.40:1 at 1440×900, 3.15:1 at 1280×720 | 12px full chalk on the hero glass (carbon 46%, blur 18px). Measured over the live photo with the change injected: 8.9–9.4:1 |
| D2 | Sample kicker (11px at 72%): 3.5–3.9:1. Form note on phones (13px at 74%): 4.0–4.5:1 | Kicker full chalk (4.8–5.5:1). Note, field label, description and sample captions share `--hero-text-muted`, chalk 86% (form note 4.9–9.3:1) |
| D3 | The Studio AI photo-consent checkbox had no accent, so a checked box was browser blue | Shared `Checkbox` |
| D4 | The legal re-acceptance checkbox used `accent-lot-orange-ink`, an orange-ink fill | Shared `Checkbox`; `audit.mjs` now rejects `accent-lot-orange-ink` as well as `bg-` |
| D5 | Landing maquette pins were one choice announced as `aria-pressed` toggles; the wrapper's `aria-label` had no role | `useRadioGroup`: a named `radiogroup`, `aria-checked`, roving tabindex and arrow keys |
| D6 | Four `animate-spin` loaders (Studio parcel load ×2, Neighborhood 3D, report refresh) ran under reduced motion; 12 others were guarded | `motion-safe:animate-spin` |
| D7 | New money figures set by hand at 30/600, 20/400 and 24/500 (Studio free preview, financing calculator) | `lf-money-lg`, `lf-money-sm`, `lf-money-md` |

## System work

- **`Checkbox` in `components/ui/Field`.** Ten hand-rolled checkboxes used four accents (ink, orange,
  orange ink, none), two sizes and four focus recipes, and one had no focus style. A native checkbox
  paints a pure-white box, and only its checked fill follows `accent-color`, so the primitive draws its
  own:
  - a 20px chalk box with a stone boundary and `rounded-control`;
  - a carbon fill with a chalk Lucide check when checked;
  - the shared orange-ink focus ring.

  It keeps the native input for forms, keyboard and screen readers. All ten call sites use it: login,
  signup, the auth modal, legal re-acceptance, builder profile, builder lead consent, the permit
  checklist, the certificate bid-leveling table, style match and the emailed-link card.
- **Hero text token.** `--hero-text-muted` (chalk 86%) on `.hero` replaces five separate alphas of 72,
  74, 82 and 86%. The concept label joins the hero glass material (§4.4).
- **Docs.**
  - New rule §2.3 rule 6, text over a photograph, and a fourth trap in the README.
  - §3.2: type scale re-read from the shipped landing; adds the landing h1 and drops a stale row.
  - §4.3: breakpoints now include the narrow-phone step and the three height queries.
  - §5: rule for looping animations.
  - §6: the address-input focus row now matches §7; new Checkbox and Money figure rows.
- **`useFocusTrap` in `components/ui`.** `UnlockSlip`, the builder's paid-unlock dialog, had Escape and
  initial focus but no Tab trap; its comment deferred it to "T15". The trap `LegalReacceptGate` already
  had is now a shared hook, used by both. This is a first step toward a `Dialog` primitive.
- **Retired** `brand/cadastral-lyric.md` with a banner. It is the sepia/mono/serif philosophy behind
  a plate whose output was already removed as unreferenced.

## Guards

- `app/design-tokens.test.ts` adds three checks:
  - no `type="checkbox"` outside `components/ui/Field.tsx`;
  - no bare `animate-spin|pulse|ping|bounce`;
  - no hero chalk alpha below 86%.

  Each was checked against unfixed master and fails there: 10 checkbox files, 3 animation files and
  4 hero rules.
- **Ratchet re-pinned** to today's counts: arbitrary `text-[Npx]` 168 → 166, inline kickers 25 → 24.
- **`e2e/hero-text-contrast.spec.ts`** measures the render, because no token pair can prove contrast over
  a photo. It screenshots the hero with and without its text, keeps the pixels the glyphs changed, and
  requires each block's 5th-percentile ratio to clear 4.5:1. Viewports: 1440×900 and 1280×720 on desktop,
  390×844 on mobile. The screenshots are decoded in the page with `createImageBitmap`, so there is no new
  dependency.

## Visible changes

These are intended:

- The concept label under the sample result sits on a small glass chip and is 12px.
- Hero secondary text is slightly brighter.
- Checkboxes are chalk boxes with a stone border instead of the browser's white box, and they fill carbon
  when checked. The permit checklist and the emailed-link card are no longer orange, and the style-match
  consent box is no longer blue. Former 16px boxes are now 20px.
- Studio free-preview figures are Space Grotesk 600 on the money scale. In the narrow desktop rail the
  build-cost range wraps at its dash, so those cells add `leading-tight`. The financing calculator's
  results are 25px/600 and no longer wrap.
- Spinners hold still under reduced motion.

Evidence from the production build is in [`evidence/design-audit-20261102/`](./evidence/design-audit-20261102/):

- [hero at 1440px](./evidence/design-audit-20261102/landing-hero-1440.webp);
- [sample result and concept label](./evidence/design-audit-20261102/landing-hero-sample-and-label.png);
- [hero at 390px](./evidence/design-audit-20261102/landing-hero-390.webp);
- [checkbox, unchecked](./evidence/design-audit-20261102/checkbox-unchecked.png) and [checked with focus](./evidence/design-audit-20261102/checkbox-checked-focused.png);
- [Studio free preview](./evidence/design-audit-20261102/studio-free-preview.png);
- [financing calculator](./evidence/design-audit-20261102/financing-calculator.png).

## Not changed

These are recorded for a later pass:

- **Modal scrims and dialogs.** Scrims come in three strengths (70/75/90%), and the six hand-rolled
  dialogs have no `Dialog` primitive. The 90% scrims are on the before/after board and the purchase slip,
  and unifying them is a visual decision.
- **Component docs.** `StatusChip`, `Skeleton`, `StepRail`, `PanelHeader`, `Bezel` and `BrandLockup`
  still have no §6 rows.
