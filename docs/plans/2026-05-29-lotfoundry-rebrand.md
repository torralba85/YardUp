# LotFoundry Rebrand and Positioning Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand the UrbanLens ADU Feasibility Studio web app to LotFoundry, transitioning to a premium foundry earth-toned design system and money-first investor positioning.

**Architecture:** We will integrate the brand assets (LF monogram, wordmarks, OpenGraph image, and self-hosted fonts) and translate CSS custom property design tokens in Tailwind CSS v4. Visible copy, metadata, and design documentation will be updated to reflect the new identity, while preserving all 3D/AR engine logic.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Tailwind CSS v4, Vitest, Playwright.

---

### Task 1: Extract and Setup Brand Fonts and Assets

**Files:**
- Create: `public/fonts/Outfit` (directory from zip)
- Create: `public/fonts/Manrope` (directory from zip)
- Create: `public/lotfoundry-mark-primary.svg`
- Create: `public/lotfoundry-mark-dark.svg`
- Create: `public/lotfoundry-mark-mono.svg`
- Create: `public/lotfoundry-lockup-stacked.svg`
- Create: `public/lotfoundry-lockup-horizontal.svg`
- Create: `public/lotfoundry-og.png`
- Create: `public/icon-512.png`

- [ ] **Step 1: Extract font files from C:\Users\torra\Desktop\Manrope,Outfit.zip**

Run this PowerShell command to extract fonts into the project's public folder:
```powershell
Expand-Archive -Path "C:\Users\torra\Desktop\Manrope,Outfit.zip" -DestinationPath "c:\Users\torra\Downloads\Repos\AR ADU\urbanlens_-adu-ar-visualizer\public\fonts" -Force
```

- [ ] **Step 2: Copy SVG and PNG brand assets from Downloads/files_extracted and Downloads**

Run these PowerShell commands to copy the assets:
```powershell
Copy-Item -Path "C:\Users\torra\Downloads\files_extracted\lotfoundry-mark-primary.svg" -Destination "c:\Users\torra\Downloads\Repos\AR ADU\urbanlens_-adu-ar-visualizer\public\lotfoundry-mark-primary.svg"
Copy-Item -Path "C:\Users\torra\Downloads\files_extracted\lotfoundry-mark-dark.svg" -Destination "c:\Users\torra\Downloads\Repos\AR ADU\urbanlens_-adu-ar-visualizer\public\lotfoundry-mark-dark.svg"
Copy-Item -Path "C:\Users\torra\Downloads\lotfoundry-mark-mono.svg" -Destination "c:\Users\torra\Downloads\Repos\AR ADU\urbanlens_-adu-ar-visualizer\public\lotfoundry-mark-mono.svg"
Copy-Item -Path "C:\Users\torra\Downloads\files_extracted\lotfoundry-lockup-stacked.svg" -Destination "c:\Users\torra\Downloads\Repos\AR ADU\urbanlens_-adu-ar-visualizer\public\lotfoundry-lockup-stacked.svg"
Copy-Item -Path "C:\Users\torra\Downloads\lotfoundry-og.png" -Destination "c:\Users\torra\Downloads\Repos\AR ADU\urbanlens_-adu-ar-visualizer\public\lotfoundry-og.png"
Copy-Item -Path "C:\Users\torra\Downloads\files_extracted\icon-512.png" -Destination "c:\Users\torra\Downloads\Repos\AR ADU\urbanlens_-adu-ar-visualizer\public\icon-512.png"
```

- [ ] **Step 3: Create the custom horizontal lockup SVG**

