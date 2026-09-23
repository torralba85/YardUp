# Studio: exploring what fits

Andrew selected the Studio for a frontend-design pass on September 22, 2026,
with the aim of helping homeowners explore what fits. This implementation is
local in `design/studio-fit-20260922`, based on master `19ef8ed`.

## Design plan

Treat the Studio as a working architectural model: the lot is the main visual,
with a quiet control panel and a readable placement result directly below it.

| Token | Value | Purpose |
| --- | --- | --- |
| Chalk | `#F5F5F0` | Working surface |
| Carbon | `#161616` | Text and selected controls |
| Signal orange | `#FF5B24` | Primary actions |
| Deep orange | `#C43708` | Focus on chalk |
| Stone | `#65655F` | Secondary text |
| Drafting line | `#DADAD3` | Dividers |

Space Grotesk carries headings and footprint areas; Manrope carries controls,
descriptions and dimensions. Status colors retain the existing semantic tokens.
Text and controls are left aligned; numerical values use tabular figures.

```text
Desktop
Journey | Address                         Feasibility
        | Lot model                       Size and footprint
        |                                 Exact dimensions
        | Visible placement result        Roof and finish
        | Tools

Mobile
Journey
Lot model
Visible placement result
Size choices with dimensions
Exact dimensions and finish
Estimated rent and next action
```

The initial idea of another results panel repeated existing information.
Instead, the existing scene status now exposes the result and its first reason.
Footprint drawings use a shared scale and actual preset dimensions. Roof
elevations distinguish shed, gable and flat options. No room layouts are drawn;
the room counts remain illustrative concepts.

## Implementation

- Desktop size controls show area, intended use, dimensions and a proportionate
  outline. Selection has a contrasting fill and a check mark.
- The desktop header places feasibility beside the address, with estimated
  rent and detailed numbers following it.
- Placement status is always visible with an icon and a readable explanation.
  Blocked placement uses the blocked color. Detailed provenance, coverage and
  the full explanation remain in the disclosure; coverage warnings stay visible.
- Mobile size choices retain radio semantics and arrow-key navigation. Rent
  follows the design choices. Numeric inputs align even when labels wrap.
- Mobile model and 2D fallback use a bounded canvas height with feedback in
  normal page flow, so expanded or blocked states do not create another scene
  scrollbar. Aerial and Neighborhood retain a bounded viewport.
- All changes consume existing configuration, geometry and feasibility results.
  No calculation, purchase or authentication contract changed.

## Local verification

- Focused Vitest: 36 tests passed across FeasibilityInspector,
  FeasibilityStudio, ParcelScene and MobileJourney.
- TypeScript and ESLint passed for the changed code.
- Full repository check: lint passed; Vitest passed 202 files (1,459 tests
  passed and 21 were skipped); TypeScript passed.
- Production build passed with `npm run build -- --webpack`.
- The default Turbopack build could not follow the isolated worktree's
  `node_modules` junction outside the checkout. The junction was preserved to
  avoid changing dependencies used by the primary checkout; CI uses a clean
  install and runs the standard build.
- Browser review: desktop Design, a 1,000 sf blocked placement with a 380 sf
  coverage overage, mobile radio selection with arrow keys, and 320px/390px
  layouts without horizontal overflow.
- Screenshot review caught a mobile nested scroll area; the flow layout above
  corrects it. The model remains prominent and the size controls stay readable.
- Screenshots: `C:/Users/Andrew/LotFoundry/artifacts/studio-fit-20260922/`.
- Local preview: `http://127.0.0.1:4533/studio?parcel=oak-street`.

No physical-device check is claimed. The preview and local checks use
dependencies shared from the primary checkout; release validation uses the
committed lockfile in a clean checkout.
