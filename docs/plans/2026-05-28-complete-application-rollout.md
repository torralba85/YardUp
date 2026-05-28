# Complete Application Rollout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Take the UrbanLens AR ADU Feasibility Studio from investor-demo MVP to a finished, shippable browser application with production-quality UI, durable calculations, automated tests, deployable hosting, and a clear release process.

**Architecture:** Keep the current Next.js app as the primary product surface, but split the oversized demo components into focused product modules with typed domain logic, URL/local persistence, report generation, visual scene rendering, and QA automation. Keep the app local-first for this rollout: no auth, database, external GIS, ARKit, Gemini, Mapbox, or backend service unless a later product decision explicitly adds it.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, React Three Fiber, Three.js, ESLint 9, Vitest, Testing Library, Playwright, axe accessibility checks, Vercel or static-compatible Next hosting.

---

## Current State

- App root: `C:\Users\torra\Downloads\Repos\AR ADU\urbanlens_-adu-ar-visualizer`
- Primary screen: `components/FeasibilityStudio.tsx`
- 3D/fallback scene: `components/ParcelScene.tsx`
- Domain calculations: `lib/feasibility.ts`
- Entry route: `app/page.tsx`
- Current quality gates: `npm run lint`, `npx tsc --noEmit`, `npm run build`
- Known caveat: `npm audit --audit-level=moderate` reports a Next nested PostCSS advisory whose automatic fix suggests a breaking downgrade; do not run `npm audit fix --force` without a deliberate dependency decision.

---

### Task 1: Establish Release Baseline and Source Control

**Files:**
- Modify: `README.md`
- Create: `.gitignore`
- Create: `docs/release-checklist.md`

**Step 1: Check repository state**

Run:

```powershell
git status --short
```

Expected: if this reports `fatal: not a git repository`, initialize a repo in the app root.

**Step 2: Initialize git if needed**

Run only if Step 1 shows no repository:

```powershell
git init
```

Expected: git repository initialized in `urbanlens_-adu-ar-visualizer`.

**Step 3: Create `.gitignore`**

Create:

```gitignore
node_modules/
.next/
out/
dist/
coverage/
playwright-report/
test-results/
qa-artifacts/
*.tsbuildinfo
.env
.env.*
!.env.example
```

**Step 4: Update `README.md` rollout section**

Add sections for:

- Product scope: local-first ADU feasibility studio.
- Non-goals: no live GIS, no permitting guarantee, no backend, no auth.
- Verification commands.
- Release command sequence.

**Step 5: Create `docs/release-checklist.md`**

Include this checklist:

```markdown
# Release Checklist

- [ ] `npm ci`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run test:e2e`
- [ ] `npx tsc --noEmit`
- [ ] `npm run build`
- [ ] Desktop visual check at 1440x900
- [ ] Tablet visual check at 768x1024
- [ ] Mobile visual check at 390x844 and 320x568
- [ ] Keyboard navigation check
- [ ] Report print/save check
- [ ] Download summary check
- [ ] Audit reviewed; no unsafe forced downgrade applied
```

**Step 6: Verify**

Run:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

Expected: all pass.

**Step 7: Commit**

```powershell
git add .gitignore README.md docs/release-checklist.md
git commit -m "chore: establish rollout baseline"
```

---

### Task 2: Split the Main UI Into Focused Components

**Files:**
- Modify: `components/FeasibilityStudio.tsx`
- Create: `components/studio/AppShell.tsx`
- Create: `components/studio/FeasibilityInspector.tsx`
- Create: `components/studio/MetricsSummary.tsx`
- Create: `components/studio/ReportPreview.tsx`
- Create: `components/studio/ControlBadge.tsx`
- Create: `components/studio/types.ts`

**Step 1: Write a smoke test first**

After Task 4 installs the test stack, create `components/studio/FeasibilityStudio.test.tsx`.

Test intent:

```tsx
it("renders the complete feasibility workflow", () => {
  render(<FeasibilityStudio />);
  expect(screen.getByText("Feasibility Studio")).toBeInTheDocument();
  expect(screen.getByText("Parcel Preset")).toBeInTheDocument();
  expect(screen.getByText("Generate Concept Report")).toBeInTheDocument();
  expect(screen.getByText("Build Cost Range")).toBeInTheDocument();
});
```

**Step 2: Move shell/navigation**

Extract left navigation and account/project summary from `FeasibilityStudio.tsx` into `AppShell.tsx`.

`AppShell` props:

```ts
interface AppShellProps {
  activeNav: string;
  parcelAddress: string;
  parcelCity: string;
  onNavigate: (id: string) => void;
  onReset: () => void;
  children: React.ReactNode;
}
```

**Step 3: Move inspector**

Extract all right-side controls into `FeasibilityInspector.tsx`.

Props:

```ts
interface FeasibilityInspectorProps {
  parcelId: string;
  config: ADUConfig;
  assumptions: FinancialAssumptions;
  result: FeasibilityResult;
  onParcelChange: (parcelId: string) => void;
  onConfigChange: (config: ADUConfig) => void;
  onAssumptionsChange: (assumptions: FinancialAssumptions) => void;
  onReset: () => void;
  onGenerateReport: () => void;
}
```

**Step 4: Move metrics**

Extract `MetricsSummary` unchanged except for typed props:

```ts
interface MetricsSummaryProps {
  result: FeasibilityResult;
}
```

**Step 5: Move report preview**

Extract `ReportPreview` into its own file.

Props:

```ts
interface ReportPreviewProps {
  parcelName: string;
  result: FeasibilityResult;
  onClose: () => void;
  onDownload: () => void;
}
```

**Step 6: Verify**

Run:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

Expected: all pass and UI behavior remains unchanged.

**Step 7: Commit**

```powershell
git add components/FeasibilityStudio.tsx components/studio
git commit -m "refactor: split feasibility studio components"
```

---

### Task 3: Replace Legacy Generated Components

**Files:**
- Delete: `components/ADUCanvas.tsx`
- Delete: `components/PrototypeView.tsx`
- Delete: `components/Docs/ArchitectureView.tsx`
- Delete: `components/Docs/RoadmapView.tsx`
- Delete: `components/Docs/SchemaView.tsx`
- Create: `components/studio/ProductNotes.tsx`

**Step 1: Confirm imports**

Run:

```powershell
Select-String -Path app,components,lib -Pattern "PrototypeView|ADUCanvas|ArchitectureView|RoadmapView|SchemaView" -Recurse
```

Expected before deletion: no active imports from `app/page.tsx` or `FeasibilityStudio.tsx`.

**Step 2: Add focused product notes**

Create `ProductNotes.tsx` with concise sections:

- “What this demo proves”
- “What is intentionally simulated”
- “Production path”

Use it only if a “Product Notes” nav item is needed. Do not restore the old proposal tabs as first-class UX.

**Step 3: Delete unused generated files**

Remove the old generated components listed above.

**Step 4: Verify**

Run:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

Expected: all pass.

**Step 5: Commit**

```powershell
git add -A components
git commit -m "chore: remove generated prototype leftovers"
```

---

### Task 4: Add Unit and Interaction Test Stack

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `test/setup.ts`
- Create: `lib/feasibility.test.ts`
- Create: `components/studio/FeasibilityStudio.test.tsx`

**Step 1: Install test dependencies**

Run:

```powershell
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

**Step 2: Add scripts**

Modify `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

Preserve existing scripts.

**Step 3: Configure Vitest**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["test/setup.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

Install `@vitejs/plugin-react` if required.

**Step 4: Add test setup**

Create `test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

Mock React Three Fiber components in UI tests if jsdom cannot render canvas.

**Step 5: Test calculations**

Create `lib/feasibility.test.ts` covering:

- default 600 sf scenario is compliant.
- 1,000 sf scenario exceeds coverage on compact/typical lot.
- market rent changes monthly rent and NOI.
- cost range changes by exterior finish.

**Step 6: Test UI workflow**

Create `components/studio/FeasibilityStudio.test.tsx` covering:

- default screen renders.
- clicking `1,000 sf` shows `Review needed`.
- clicking `Market` updates rent to `$2,350`.
- report preview includes `Print / Save PDF` and `Download Summary`.

**Step 7: Verify**

Run:

```powershell
npm run test
npm run lint
npx tsc --noEmit
npm run build
```

Expected: all pass.

**Step 8: Commit**

```powershell
git add package.json package-lock.json vitest.config.ts test lib components
git commit -m "test: add feasibility unit and UI coverage"
```

---

### Task 5: Add End-to-End Browser Coverage

**Files:**
- Modify: `package.json`
- Create: `playwright.config.ts`
- Create: `e2e/feasibility-studio.spec.ts`

**Step 1: Install Playwright**

Run:

```powershell
npm install --save-dev @playwright/test
npx playwright install chromium
```

**Step 2: Add scripts**

Modify `package.json`:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

**Step 3: Configure Playwright**

Create `playwright.config.ts` with:

- `webServer.command`: `npm run dev -- -p 3000`
- `webServer.url`: `http://localhost:3000`
- `reuseExistingServer`: true
- projects: Chromium desktop 1440x900, mobile 390x844.