Create `c:\Users\torra\Downloads\Repos\AR ADU\urbanlens_-adu-ar-visualizer\public\lotfoundry-lockup-horizontal.svg` with side-by-side monogram and wordmark layout:
```xml
<svg width="377" height="34" viewBox="0 0 377 34" xmlns="http://www.w3.org/2000/svg">
  <!-- Monogram on the left, scaled to 34px height -->
  <g transform="scale(0.1954)">
    <rect x="0" y="0" width="38" height="174" fill="#261307"/>
    <rect x="0" y="140" width="116" height="34" fill="#261307"/>
    <rect x="89" y="0" width="100" height="33" fill="#261307"/>
    <rect x="89" y="0" width="27" height="118" fill="#261307"/>
    <rect x="89" y="56" width="100" height="33" fill="#261307"/>
    <rect x="61" y="0" width="26" height="118" fill="#BFA58E"/>
    <rect x="139" y="112" width="50" height="62" fill="#BFA58E"/>
  </g>
  <!-- Wordmark on the right, translated by x = 48.8, y = 34 (handles vertical reflection scale) -->
  <g transform="translate(48.8 34) scale(0.04795 -0.04795)">
    <path d="M63 0V709H242V0ZM205 0V154H547V0Z" fill="#261307"/>
    <path d="M408 -13Q326 -13 257.0 15.0Q188 43 136.5 93.0Q85 143 56.0 210.5Q27 278 27 356Q27 434 55.5 500.5Q84 567 135.0 617.0Q186 667 255.0 694.5Q324 722 406 722Q488 722 557.0 694.5Q626 667 677.0 617.0Q728 567 756.5 500.0Q785 433 785 355Q785 277 756.5 210.0Q728 143 677.0 92.5Q626 42 557.5 14.5Q489 -13 408 -13ZM406 147Q466 147 510.0 173.0Q554 199 578.0 246.0Q602 293 602 356Q602 402 588.5 440.0Q575 478 549.0 505.5Q523 533 487.0 548.0Q451 563 406 563Q346 563 302.0 537.5Q258 512 234.0 465.0Q210 418 210 356Q210 308 223.5 269.5Q237 231 263.0 203.5Q289 176 325.0 161.5Q361 147 406 147Z" fill="#261307"/>
    <path d="M235 0V704H414V0ZM18 555V709H631V555Z" fill="#261307"/>
    <path d="M63 0V709H242V0ZM205 265V416H556V265ZM205 558V709H572V558Z" fill="#8C5B3F"/>
    <path d="M408 -13Q326 -13 257.0 15.0Q188 43 136.5 93.0Q85 143 56.0 210.5Q27 278 27 356Q27 434 55.5 500.5Q84 567 135.0 617.0Q186 667 255.0 694.5Q324 722 406 722Q488 722 557.0 694.5Q626 667 677.0 617.0Q728 567 756.5 500.0Q785 433 785 355Q785 277 756.5 210.0Q728 143 677.0 92.5Q626 42 557.5 14.5Q489 -13 408 -13ZM406 147Q466 147 510.0 173.0Q554 199 578.0 246.0Q602 293 602 356Q602 402 588.5 440.0Q575 478 549.0 505.5Q523 533 487.0 548.0Q451 563 406 563Q346 563 302.0 537.5Q258 512 234.0 465.0Q210 418 210 356Q210 308 223.5 269.5Q237 231 263.0 203.5Q289 176 325.0 161.5Q361 147 406 147Z" fill="#8C5B3F"/>
    <path d="M355 -11Q265 -11 196.5 26.5Q128 64 90.0 131.0Q52 198 52 283V709H230V270Q230 232 246.5 204.5Q263 177 291.5 162.5Q320 148 355 148Q391 148 418.0 162.5Q445 177 461.0 204.0Q477 231 477 269V709H657V282Q657 197 619.0 130.5Q581 64 513.5 26.5Q446 -11 355 -11Z" fill="#8C5B3F"/>
    <path d="M63 0V709H188L242 564V0ZM552 0 138 526 188 709 603 183ZM552 0 506 149V709H685V0Z" fill="#8C5B3F"/>
    <path d="M184 0V154H354Q414 154 458.5 177.0Q503 200 527.0 245.5Q551 291 551 356Q551 420 526.5 464.5Q502 509 458.0 532.0Q414 555 354 555H176V709H355Q437 709 506.0 683.5Q575 658 626.0 611.0Q677 564 705.5 499.0Q734 434 734 355Q734 275 705.5 210.0Q677 145 626.0 98.0Q575 51 506.5 25.5Q438 0 357 0ZM63 0V709H242V0Z" fill="#8C5B3F"/>
    <path d="M205 287V415H340Q384 415 407.5 436.5Q431 458 431 495Q431 531 407.5 553.5Q384 576 340 576H205V709H365Q437 709 491.5 682.0Q546 655 577.0 608.0Q608 561 608 498Q608 435 576.5 387.5Q545 340 489.0 313.5Q433 287 358 287ZM63 0V709H242V0ZM447 0 241 304 402 343 654 0Z" fill="#8C5B3F"/>
    <path d="M280 254 9 709H214L421 340H277L484 709H685L412 254ZM259 0V327H438V0Z" fill="#8C5B3F"/>
  </g>
</svg>
```

