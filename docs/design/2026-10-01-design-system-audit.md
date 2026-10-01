# 2026-10-01 design system audit repairs

The 2026-09-30 re-audit of production master `931f512` scored A LOT MORE 63/100, up from 56. The
2026-09-18 guards held. But `lf-*` aliases had grown by 232 references, because §12 never said which
names new code should use. New feature work had also brought six fresh defects. This change repairs all
of them, finishes the token system the 09-18 audit asked for, and adds a ratchet so the legacy counts can
only fall. Full audit: `LotFoundry/artifacts/design-system-audit-2026-09-30.md`.

## Defects repaired

| # | Defect | Repair |
|---|---|---|
| N1 | Billing ledger coloured positive credits green, i.e. money-green (§2.6) | Carbon, with the sign carrying direction |
| N2 | Ledger used the eligible/review status colours as transaction-type colours | One neutral chip for every type; the label carries the meaning |
| N3 | `font-mono` back in 15 places (ledger, Cesium HUD, head-start countdown) | `tabular-nums` on the body face |
| N4 | Neighborhood 3D HUD used `shadow-md backdrop-blur-sm` | `shadow-card` on a radius-0 surface, on the scene layer token |
| N5 | Hand-rolled fields mostly drew a 1.28:1 hairline boundary, including the live ADU calculator; no shared field component | Shared `Input`/`Select`/`Textarea` with a stone boundary (5.36:1); 35 fields in 13 files migrated |
| N6 | Calculator money figures hand-set at weight 700 | `lf-money-md` (25px, 600) |

The repairs also turned up three more of the same kind. `MetricsSummary` underlined its lead money figures
with a green hairline, which is now carbon. The city-guide CTA address field had a 30% hairline on carbon,
and the scan-calibration textarea a hairline on chalk; both now use stone tokens. Minor fixes:
`rounded-[2px]` on the Scan badge, `tracking-[0.04em]` on trait chips, three off-palette `#2A2A2A` hovers
(now `lot-ink-hover`) and a bold `h2`.

## System work

- **Tokens:** `rounded-control`, `shadow-paper|card|chip|modal`, `ease-settle` and the
  `--duration-hover|disclosure|settle` properties now live in `app/globals.css`, as do `lot-chalk-2`
  `#EBEBE6` and `lot-ink-hover` `#33332F`. `cn()` knows the new radius and shadow names, so
  `tailwind-merge` resolves `rounded-control` against `rounded-none` rather than keeping both.
- **Codemod (zero visual change):** each replacement maps a literal to a token of identical value, and
  the script asserts each value against `globals.css` before writing. It made 95 `rounded-[3px]`, 6 shadow,
  221 `-[#hex]` colour and 12 motion replacements. No raw hex colour class remains in `app`,
  `components`, `lib` or `hooks`.
- **Radio groups:** 11 single-choice groups announced their options as independent `aria-pressed` toggles.
  They are now radio groups: Studio size, roof, finish and rent basis; parcel view; camera, lighting and
  quality; signup account type; mobile demo lots; and the builder inbox view mode. The new
  `components/ui/useRadioGroup.ts` hook carries `Segmented`'s keyboard model for groups that keep custom
  visuals.
- **Primitives:** adopted `Skeleton` in place of 11 hand-rolled bars. Removed the unused `Panel` and
  `StepProgress`, and `MoneyFigure`'s vestigial `forest` tone. Rewrote JSDoc that still described the
  retired system.

## Guards (`app/design-tokens.test.ts`)

New checks: no `font-mono`; no blurred Tailwind shadows; no green on, or decorating, a money figure;
positive tracking is only `0.08em`; no arbitrary radius or shadow values; no field boundary drawn in the
hairline. Each new check failed on `origin/master` at the defect the audit found.

**Ratchet.** The following counts can only fall, and a change that migrates a surface lowers its ceiling
in the same commit:

| Count | Ceiling (2026-10-01) | 2026-09-30 audit |
|---|---|---|
| `lf-*` alias references | 1,616 | 1,759 |
| Raw `-[#hex]` colour classes | 0 | 231 |
| Arbitrary `text-[Npx]` sizes | 161 | 167 |
| Inline kicker recipes | 21 | 26 |

## Visible changes

These are intended, not regressions:

- Field borders darken from hairline to stone.
- Migrated fields are 16px below `sm` (they were 14px at all sizes), with a 44px minimum height.
- Rent basis uses `Segmented`, so unselected options are chalk instead of carbon.
- Ledger chips are neutral, and credits show in carbon.
- The Neighborhood HUD has a hard shadow and square corners.
- The calculator figures are slightly lighter and 1px larger.

## Process

Work was split across three worktrees. Codex built the field primitives and migrated the forms. Gemini
(`agy --mode accept-edits --sandbox`) converted the radio groups but stalled for hours without returning.
It had placed hooks after early returns in two components and left most unit tests and two e2e specs
unconverted, so Claude finished those. Claude also did the defects, tokens, codemod, guards and integration.

## Verification

Recorded in the pull request and in the Obsidian `lotfoundry-design-drift-audit` page.
