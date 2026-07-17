# LotFoundry — Agent Guide

**Last updated:** 2026-07-17 | **Repo:** `urbanlens-landing` | **Project ID:** `yardup-2026`

---

## Project Overview

**LotFoundry** is a browser-based ADU (Accessory Dwelling Unit) feasibility studio. Users search a real property address or select a demo preset, visualize their lot in 3D, configure an ADU concept, and receive instant feasibility outputs: zoning compliance, build cost range, monthly rent estimate, annual NOI, and payback period.

**Architecture:**
- **Frontend:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4
- **3D Scene:** `@react-three/fiber` + `@react-three/drei` + Three.js 0.164
- **Backend API:** Firebase Cloud Functions (nodejs22) serving parcel, AI, Stripe, account, feedback, and native-store verification routes
- **Hosting:** Firebase Hosting + Cloud Functions
- **Testing:** Vitest + Playwright desktop/mobile coverage; use the current GitHub `verify` job as release evidence

**What this app IS:**
- Local-first investor-demo with optional live parcel data via API keys
- A browser-based 3D/2D parcel massing and feasibility calculator
- Deployed to Firebase (project: `yardup-2026`)

**What this app is NOT:**
- Not a GIS platform, permitting system, or AR app
- Not a permitting system, appraisal, or investment guarantee; feasibility outputs remain planning estimates
- Not a full real estate marketplace; builder dashboard/routing surfaces exist, but the partner network workflow is still early

---

## Quick Reference

### Development

```bash
npm install           # Install dependencies
npm run dev           # Start dev server (localhost:3000)
npm run build         # Production build
npm run test          # Unit tests (Vitest)
npm run test:e2e      # E2E tests (Playwright)
npm run lint          # ESLint (zero warnings required)
```

### Deployment

```bash
npm run build:firebase  # Build + prepare Firebase output
npm run deploy          # Deploy Hosting + Functions
```

### Environment Variables

**Local (`.env.local`):**
```
GOOGLE_MAPS_API_KEY=<server-side Maps Static + Geocoding key>
NEXT_PUBLIC_GOOGLE_PLACES_KEY=<browser-safe Places Autocomplete key>
REGRID_API_KEY=<server-side Regrid Parcel API key>
```

**CI (GitHub Secrets):**
| Secret | Purpose |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | JSON key with Firebase Admin role |
| `GOOGLE_MAPS_API_KEY` | Server-side Maps Static + Geocoding key |
| `NEXT_PUBLIC_GOOGLE_PLACES_KEY` | Browser-safe Places Autocomplete key |
| `REGRID_API_KEY` | Regrid Parcel API key |

Without API keys the app runs in demo mode with 3 presets (Seattle, Portland, Austin).

---

## Codebase Map

### Entry Points

| File | Purpose |
|---|---|
| `app/page.tsx` | Blue Hour landing and address handoff into the studio journey |
| `app/layout.tsx` | Root layout with fonts, metadata, theme-color |
| `app/globals.css` | Tailwind import + LotFoundry theme tokens + print rules |

### Core Components

| File | Purpose |
|---|---|
| `components/FeasibilityStudio.tsx` | Main orchestrator: wraps ParcelProvider, owns the active spine step, maps each step (Your Lot / Feasibility & Rules / Design / Certificate / Builders) to a view |
| `components/ParcelScene.tsx` | 3D scene (Canvas) with drag-to-place + arrow-key ADU placement, trees, fences, driveway |
| `components/studio/StudioShell.tsx` | Desktop chrome: logo, the single `StepRail` spine (replaces the old sidebar-nav + tab-bar double navigation), active-parcel card, saved concepts, account block |
| `lib/studio-steps.ts` | The ordered spine model + `deriveStepStates` (pure, tested) |
| `components/ui/*` | Shared accessible primitives: `MoneyFigure`, `Button`, `Panel`, `StatusChip`, `Field`/`Segmented`/`Slider`, `StepRail`/`StepProgress` |
| `components/studio/FeasibilityInspector.tsx` | Right-side control panel: parcel selector, ADU config sliders, roof/finish/rent controls |
| `components/studio/MetricsSummary.tsx` | Bottom 6-metric bento strip: rent, NOI, build cost, payback, coverage, zoning |
| `components/studio/ReportPreview.tsx` | Expandable report export panel: print/PDF, download text/CSV, share link |
| `components/studio/AerialView.tsx` | Satellite aerial view with parcel boundary + ADU SVG overlay (live mode) |
| `components/studio/AddressSearch.tsx` | Google Places Autocomplete address input |
| `components/studio/mobile/journey/MobileJourney.tsx` | Five-reveal mobile journey: Find → Earn → Shape → Check → Act |

