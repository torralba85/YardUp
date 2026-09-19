# 2026-09-18 design system audit repairs

A static audit of A LOT MORE against shipped source scored the system 56/100. The hard rules held, since
there is no orange text on chalk, no gradients, no retired fonts and no `currentColor` focus rings. The
tokens, though, are mostly bypassed: `lot-*`/`status-*` carry about 6% of colour references, `lf-*`
aliases about 80%, and 260 arbitrary `-[#hex]` classes duplicate existing tokens. This change repairs the
confirmed defects and guards each one. It does not migrate tokens.

## Repaired

| Defect | Repair |
|---|---|
| Sample-parcel select focus was a signal-orange border and 15% orange ring (below 3:1), the pattern already fixed on AddressSearch | Carbon border and 2px carbon ring |
| AerialView status overlay used retired Golden Hour `#2F4A38` / `#C8922A` | §2.5 status pair chosen by ground: on-carbon over imagery and the loading placeholder, on-chalk over the drafting-grid fallback |
| FeasibilityBadge chevron never rotated (`group-open:` without a `group` ancestor) | `group` on `<details>`, motion-safe transition |
| UtilityEstimateCard printed "$65-$120" whatever rates it was given | Rate text rendered from the props |
| Studio fine-tune sliders were a private copy that dropped `aria-valuetext` | Thin adapter over the shared `Slider`; screen readers hear "20 ft" |
| Logout alert referenced an undefined `lot-carbon` token and `z-[100]` | `lot-ink`, `--z-index-toast` |
| Certificates dashboard used Tailwind default red, pure white and `font-mono` | Blocked status tokens with icon and `role="alert"`, chalk surfaces, shared `Skeleton`, `tabular-nums` |
| Pure white on Studio roof/finish options, swatch border, saved-concept hover and aerial attribution | Chalk / ink tokens |

## Guards added (`app/design-tokens.test.ts`)

- Retired Golden Hour hexes are checked across all of `app/`, `components/` and `lib/`. The old check read
  three scene files, which is how the AerialView pair survived.
- Focus indicators on light surfaces never use signal orange.
- Every `lot-*` / `lf-*` / `status-*` utility names a token that `globals.css` defines.
- No Tailwind default palette or pure white on product surfaces.
- No arbitrary `z-[n]`. Overlays use the layering scale.

## Decisions (Andrew, 2026-09-18)

The audit found four places where the doc and shipped code disagreed. All four are now decided and recorded
in the design-system decisions log.

1. **Segmented semantics: radio group.** §6 now makes single-choice controls `radiogroup` via `ui/Field`
   `Segmented`. The hand-rolled `aria-pressed` single-choice groups (landing pickers, Studio roof/finish)
   are migration debt, not yet converted.
2. **Display heading weight: the spec's 500 (hero 600).** Comparing 700, 600 and 500 on real pages showed 500
   reads closest to the landing and stops long titles wrapping. The four heading utilities and ten
   hand-set section and card headings changed.
3. **Focus ring: deep orange `#C43708` on chalk.** 63 carbon indicators and the global outline moved to deep
   orange. Carbon stays on orange grounds (the landing closing section) and chalk on carbon. The ring
   *recipe* (outline at 5px vs `ring-2 ring-offset-2`) is documented as shipped.
4. **Button: the spec.** `ui/Button` `md` is now 48px, `12px 19px`, 700. Leading icons keep an 8px gap.

## Next

Add radius, shadow and motion tokens and a name for `#EBEBE6` to `@theme`, then replace duplicate hex and
`rounded-[3px]` classes with a zero-visual-change codemod behind a ratchet test. Freeze new `lf-*` usage.
