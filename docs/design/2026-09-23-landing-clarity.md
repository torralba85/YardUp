# Landing clarity and product evidence

Andrew approved all landing critique fixes on September 23, 2026. Implemented on
`design/landing-clarity-20260923`, based on `6993d2d`, in the isolated worktree
`C:/Users/Andrew/LotFoundry/.worktrees/landing-clarity-20260923`.
This is a local implementation record; no commit, push, merge, or deployment is included.

## Resulting page

- The A LOT MORE hero now explains the 3D backyard-home tool, estimated build
  costs, and rental potential before requesting an address. The address remains
  the primary action, with the existing free-first-address and private handoff behavior.
- At small mobile widths, the display uses `21vw`; explanation precedes the
  form, followed by the illustration and the official Google Play badge. Desktop
  keeps the badge beneath the address area.
- The next section shows an actual Studio demo capture and a direct
  `/studio?parcel=oak-street` link. The demo link clears a previously stashed
  address. The concept hero and modeled demo retain separate, explicit labels.
- A compact motivations selector replaces the long lifestyle section and
  repeated aspiration copy. The estimates section names build costs and rental
  potential directly.
- “What's included” distinguishes free Studio exploration and initial estimates
  from the optional Certificate of Feasibility. Price uses the existing
  `useStorePrice("certificate")` channel-resolved value, with “Price at checkout”
  when unavailable. Contents match `CertificatePanel`: modeled site-fit flags,
  financial assumptions, next steps, print, CSV, and a shareable scenario.
- All four single-choice selectors use the shared `Segmented` radio group:
  one tab stop, announced checked state, and Arrow/Home/End focus and selection.
  The landing retains its own colors, optical spacing, and visible focus treatment.

## Studio preview provenance

The preview is a screenshot of the actual local Oak Street demo scene at
`6993d2d`: Seattle, the default 600 sq ft concept, cedar finish and shed roof.
The capture script opens Design on desktop and Shape on mobile and captures
`scene-viewport`, including the real model, toolbar, and modeled-fit feedback.
The model or result was not painted into the screenshot. All external requests
are blocked during capture; no account, real-address lookup, or AI call is used.

| Asset | Dimensions | Bytes |
|---|---|---|
| `public/landing/studio-demo-desktop.webp` | 1200 × 1202 | 46,500 |
| `public/landing/studio-demo-mobile.webp` | 780 × 878 | 24,650 |

The responsive picture reserves the image dimensions and loads lazily. Each
visitor downloads the appropriate variant. Encoding changes only image size and
format. Regenerate after Studio changes using a local server:

```powershell
node scripts/capture-landing-demo.mjs http://localhost:4543
```

## Verification

- Focused Vitest: 3 files, 22 tests passed, covering landing handoff, guest flow,
  Firebase-free rendering, and radio-group interaction.
- TypeScript: `npm.cmd exec -- tsc --noEmit` passed.
- Lint: `npm.cmd run lint` passed with zero warnings.
- Production build: `npm.cmd run build` passed; 49 static pages generated.
- Production Playwright: 10 tests passed across desktop and mobile Chromium,
  including 320, 390, 800, 1150, and 1440 px layout checks, visible keyboard
  focus, selector updates, preview loading, and direct demo entry without an
  account dialog.
- Final desktop/mobile full-page captures inspected, including the preview,
  offer comparison, closing address form, and footer. Evidence is saved under
  `C:/Users/Andrew/LotFoundry/artifacts/landing-clarity-20260923/`.

These are focused local checks. Full application E2E, paid checkout, CI,
deployment, and conversion measurement were not performed for this landing change.
The earlier critique was a single-context synthesis after the authorized two
reviewers hit usage limits; it should not be described as a completed independent
dual review. The Impeccable plugin became unavailable after interruption, so the
implementation follows the repository design authority and frontend-design guidance.