### Library Modules

| File | Purpose |
|---|---|
| `lib/feasibility.ts` | Core calculation engine: parcel presets, ADU config, zoning coverage, cost ranges, NOI, payback |
| `lib/parcel-types.ts` | TypeScript interfaces: `Parcel`, `LiveParcelData`, `ParcelPreset` |
| `lib/parcel-context.tsx` | React context: `ParcelProvider`, `useParcel` hook for live/preset parcel state |
| `lib/parcel-api.ts` | Client fetch helper for `/api/parcel` |
| `lib/saved-scenarios.ts` | localStorage persistence for named scenarios |
| `lib/scenario-url.ts` | URL serialization/deserialization for shareable deep links |
| `lib/report.ts` | Report text/CSV builder + download helpers |
| `lib/map-utils.ts` | Web Mercator projection: lat/lng → SVG pixel coordinates |
| `lib/utils.ts` | Shared formatting utilities |
| `lib/commerce/*` | Channel-aware purchases: Stripe on web, StoreKit on iOS, and Play Billing on Android |

### API Routes

| Route | Purpose |
|---|---|
| `app/api/parcel/route.ts` | GET: Proxies Regrid parcel data by lat/lng, falls back to preset defaults |
| `app/api/aerial/route.ts` | GET: Proxies Google Maps Static satellite image by lat/lng, falls back to keyless Esri World Imagery, then an SVG placeholder |
| `app/api/account/{delete,export}/route.ts` | Authenticated account deletion and data export |
| `app/api/ai/{project-brief,adu-concept}/route.ts` | Authenticated, rate-limited AI project brief and ADU concept generation |
| `app/api/feedback/route.ts` | Feedback intake with honeypot and rate limiting |
| `app/api/store/purchases/verify/route.ts` | Verifies StoreKit or Play Billing purchases and grants idempotently |
| `app/api/stripe/*` | Stripe certificate, lead-unlock, and credit checkout plus webhook handling |

### Firebase

| File | Purpose |
|---|---|
| `firebase.json` | Hosting rewrites: `/api/ai/**` → `apiAi`, `/api/stripe/**` → `apiStripe`, `/api/store/**` → `apiStore`, other `/api/**` → `api`, and `/**` → `app` |
| `.firebaserc` | Firebase project ID (`yardup-2026`) |
| `functions/index.js` | Five Functions: `app`, `apiAi`, `apiStripe`, `apiStore`, and least-privilege `api` |
| `functions/package.json` | Functions dependencies (firebase-functions, next, react, react-dom) |
| `scripts/prepare-firebase.js` | Build helper: copies `.next/standalone` → `dist/` and `functions/.next/` |

### Tests

| File | Coverage |
|---|---|
| `lib/feasibility.test.ts` | 5 tests: zoning compliance, coverage limits, rent scenarios, finish costs |
| `lib/scenario-url.test.ts` | 7 tests: URL parse/serialize round-trips |
| `lib/saved-scenarios.test.ts` | 5 tests: CRUD operations, malformed data recovery |
| `lib/report.test.ts` | 3 tests: report text generation |
| `lib/parcel-api.test.ts` | 5 tests: fetchParcel success/error paths |
| `lib/map-utils.test.ts` | 5 tests: lat/lng → pixel projection |
| `components/studio/FeasibilityStudio.test.tsx` | 4 tests: full UI workflow |
| `e2e/feasibility-studio.spec.ts` | Desktop + mobile: load, review-needed, market rent, download |
| `e2e/accessibility.spec.ts` | Keyboard navigation, focus visibility, overflow check |
| `e2e/visual-breakpoints.spec.ts` | Screenshot checkpoints at 5 breakpoints |

---

## Design System

See `DESIGN.md` for the full brand spec and use it as the source of truth before visual or UI changes. Key rules:

