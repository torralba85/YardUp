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

## Open decisions (the doc and shipped code disagree)

1. **Segmented semantics.** §6 says `aria-pressed`, while `ui/Field` `Segmented` uses `radiogroup`, which is
   correct for a single choice. Recommend updating §6.
2. **Display heading weight.** Landing ships 500/600, while product `lf-*-heading` utilities ship 700.
3. **Focus ring.** §7 specifies a carbon outline at 5px offset. Components use `ring-2 ring-offset-2`, and 29
   use deep-orange `lf-clay-ink` rings, including the shared `Segmented` and `Slider`.
4. **Button height.** §6 specifies a 48px primary. `ui/Button` `md` is 44px.

## Next

Add radius, shadow and motion tokens and a name for `#EBEBE6` to `@theme`, then replace duplicate hex and
`rounded-[3px]` classes with a zero-visual-change codemod behind a ratchet test. Freeze new `lf-*` usage.
