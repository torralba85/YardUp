# LotFoundry design — source of truth

**`docs/design/` is the single source of truth for design at LotFoundry.**
Read this before any visual or UI decision. Nothing outside this directory carries design authority.

## Precedence

When two documents disagree, the higher entry wins:

1. **[`design-system.md`](./design-system.md)** — the A LOT MORE system. Active, authoritative.
2. **[`product-surfaces.md`](./product-surfaces.md)** — project-wide coverage, renderer ownership, and verification.
3. Shipped code. Where code and doc disagree on a *value*, the code is the fact and the doc is the bug —
   fix the doc. Where they disagree on a *rule*, the doc wins and the code is the bug.
4. **[`archive/`](./archive/)** — superseded. Historical reference only. **Never apply to new work.**

## Files

| File | What it is |
|---|---|
| [`design-system.md`](./design-system.md) | **Start here.** Tokens, type, space, motion, components, a11y, voice, anti-patterns. |
| [`product-surfaces.md`](./product-surfaces.md) | Project-wide surface map, compatibility aliases, and release verification. |
| [`2026-09-10-mobile-audit.md`](./2026-09-10-mobile-audit.md) | Mobile navigation fixes, Android code-10 upload, device evidence, and release limits. |
| [`2026-09-05-a-lot-more.md`](./2026-09-05-a-lot-more.md) | Implementation record for the landing redesign. |
| [`a-lot-more-image-prompts.md`](./a-lot-more-image-prompts.md) | Asset provenance — the exact generation prompts. |
| [`archive/`](./archive/) | Retired systems and audits. Superseded. |

## The 60-second version

**A LOT MORE** — an architectural exhibition. A miniature parcel on a cut-earth slab, oversized display
type, disciplined white space, one vivid orange volume that is the thing you could add.

| | |
|---|---|
| **Ground** | Chalk `#F5F5F0` — warm off-white, never pure white |
| **Ink** | Carbon `#161616` |
| **Signal** | Orange `#FF5B24` — action, and the proposed structure |
| **Muted** | Stone `#65655F` (on chalk) · `#B7B7AE` (on carbon) |
| **Hairline** | Drafting line `#DADAD3` |
| **Display** | Space Grotesk, tight negative tracking |
| **Body** | Manrope |
| **Radius** | `0` for surfaces, `3px` for controls |
| **Elevation** | Hard offset shadow, no blur |
| **Money** | Carbon and large. Not green, not coloured. |

**The three traps**, all verified and all easy to walk into:

1. **Orange text on chalk is 2.83:1 — it fails AA.** Orange is a fill colour, not a text colour, on
   light ground. Use `#C43708` if you need orange type on chalk.
2. **Never set a focus ring to `currentColor`.** The ring sits 5px *outside* the control, on the parent
   ground — `currentColor` made it invisible on every light-labelled control.
3. **Do not "snap the spacing to an 8px grid."** The odd values are optically tuned. That cleanup is a
   regression.

## Working rules

- The landing remains CSS-Module-scoped; its optical layout is preserved.
- Every product route uses shared A LOT MORE tokens in `app/globals.css`, including auth and consent.
- Legacy `lf-*` names are compatibility aliases, never permission to restore Golden Hour.
- New colour pairing? Check contrast before shipping it. The palette contains a trap that looks fine.
- Changing a rule here is a decision: add a row to the decisions log in `design-system.md` with the
  rationale, so the next person inherits the reasoning and not just the value.