### Colors
- **Base clay** (`--lf-clay`) = interactive fills, borders, and large accents
- **Clay ink** (`--lf-clay-ink`) = interactive text, icons, and focus on light surfaces
- **Clay on dark** (`--lf-clay-on-dark`) = interactive text and focus on mahogany or espresso
- **Forest** (`--lf-forest`) = money, eligibility, completed/readiness states, and commit CTAs; current/selected states remain clay and commit hover uses `--lf-forest-strong`
- **Mahogany** (`--lf-mahogany`) = dark panels, rails
- **Amber** (`--lf-amber`) = permit risk, review needed
- **Amber ink** (`--lf-amber-ink`) = amber text/icons on light surfaces
- **Amber on dark** (`--lf-amber-on-dark`) = amber text/icons on mahogany or espresso
- **Brick** (`--lf-brick`) = genuine blockers

### Typography
- **Cormorant Garamond** = display, hero headlines, and money figures
- **Libre Franklin** = body text, labels, controls, nav, and dense UI
- **IBM Plex Mono** = APNs, dimensions, zoning codes, status chips, eyebrows, and tabular recorded facts

### Layout
- Landing first viewport is a poster, not a centered hero stack: warm parcel composition, oversized serif headline left/low, address search as a survey instrument, and an income rail docked to the bottom edge.
- Studio uses a mahogany sidebar, espresso money band, dominant map/3D scene, calibrated right rail, and metric cards below.
- Grid: 12 columns on desktop, 4 columns on mobile, max content width 1180px.

### Radius
- 2026-06-27 pill-radius system (final): clickable controls, CTAs, nav links, and search instruments (field + button together) use `rounded-full`.
- Tabular data chips and read-only content frames (dashed placeholders, suggestion dropdowns, risk banners) stay rectangular (`rounded-lg`/`rounded-md`).
- Circle indicators (avatars, step dots, progress markers, numbered badges) need explicit equal width/height so they render as true circles, not ovals.
- On stacked mobile layouts where a full pill would render as an oblong stadium, scale the radius down rather than forcing `rounded-full`.

---

## Working Guidelines

### Before Making Changes

1. **Read relevant files first** — never assume. Check `lib/feasibility.ts` before touching calculations, `ParcelScene.tsx` before touching 3D, etc.
2. **Run verification after every change:**
   ```bash
   npm run lint && npm run test && npx tsc --noEmit && npm run build
   ```
   All four must pass. No exceptions.
3. **Keep ESLint clean** — `--max-warnings=0` is enforced.
4. **Don't commit secrets** — `.env.local` and `functions/.env` are in `.gitignore`.
5. **Follow existing patterns** — component structure, naming, and styling conventions are established. Match them.

### Common Pitfalls

- **R3F `Text` component** — uses `troika-three-text` which loads fonts via CDN and fails silently in dev. Use `LabelSprite` (canvas-based sprite) instead.
- **`react-hooks/set-state-in-effect`** — Next.js 16's ESLint rules flag synchronous `setState` in effects. Use `/* eslint-disable react-hooks/set-state-in-effect */` when the pattern is intentional (e.g., URL hydration sync).
- **`three` types** — import `ThreeEvent` from `@react-three/fiber`, not as a global. Use `as unknown as { camera: THREE.Camera }` instead of `any`.
- **Parcel positioning** — the house is positioned dynamically based on lot dimensions. Don't hardcode Z positions.
- **Firebase Functions** — both `app` and `api` functions serve the same Next.js app via different rewrite rules. They share the same code path.
- **Hydration-safe motion** - prefer CSS `motion-safe:` variants for link/button hover and tap transforms. Avoid `useReducedMotion()` or JS-driven motion wrappers when they can change server/client attributes during hydration.

### Git Workflow

- Commit from the project repo, not the workspace root
- Use Conventional Commits: `fix(3d): ...`, `feat(parcel): ...`, `chore(deploy): ...`
- Keep commits focused — one logical change per commit

---

## Current Status

_Last updated 2026-07-17 (accessible color roles and operational-documentation sync)._