- [ ] **Step 4: Commit changes**

```powershell
git add public/fonts public/*.svg public/*.png
git commit -m "chore: add brand assets and extracted fonts"
```

---

### Task 2: Setup Fonts and Theme Configuration

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Wire local fonts and Google Geist Mono in app/layout.tsx**

Replace `app/layout.tsx` content to configure `Outfit` and `Manrope` from the local public fonts, and `Geist_Mono` via Google Fonts:
```tsx
import type { Metadata } from "next";
import localFont from "next/font/local";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const outfit = localFont({
  src: [
    { path: "../public/fonts/Outfit/static/Outfit-Regular.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/Outfit/static/Outfit-Medium.ttf", weight: "500", style: "normal" },
    { path: "../public/fonts/Outfit/static/Outfit-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../public/fonts/Outfit/static/Outfit-Bold.ttf", weight: "700", style: "normal" },
    { path: "../public/fonts/Outfit/static/Outfit-ExtraBold.ttf", weight: "800", style: "normal" },
    { path: "../public/fonts/Outfit/static/Outfit-Black.ttf", weight: "900", style: "normal" },
  ],
  variable: "--font-display",
});

const manrope = localFont({
  src: [
    { path: "../public/fonts/Manrope/static/Manrope-Regular.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/Manrope/static/Manrope-Medium.ttf", weight: "500", style: "normal" },
    { path: "../public/fonts/Manrope/static/Manrope-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../public/fonts/Manrope/static/Manrope-Bold.ttf", weight: "700", style: "normal" },
    { path: "../public/fonts/Manrope/static/Manrope-ExtraBold.ttf", weight: "800", style: "normal" },
  ],
  variable: "--font-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "LotFoundry | ADU Feasibility Studio",
  description:
    "Evaluate your lot's earning potential. Get instant ADU construction estimates, zoning coverage limits, and rental payback models.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${manrope.variable} ${geistMono.variable}`}
    >
      <body className="font-sans antialiased bg-lf-sand text-lf-espresso" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Update app/globals.css theme configuration**

Update `@theme` in `app/globals.css` to define the typography mapping and core `--lf-*` color tokens:
```css
@import "tailwindcss";

@theme {
  --font-sans: var(--font-sans), ui-sans-serif, system-ui, sans-serif;
  --font-display: var(--font-display), var(--font-sans), sans-serif;
  --font-mono: var(--font-mono), ui-monospace, monospace;

  /* LotFoundry Warm Earth Palette */
  --color-lf-sand: #F2E5D5;
  --color-lf-sand-2: #F8F0E4;
  --color-lf-card: #FBF6EE;
  --color-lf-taupe: #BFA58E;
  --color-lf-taupe-soft: #BFA58E2E;
  --color-lf-clay: #8C5B3F;
  --color-lf-mahogany: #592A0F;
  --color-lf-espresso: #261307;
  --color-lf-muted: #6B5B4D;
  --color-lf-hairline: #E0CDB4;

  /* Semantic status colors */
  --color-lf-forest: #2F4A38;
  --color-lf-forest-soft: #2F4A3820;
  --color-lf-amber: #B5792E;
  --color-lf-brick: #A23B26;
}

* {
  box-sizing: border-box;
}

html {
  background: var(--color-lf-sand);
}

body {
  margin: 0;
  background: var(--color-lf-sand);
  color: var(--color-lf-espresso);
}

button,
select,
input {
  font: inherit;
}

@media print {
  aside,
  canvas,
  .print\:hidden,
  [aria-labelledby="feasibility-heading"],
  [aria-label="Parcel massing scene"] {
    display: none !important;
  }

  body {
    background: #ffffff !important;
    color: #261307 !important;
    overflow: visible !important;
  }

  html {
    background: #ffffff !important;
  }

  main {
    overflow: visible !important;
    background: #ffffff !important;
  }

  #export {
    width: 100% !important;
    height: auto !important;
    overflow: visible !important;
    box-shadow: none !important;
    page-break-inside: avoid;
  }

  #export button {
    display: none !important;
  }

  #summary {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    page-break-inside: avoid;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 3: Verify the TypeScript compile**

Run:
```powershell
npx tsc --noEmit
```
Expected: Compiles with no errors.

- [ ] **Step 4: Commit changes**

```powershell
git add app/layout.tsx app/globals.css
git commit -m "style: configure LotFoundry typography and color tokens"
```

---

### Task 3: Re-skin the App Shell and Layout Colors

**Files:**
- Modify: `components/studio/AppShell.tsx`
- Modify: `components/FeasibilityStudio.tsx`
- Modify: `components/studio/FeasibilityInspector.tsx`
- Modify: `components/studio/MetricsSummary.tsx`
- Modify: `components/studio/ReportPreview.tsx`
- Modify: `metadata.json`

- [ ] **Step 1: Reskin components/studio/AppShell.tsx layout and logo**

Update `AppShell.tsx` to use:
- Mahogany `#592A0F` background for the dark sidebar navigation
- The lockup horizontal SVG on desktop/mobile headers
- LotFoundry typography and colors (`text-lf-espresso`, `bg-lf-sand`, `border-lf-hairline`)
- Proper tagline `a foundry for lots` in lowercase Geist Mono, tracked, below the lockup

