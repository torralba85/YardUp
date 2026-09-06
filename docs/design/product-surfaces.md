# Product surfaces — legacy Golden Hour, and the migration

**Status: LEGACY, IN MIGRATION. Not a system to build new work in.**

The marketing landing (`/`) runs [A LOT MORE](./design-system.md). The product behind the sign-in still
runs the previous warm "Golden Hour" palette. This document exists so that:

- someone touching the studio knows what is actually true there, and does not accidentally half-apply
  the new system to a surface that has not migrated;
- someone building anything new knows **not to extend this**;
- the migration is a plan rather than a drift.

## Surfaces still on Golden Hour

`/studio` · `/builder` · auth pages · settings · legal/help shells · the generated report · the paid
Certificate of Feasibility · transactional email · the Remotion demo composition (`remotion/demo/`,
which additionally still uses Fraunces).

## What they actually use

**The authority is `app/globals.css`**, not this table and not the archived design doc.

| | Value |
|---|---|
| Ground | Sand `#F2E5D5` · raised `#F8F0E4` · card `#FBF6EE` |
| Ink | Espresso `#261307` · muted `#6B5B4D` |
| Interactive | Clay `#8C5B3F` (fills/borders) · `#6F3F28` (text on light) · `#D09A78` (on dark) |
| Dark panels | Mahogany `#592A0F` |
| Hairline | `#E0CDB4` |
| Money / readiness | Forest `#2F4A38` · `#9DC4A8` on dark |
| Review needed | Amber `#C8922A` · `#745A00` on light · `#D9AA4A` on dark |
| Blocker | Brick `#A23B26` · `#D98A77` on dark |

**Fonts actually loaded** in `app/layout.tsx`: **Newsreader** (`--font-display`), **Instrument Sans**
(`--font-sans`), **DM Mono** (`--font-mono`).

> Correction, 2026-09-05: `CLAUDE.md` and `AGENTS.md` claimed Cormorant Garamond / Libre Franklin /
> IBM Plex Mono. That has not been true in code for some time. Those instructions have been removed;
> this is the accurate record.

## Rules while both systems coexist

1. **The boundary is the sign-in.** Marketing is A LOT MORE; the product is Golden Hour. Do not blend
   them inside one view.
2. **The auth modal is a neutral bridge.** It is deliberately rendered *outside* the landing's style
   wrapper so the landing's heading and control styles cannot leak into sign-in. Keep it that way.
3. **Do not extend Golden Hour.** Bug fixes and accessibility fixes, yes. New components in the old
   palette, no — that lengthens the migration.
4. **Do not partially reskin.** A studio panel in chalk-and-orange next to a mahogany rail is worse
   than either system alone. Migrate a whole surface or none of it.
5. **Golden Hour rules stay internally consistent until migrated.** Inside the studio, green still
   means money. That rule is retired *for A LOT MORE surfaces* — it is not retroactively wrong in code
   that has not moved yet.

## Migration path

Phased so each phase ships independently and leaves the app coherent.

| Phase | Scope | Notes |
|---|---|---|
| **0 — done** | Landing on A LOT MORE; dead Blue Hour landing, Remotion composition and `ln-*` tokens deleted; `docs/design/` established as source of truth | 2026-09-05 |
| **1** | Lift A LOT MORE tokens out of the CSS Module into a shared layer | Prerequisite for everything below. Do this the moment a second A LOT MORE surface exists. |
| **2** | Global shell: nav, footer, focus rings, hairlines, control radii | Highest visible ratio per unit of risk. |
| **3** | Typography: load Space Grotesk + Manrope globally, retire Newsreader / Instrument Sans / DM Mono | Money figures move to Space Grotesk tabular. Decide the fate of mono for APN/zoning codes — the A LOT MORE default is that mono does not return. |
| **4** | Studio surfaces: shell, panels, controls, metric cards | Largest phase. Migrate whole views. |
| **5** | 3D scene: relight `ParcelScene` from golden-hour warm to gallery-diffuse; white primary home, orange ADU, drafting-line setbacks | Matches the Possibility Series art direction. |
| **6** | Builder dashboard, transactional email, and the paid Certificate of Feasibility | The certificate is a revenue surface — see the open decision in `design-system.md`. |

No dates are attached. Attach them when the work is scheduled, and record the decision in the
`design-system.md` decisions log.