| Dimension | Status | Notes |
|---|---|---|
| Brand/Identity | ✅ Complete | LotFoundry fully integrated; field-book design system (`DESIGN.md`) |
| Core Feasibility Logic | ✅ Complete | 3 presets + live parcel (Regrid); address-specific market rents/costs/opex (HUD FMR index + key-gated live seam, `lib/server/market/`); provenance stamped on every result |
| 3D Visualization | ✅ Enhanced | Trees, fences, driveway, drag + arrow-key placement |
| Guided Spine (P0–P4) | ✅ Landed | Desktop: Lot → Feasibility → Design → Certificate → Builders rail. Mobile: five-reveal journey Find → Earn → Shape → Check → Act (`components/studio/mobile/journey/`, issue #130) — replaced the bottom sheet + first-run wizard |
| Landing handoff (P5) | ✅ Landed | Session-storage address handoff + dawn ramp; a handed-off address resolves straight into the journey's Earn reveal; arrival plate keeps money-in-3s; certificate specimen extends the landing arc to steps 04–05 |
| Monetization | ✅ Implemented | Stripe paid certificate purchase (P3) + builder lead-unlock marketplace; `LOTFOUNDRY_DEMO_UNLOCKS` for dev |
| AI Panels | ✅ Implemented | Parcel insights + style-matched ADU concepts (auth + rate-limited server routes) |
| Testing | ✅ Vitest + Playwright desktop/mobile | Use the current branch's GitHub `verify` job for release evidence |
| Deployment | ✅ Configured | Firebase Hosting + Functions, CI deploys master; see `docs/deployment.md` |
| Auth / User Accounts | ✅ Implemented | Login, signup, password reset, Google and Apple flows, settings, export, shared account navigation, support, feedback, legal, and deletion surfaces |
| Builder Marketplace | ✅ V1 | Builder dashboard, inbox, lead cards, unlock ledger; BuildersPanel matches by service area |
| Store Packaging (iOS/Play) | ⚠️ Groundwork present | Android TWA manifest and iOS Capacitor shell exist; signing, console configuration, sandbox validation, store assets, and review remain human gates |

---

## Next Priorities (deployment audit 2026-07-17)

1. **Production Places key verification** — `NEXT_PUBLIC_GOOGLE_PLACES_KEY` exists in GitHub Actions metadata and the 2026-07-04 live smoke against `https://yardup-2026.web.app/studio` returned `/api/suggest` suggestions for `1600 Pennsylvania Ave`. Still verify in Google Cloud Console that the secret value is the intended browser key, referrer-restricted to production domains + localhost, with Places (New) enabled.
2. **`NEXT_PUBLIC_APP_URL`** — set to the real domain or Stripe redirects land on `yardup-2026.web.app`.
3. **Stripe live-mode verification** — webhook endpoint registered in the dashboard, one live test checkout for certificate + lead-unlock flows.
4. **Store packaging** — generate the Android TWA and iOS project from the checked-in manifests/shell, replace the placeholder Play signing SHA-256, validate sandbox purchases, and produce signed artifacts (`docs/store-deployment-readiness.md`).
5. **Design/QA sweep at the agency bar** — desktop + mobile pass against `DESIGN.md`, including base clay fills, clay-ink light focus, clay-on-dark focus, selected clay, completed/readiness forest, and solid semantic hover roles.
6. **Builder network growth** — real builder onboarding flow; zero-state city coverage is honest but the network is empty.
7. **Solar simulation / view modes / aerial polish** — deferred scene enhancements from the earlier audit.
8. **Full HUD FMR coverage** — the checked-in market index (`lib/server/market/data/fmr.json`) is a seed extract (demo metros + CA/TX benchmark counties); run `scripts/build-market-data.js` against a full HUD release for nationwide ZIP/county coverage. Out-of-seed addresses resolve at the state/national tier, surfaced as low-confidence.

---

## Firebase Deployment Troubleshooting

If `firebase deploy` fails:

1. **Check service account role** — must be **Firebase Admin**, not just Hosting Admin
2. **Check billing** — Blaze (pay-as-you-go) plan required for Cloud Functions
3. **Check APIs enabled** — Cloud Functions API + Cloud Build API
4. **Check functions logs** — `firebase functions:log` after a failed deploy
5. **Check CI workflow** — view at https://github.com/torralba85/YardUp/actions

If the site deploys but API routes return 404:
- Verify `firebase.json` rewrites: `/api/ai/**` → `apiAi`, `/api/stripe/**` → `apiStripe`, `/api/store/**` → `apiStore`, remaining `/api/**` → `api`
- Verify `functions/index.js` exports `app`, `apiAi`, `apiStripe`, `apiStore`, and `api`
- Verify `prepare-firebase.js` copied `.next/` into `functions/.next/`