Update references to "UrbanLens" and the logo icon to the new lockup.

- [ ] **Step 2: Update components/FeasibilityStudio.tsx UI copy and styling**

Update `FeasibilityStudio.tsx`:
- Render the IncomeLens using `font-display` (Outfit) for monetary values.
- Align status labels with semantic status colors (compliant -> `bg-lf-forest-soft text-lf-forest border-lf-forest/20`, risk/warning -> `bg-lf-amber/15 text-lf-amber border-lf-amber/30`).
- Update fallback/scene styling.

- [ ] **Step 3: Update FeasibilityInspector.tsx, MetricsSummary.tsx, and ReportPreview.tsx**

Modify visual elements in the side panels, report view, and bottom metrics bar:
- Replace `bg-white` panels with `bg-lf-card` or `bg-lf-sand-2`.
- Apply custom tabular-nums font classes using `font-mono` (Geist Mono) for dimension ticks, status values, and ranges.
- Update disclaimers and export headers to reflect **LotFoundry**.
- Replace mock user profile "James Doe" / "M. Carter" references to "Lot Owner".

- [ ] **Step 4: Update metadata.json**

Update `metadata.json` to reflect `LotFoundry` name and description.

- [ ] **Step 5: Run tests**

Run:
```powershell
npm run test
```
Expected: All 24 tests pass (we haven't modified the core calculation formulas, only visual classnames and metadata).

- [ ] **Step 6: Commit changes**

```powershell
git add components/studio/AppShell.tsx components/FeasibilityStudio.tsx components/studio/FeasibilityInspector.tsx components/studio/MetricsSummary.tsx components/studio/ReportPreview.tsx metadata.json
git commit -m "feat: re-skin shell and visual panels to LotFoundry branding"
```

---

### Task 4: Update DESIGN.md and Release Documentation

**Files:**
- Modify: `DESIGN.md`
- Modify: `docs/release-checklist.md`

- [ ] **Step 1: Replace design definitions in DESIGN.md**

Update `DESIGN.md` to document the LotFoundry Brand System v1:
- Replace visual thesis with the interlocking **L/F monogram** monogram gesture.
- Document palette details (`--lf-*` colors) and color rules (e.g. green for positive financial value only, clay for actions).
- Document the Outfit / Manrope / Geist Mono type scales.
- Update the copywriting rules to reinforce financial feasibility disclaimers and geography-neutral terms.

- [ ] **Step 2: Verify lint, build and tests**

Run:
```powershell
npm run lint
npx tsc --noEmit
npm run test
npm run build
```
Expected: All pass.

- [ ] **Step 3: Commit and finalize**

```powershell
git add DESIGN.md docs/release-checklist.md
git commit -m "docs: update DESIGN.md to document LotFoundry v1 brand spec"
```

---

## Verification Plan

### Automated Tests
- Run vitest suite: `npm run test` (Ensures calculation consistency and baseline rendering).
- Run linting: `npm run lint` (Confirm clean code format).
- Run typecheck: `npx tsc --noEmit`.
- Run production build: `npm run build` (Ensures Next.js compiling completes without bundle errors).

### Manual Verification
- Run local development server: `npm run dev` and navigate page.
- Spot-check:
  - Background is LotFoundry Sand.
  - Sidebar is Mahogany with the LotFoundry horizontal lockup and tracked lowercase tagline.
  - Tabular data renders in Geist Mono, headings in Outfit, and text in Manrope.
  - Feasibility metrics color compliance correctly switches between Green (Patina) and Amber (Risk).
