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
GOOGLE_PLACES_SERVER_KEY=<server-side Places API (New) key>
NEXT_PUBLIC_GOOGLE_PLACES_KEY=<browser-safe Places Autocomplete key>
REGRID_API_KEY=<server-side Regrid Parcel API key>
```

**CI (GitHub Secrets):**
| Secret | Purpose |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | JSON key with Firebase Admin role |
| `NEXT_PUBLIC_GOOGLE_PLACES_KEY` | Browser-safe Places Autocomplete key |

Server-side provider credentials are stored in Google Secret Manager and bound
only to the Functions that use them; they are not duplicated in GitHub Actions.

Without API keys the app runs in demo mode with 4 presets (Seattle, Portland, Austin, San Diego).

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
| `app/api/parcel/route.ts` | GET: Resolves parcel data through Regrid, public county/state GIS, Census geography, and USA Structures footprints, then falls back to preset defaults |
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

**`docs/design/` is the source of truth.** Read `docs/design/README.md` before any visual or UI change,
then `docs/design/design-system.md` (the A LOT MORE system, adopted 2026-09-05).

The previous system - Blue Hour / Golden Hour, clay/forest/amber/brick, Cormorant Garamond / Libre
Franklin / IBM Plex Mono, the pill-radius system - was retired and moved to `docs/design/archive/`.
Do not apply it to new work.

### Colors
- **Chalk** `#F5F5F0` = ground. Warm off-white, never pure white.
- **Carbon** `#161616` = ink, and the ground for inverted sections.
- **Signal orange** `#FF5B24` = action, and the proposed structure. **Fill only** - orange text on chalk
  is 2.83:1 and fails AA; use `#C43708` for orange type on chalk.
- **Stone** `#65655F` = muted text on chalk. On carbon use `#B7B7AE` instead.
- **Drafting line** `#DADAD3` = decorative hairlines only; a border that carries state must clear 3:1.
- **Status** (label + icon always, never colour alone): eligible `#176B4C` / `#5FBF93`, review-needed
  `#8A5300` / `#E0A33C`, blocked `#A82D16` / `#F0705A` (on chalk / on carbon).
- **Money is not a colour.** It is carbon, large, `tabular-nums`. Green means eligible, never money.

### Typography
- **Space Grotesk** = display, headlines, metrics. Negative tracking that tightens as size grows.
- **Manrope** = body, controls, labels, tables, micro-print.
- Two families only. No serif, no mono layer.

### Layout
- Percentage gutters (`4.5%` standard, up to `12%` feature, capped above 1700px), not a fixed container.
- Spacing is an optical scale, not a 4/8px grid. Do not "snap" it - that is a regression.
- Breakpoints are `1700 / 1150 / 800 / 480`, not Tailwind defaults, on A LOT MORE surfaces.

### Radius and elevation
- `0` for surfaces, cards, image frames and sections; `3px` for controls; `50%` for dots.
- Elevation is a hard offset shadow (`12px 16px 0 #E7E7DF`), no blur, except floating elements.

### Accessibility
- Focus ring is `2px` at `outline-offset: 5px`, pinned to the ground - **never `currentColor`**, which
  renders invisible on light-labelled controls.
- Touch targets `min-height: 44px`. All motion inside `prefers-reduced-motion: no-preference`.

### Surfaces not yet migrated
`/studio`, auth, builder, report, certificate and email still run the legacy Golden Hour palette.
`docs/design/product-surfaces.md` is the accurate record of what they use and how they migrate. Fix
bugs there; do not build new components in it, and do not partially reskin a surface.

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

_Last updated 2026-07-18 (accessible color roles, mobile release configuration, and public submission preparation)._

| Dimension | Status | Notes |
|---|---|---|
| Brand/Identity | ✅ Complete | LotFoundry fully integrated; A LOT MORE design system (`docs/design/`) |
| Core Feasibility Logic | ✅ Complete | 3 presets + live parcels from Regrid or public county/state GIS, with Census geography and USA Structures footprints; address-specific market rents/costs/opex use the HUD FMR index + key-gated live seam in `lib/server/market/` |
| 3D Visualization | ✅ Enhanced | Trees, fences, driveway, drag + arrow-key placement |
| Guided Spine (P0–P4) | ✅ Landed | Desktop: Lot → Feasibility → Design → Certificate → Builders rail. Mobile: five-reveal journey Find → Earn → Shape → Check → Act (`components/studio/mobile/journey/`, issue #130) — replaced the bottom sheet + first-run wizard |
| Landing handoff (P5) | ✅ Landed | Session-storage address handoff + dawn ramp; a handed-off address resolves straight into the journey's Earn reveal; arrival plate keeps money-in-3s; certificate specimen extends the landing arc to steps 04–05 |
| Monetization | ✅ Implemented | Stripe paid certificate purchase (P3) + builder lead-unlock marketplace; `LOTFOUNDRY_DEMO_UNLOCKS` for dev |
| AI Panels | ✅ Implemented | Parcel insights + style-matched ADU concepts (auth + rate-limited server routes) |
| Testing | ✅ Vitest + Playwright desktop/mobile | Use the current branch's GitHub `verify` job for release evidence |
| Deployment | ✅ Configured | Firebase Hosting + Functions, CI deploys master; see `docs/deployment.md` |
| Auth / User Accounts | ✅ Implemented | Login, signup, password reset, Google and Apple flows, settings, export, shared account navigation, support, feedback, legal, and deletion surfaces |
| Builder Marketplace | ✅ V1 | Builder dashboard, inbox, lead cards, unlock ledger; BuildersPanel matches by service area |
| Store Packaging (iOS/Play) | ⚠️ Configuration only | Android TWA configuration and upload-key association are checked in; the generated/signed AAB, Play App Signing certificate, store assets, and macOS-built iOS project remain external release gates |

---

## Next Priorities (deployment audit 2026-07-17)

1. **Production Places key verification** — `NEXT_PUBLIC_GOOGLE_PLACES_KEY` exists in GitHub Actions metadata and the 2026-07-04 live smoke against `https://yardup-2026.web.app/studio` returned `/api/suggest` suggestions for `1600 Pennsylvania Ave`. Still verify in Google Cloud Console that the secret value is the intended browser key, referrer-restricted to production domains + localhost, with Places (New) enabled.
2. **`NEXT_PUBLIC_APP_URL`** — set to the real domain or Stripe redirects land on `yardup-2026.web.app`.
3. **Stripe live-mode verification** — webhook endpoint registered in the dashboard, one live test checkout for certificate + lead-unlock flows.
4. **Store packaging** — Android TWA configuration and upload-key association exist; generate and review the Bubblewrap project, add the Play App Signing SHA-256, capture manifest/store screenshots, build a signed `.aab`, and generate the iOS project on macOS (`docs/store-deployment-readiness.md` §2–3).
5. **Design/QA sweep at the agency bar** — desktop + mobile pass against `docs/design/design-system.md`, covering contrast (especially orange-on-chalk), focus-ring visibility on every ground, touch targets, reduced motion, and status semantics. The studio and builder dashboard are still on the legacy palette; audit them against `docs/design/product-surfaces.md`, not against the new system.
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
