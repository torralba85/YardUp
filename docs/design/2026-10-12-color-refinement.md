# Color refinement — 2026-10-12

Follow-up to [the color system](./2026-10-01-color-system.md). The story is unchanged:
**a calm drawing board, with a clear next step** — chalk is the planning surface, carbon
carries facts and money, signal orange marks the next task action, and green/amber/red
describe readiness with a label and an icon. This pass measured the system against its
own rules and closed the surfaces the October guard could not see.

## Measured

All ratios are computed from `design/tokens.json`, not estimated.

| Pair | Ratio | Floor | Verdict |
|---|---|---|---|
| Carbon on chalk | 16.55:1 | 4.5 | Pass |
| Orange-ink on chalk / surface / paper | 4.93 / 4.51 / 5.28:1 | 4.5 | Pass |
| Status text on chalk | 5.79–6.29:1 | 4.5 | Pass |
| Status-on-dark on carbon / surface-dark | 5.50–8.16:1 | 4.5 | Pass |
| Status text on own 12% soft tint | 4.90–5.20:1 | 4.5 | Pass |
| Stone on stone-soft (locked chip) | 4.60:1 | 4.5 | Pass |
| Dark address placeholder at 60% (before) | 3.79:1 | 4.5 | **Fail → fixed** |
| Signal orange on chalk | 2.83:1 | 4.5 | Fill only, unchanged |

Hues: accent orange 15°, blocked 9°, review 36°, eligible 158°. Blocked is 6° from the
accent. Andrew's decision (2026-10-12): keep the rust. A burgundy/purple shift was
rejected; blocked is carried by label + icon, never by colour alone, and never serves
as link or focus. Recorded in `design-system.md` §2.5 and its decisions log.

## Changed

- **Play feature graphic** (`native/android/store-listing/feature-graphic.html/.png`):
  the source still carried the retired Warm Earth palette (sand/brown/forest) and
  DM Mono / Instrument Sans / Libre Franklin, behind an exception whose reason only
  said the file could not import CSS. It is rebuilt in A LOT MORE — chalk ground,
  carbon wordmark in Space Grotesk, stone drafting, signal-orange ADU with a carbon
  label — and re-rendered at 1024×500.
- **Dark placeholder** (`components/adu/AduStudioCta.tsx`): dropped the 60% opacity
  that measured 3.79:1; the placeholder is now full stone-on-dark on surface-dark
  (7.97:1).
- **Reset confirmation icon** (`app/(firebase)/forgot-password/page.tsx`): a success
  check no longer borrows the accent. It is eligible green on its soft tint (4.97:1),
  so orange keeps one meaning: the next action, or the proposed structure.
- **Guard** (`scripts/design/checks.mjs`): new pairs (orange-ink on surface/paper,
  stone on paper, chalk and status-on-dark on surface-dark, stone on its soft tint)
  and a store-graphic test — every literal in the feature graphic must be a canonical
  palette value, in current typefaces. The test failed first on `#f2e5d5`.
- **Docs**: `design-system.md` now states the print-only exception to "never pure
  white" (`lot-print-paper`, `@media print` and reports only) and records the
  blocked-rust decision.

## Not changed

- No token values. No status hue moved; no new tokens were added.
- Historical Remotion exports, physical ADU finishes, provider marks, and the
  Cesium/3D scene materials keep their reviewed exceptions.
- Stripe-hosted checkout branding (chalk/carbon, set in Stripe) is external
  configuration and was not touched.

## Verification

- `npm run design:check` — 6/6 checks pass, including the new graphic test.
- Feature graphic re-rendered with `npm run store:feature-graphic` (1024×500) and
  visually inspected: chalk ground, carbon wordmark, orange ADU, square corners.
- Focused Vitest (forgot-password, auth focus styles) passes 2/2; ESLint and TypeScript are clean.