**Step 4: Add E2E test**

Create `e2e/feasibility-studio.spec.ts`:

- Loads `/`.
- Expects title `UrbanLens AR | ADU Feasibility Studio`.
- Confirms canvas or fallback scene exists.
- Confirms metrics visible.
- Clicks `1,000 sf`.
- Expects `Review needed`.
- Clicks `Market`.
- Expects `$2,350`.
- Clicks `Download Summary` and asserts a `.txt` download.

**Step 5: Add visual screenshot checkpoints**

In the E2E test, save screenshots to `test-results/screenshots` for:

- default desktop
- review-needed desktop
- mobile default

Do not snapshot-test pixels yet; use screenshots as reviewer evidence.

**Step 6: Verify**

Run:

```powershell
npm run test:e2e
npm run lint
npm run test
npx tsc --noEmit
npm run build
```

Expected: all pass.

**Step 7: Commit**

```powershell
git add package.json package-lock.json playwright.config.ts e2e
git commit -m "test: add feasibility studio e2e coverage"
```

---

### Task 6: Improve Accessibility and Keyboard UX

**Files:**
- Modify: `components/studio/AppShell.tsx`
- Modify: `components/studio/FeasibilityInspector.tsx`
- Modify: `components/studio/ReportPreview.tsx`
- Modify: `components/ParcelScene.tsx`
- Modify: `app/globals.css`
- Create: `e2e/accessibility.spec.ts`

**Step 1: Add semantic landmarks**

Ensure:

- sidebar uses `<aside aria-label="Application navigation">`
- nav uses `<nav aria-label="Primary">`
- main uses `<main>`
- inspector uses `<section aria-labelledby="feasibility-heading">`
- report preview uses `<section aria-labelledby="report-preview-heading">`

**Step 2: Label controls**

Ensure every input/select has either visible `<label htmlFor>` or `aria-label`.

Required labels:

- Parcel preset
- Width
- Length
- Roof style group
- Exterior finish group
- Rental estimate group

**Step 3: Add focus states**

Add consistent visible focus rings:

```tsx
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2
```

Use dark offset on dark sidebar and white offset on content surfaces.

**Step 4: Report focus management**

When `Generate Concept Report` opens the report area, move focus to the report heading.

Implementation:

- `ReportPreview` accepts `autoFocus?: boolean`.
- Use `useRef<HTMLHeadingElement>` and `useEffect`.
- Give close button a real `aria-label`.

**Step 5: Add reduced motion rules**

In `app/globals.css`:

```css
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

**Step 6: Add accessibility E2E smoke**

Create `e2e/accessibility.spec.ts`:

- Tab through first 12 focusable controls.
- Assert focus is visible and does not get trapped.
- Open report and assert focus moves to report heading or close button.
- Confirm no horizontal overflow at 320px.

**Step 7: Verify**

Run:

```powershell
npm run test:e2e
npm run lint
npm run test
npx tsc --noEmit
npm run build
```

Expected: all pass.

**Step 8: Commit**

```powershell
git add app components e2e
git commit -m "fix: improve accessibility and keyboard flow"
```

---

### Task 7: Add Shareable Scenario State

**Files:**
- Modify: `components/FeasibilityStudio.tsx`
- Create: `lib/scenario-url.ts`
- Create: `lib/scenario-url.test.ts`

**Step 1: Define URL schema**

Use query params:

```text
parcel=oak-street
size=600
roof=shed
finish=cedar
rent=conservative
openings=1
```

Do not encode cost outputs; they are derived.

**Step 2: Write tests**

Create `lib/scenario-url.test.ts` covering:

- parse valid query.
- ignore invalid parcel id.
- clamp invalid footprint to 600.
- serialize current state.
- round-trip serialize -> parse.

**Step 3: Implement parser/serializer**

Create `lib/scenario-url.ts`:

```ts
export function parseScenarioParams(searchParams: URLSearchParams): Partial<ScenarioState>;
export function serializeScenarioParams(state: ScenarioState): string;
```

**Step 4: Wire app state**

In `FeasibilityStudio`:

- On first client render, parse `window.location.search`.
- When scenario changes, update URL with `history.replaceState`.
- Do not trigger full page reloads.

**Step 5: Add Share Link behavior**

Replace any fake share behavior with a real copy action:

- `navigator.clipboard.writeText(window.location.href)`
- Show temporary UI text: `Link copied`
- Fallback: select URL text if clipboard is unavailable.

**Step 6: Verify**

Run:

```powershell
npm run test
npm run test:e2e
npm run lint
npx tsc --noEmit
npm run build
```

Manual check:

```text
http://localhost:3000/?parcel=compact-lot&size=1000&roof=gable&finish=board&rent=market&openings=0
```

Expected: app loads that scenario and shows review-needed coverage.

**Step 7: Commit**

```powershell
git add components lib e2e
git commit -m "feat: add shareable scenario state"
```

---

### Task 8: Add Local Project Persistence

**Files:**
- Modify: `components/FeasibilityStudio.tsx`
- Create: `lib/saved-scenarios.ts`
- Create: `lib/saved-scenarios.test.ts`
- Modify: `components/studio/AppShell.tsx`
- Modify: `components/studio/ReportPreview.tsx`

**Step 1: Define storage model**

Use localStorage key:

```ts
const STORAGE_KEY = "urbanlens.savedScenarios.v1";
```

Type:

```ts
interface SavedScenario {
  id: string;
  name: string;
  createdAt: string;
  parcelId: string;
  config: ADUConfig;
  assumptions: FinancialAssumptions;
}
```

**Step 2: Write tests**

Cover:

- save scenario.
- list scenarios newest first.
- load by id.
- delete by id.
- gracefully recover from malformed JSON.

**Step 3: Implement helpers**

Create pure storage helpers that accept a `Storage` object for testability.

**Step 4: Add UI**

Add:

- `Save Concept` button near `Generate Concept Report`.
- Saved scenarios list in sidebar project card.
- `Load` and `Delete` actions.

Keep this compact; do not add a full CRM/dashboard.

**Step 5: Verify**

Run:

```powershell
npm run test
npm run test:e2e
npm run lint
npx tsc --noEmit
npm run build
```

Manual browser check:

- Save a concept.
- Reload page.
- Load saved concept.
- Delete saved concept.

**Step 6: Commit**

```powershell
git add components lib e2e
git commit -m "feat: persist saved concepts locally"
```

---

### Task 9: Finish Report Export

**Files:**
- Modify: `components/studio/ReportPreview.tsx`
- Modify: `app/globals.css`
- Create: `lib/report.ts`
- Create: `lib/report.test.ts`

**Step 1: Extract report builder**

Create `lib/report.ts`:

```ts
export function buildReportText(input: ReportInput): string;
export function buildReportCsv(input: ReportInput): string;
```

**Step 2: Test report text**

Cover:

- includes address.
- includes ADU size.
- includes coverage status.
- includes cost range.
- includes rent and NOI.
- includes disclaimer.

**Step 3: Add CSV export**

In `ReportPreview`, add `Export CSV` button using `buildReportCsv`.

**Step 4: Improve print stylesheet**

In `app/globals.css`, add print rules:

- hide sidebar and scene controls.
- show report preview full-width.
- preserve table/text hierarchy.
- set white background and black text.

**Step 5: Verify**

Run:

```powershell
npm run test
npm run test:e2e
npm run lint
npx tsc --noEmit
npm run build
```

Manual:

- Click `Print / Save PDF`.
- Confirm print preview uses report-focused layout.
- Click `Download Summary`.
- Click `Export CSV`.

**Step 6: Commit**

```powershell
git add app components lib e2e
git commit -m "feat: finish report export outputs"
```

---

### Task 10: Visual Polish Pass

**Files:**
- Modify: `components/ParcelScene.tsx`
- Modify: `components/studio/*.tsx`
- Modify: `app/globals.css`

**Step 1: Compare against concept**

Open concept:

```text
C:\Users\torra\.codex\generated_images\019e6d52-e3d1-76f3-a8f7-357156db6bde\ig_05e9a4cec3f0b004016a17e90dcc008197a08ea0bb11ee60c4.png
```

Compare against live app at:

```text
http://localhost:3000
```

Check:

- dark sidebar weight and spacing.
- centered parcel composition.
- inspector density.
- metrics strip in first viewport.
- report preview visibility.
- typography hierarchy.
- mobile readability.

**Step 2: Fix scene framing**

Ensure:

- desktop scene parcel fits without clipping.
- mobile labels do not collide.
- fallback scene is visually acceptable if WebGL context is lost.
- canvas/fallback area is never blank.

**Step 3: Fix inspector scroll behavior**

Desktop:

- Inspector may scroll internally, but primary CTA must stay visible.

Mobile:

- No horizontal overflow at 320px.
- Controls stack cleanly.
- Scene height is useful but not overwhelming.

**Step 4: Replace raw hex drift with tokens**

Consolidate repeated colors/radii into a small `tokens` object or Tailwind class conventions. Do not introduce a full theme framework.

**Step 5: Verify screenshots**

Run:

```powershell
npm run dev -- -p 3000
npm run test:e2e
```

Capture:

- 1440x900 desktop
- 1024x768 tablet
- 390x844 mobile
- 320x568 mobile

Expected: no clipped primary UI, no blank scene, no overlapping text, no horizontal overflow.

**Step 6: Commit**

```powershell
git add app components
git commit -m "polish: refine rollout visual quality"
```

---

### Task 11: Add CI

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `README.md`

**Step 1: Create CI workflow**

Create:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npx tsc --noEmit
      - run: npm run build
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
```

**Step 2: Document CI**

Add README section:

- “CI runs lint, unit tests, typecheck, build, and Playwright E2E.”
- “Do not merge if CI fails.”

**Step 3: Verify locally**

Run:

```powershell
npm run lint
npm run test
npx tsc --noEmit
npm run build
npm run test:e2e
```

Expected: all pass.

**Step 4: Commit**

```powershell
git add .github README.md
git commit -m "ci: add rollout verification pipeline"
```

---

### Task 12: Prepare Deployment

**Files:**
- Modify: `next.config.ts`
- Create: `vercel.json` if using Vercel-specific config
- Modify: `README.md`
- Create: `docs/deployment.md`

**Step 1: Choose deployment target**

Default: Vercel.

Do not add backend env vars. This app should deploy without secrets.

**Step 2: Validate Next config**

Keep:

```ts
const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  transpilePackages: ["motion"],
};
```

Remove `output: "standalone"` only if the deployment target requires normal Vercel output.

**Step 3: Add deployment doc**

Create `docs/deployment.md`:

- prerequisites.
- build command: `npm run build`.
- install command: `npm ci`.
- no environment variables required.
- release verification checklist.
- rollback instruction: redeploy previous successful build.

**Step 4: Add preview smoke test**

After deployment, verify:

- title loads.
- default feasibility workflow visible.
- report preview visible.
- 1,000 sf scenario triggers review-needed.
- no console errors.

**Step 5: Commit**

```powershell
git add next.config.ts vercel.json README.md docs/deployment.md
git commit -m "docs: prepare deployment rollout"
```

---

### Task 13: Final Release Candidate Verification

**Files:**
- Modify: `docs/release-checklist.md`
- Create: `docs/releases/2026-05-28-rc1.md`

**Step 1: Run clean install**

Run:

```powershell
Remove-Item -Recurse -Force node_modules
npm ci
```

Expected: install succeeds.

**Step 2: Run full local gate**

Run:

```powershell
npm run lint
npm run test
npm run test:e2e
npx tsc --noEmit
npm run build
npm audit --audit-level=moderate
```

Expected:

- lint/test/e2e/type/build pass.
- audit may still report known Next/PostCSS advisory; record exact output and decision in release notes.

**Step 3: Manual QA**

Verify at:

- 1440x900
- 1024x768
- 768x1024
- 390x844
- 320x568

Checklist:

- default app screen is feasibility studio.
- scene is never blank.
- report preview visible and readable.
- no horizontal overflow.
- keyboard focus reaches controls.
- report download works.
- CSV download works.
- print/save path opens.
- share link copies.
- saved concept survives reload.

**Step 4: Create release notes**

Create `docs/releases/2026-05-28-rc1.md`:

- shipped scope.
- verification commands and results.
- known limitations.
- audit decision.
- rollback plan.

**Step 5: Tag release candidate**

Run:

```powershell
git tag rc-2026-05-28-1
```

**Step 6: Commit**

```powershell
git add docs
git commit -m "docs: record rc1 verification"
```

---

## Definition of Finished

The application is rollout-ready only when all of the following are true:

- The first screen is the finished feasibility studio, not a proposal or placeholder page.
- All product claims are truthful: local deterministic estimates, not live permitting or builder outreach.
- The app works without API keys or external accounts.
- Lint, unit tests, E2E tests, typecheck, and build pass from a clean install.
- Desktop, tablet, and mobile layouts are manually inspected.
- Canvas/WebGL failure cannot produce a blank primary scene.
- Report print/save and text/CSV download work.
- Scenario state can be shared through URL.
- Saved concepts persist locally.
- CI runs the same release gate.
- Deployment docs and release notes exist.

---

## Execution Order

1. Task 1: baseline and source control.
2. Task 2: component split.
3. Task 3: remove legacy leftovers.
4. Task 4: unit/UI tests.
5. Task 5: E2E tests.
6. Task 6: accessibility.
7. Task 7: shareable URL state.
8. Task 8: local persistence.
9. Task 9: report export.
10. Task 10: visual polish.
11. Task 11: CI.
12. Task 12: deployment.
13. Task 13: release candidate verification.

Each task should be implemented, verified, and committed before moving to the next one.
