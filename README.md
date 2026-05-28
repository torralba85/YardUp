# UrbanLens AR ADU Feasibility Studio

Investor-demo web MVP for exploring ADU feasibility with deterministic local parcel data, a 3D massing scene, cost ranges, rental upside, payback estimates, and an exportable concept report.

## Product Scope

A local-first ADU feasibility studio. Pick a parcel preset, dial in a footprint, roof, finish, and rent scenario, and immediately see zoning coverage, build cost ranges, monthly rent, NOI, and a payback estimate. Generate a concept report you can print, save, or share.

## Non-Goals

- No live GIS lookups or live permitting guarantees.
- No backend, database, or user accounts.
- No external auth, ARKit, ARCore, Mapbox, or Gemini integrations.
- Outputs are deterministic investor-demo estimates — confirm zoning, utilities, build costs, financing, taxes, and rents with local professionals before investing.

## Run Locally

Prerequisite: Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Verification Commands

```bash
npm run lint
npm run test
npm run test:e2e
npx tsc --noEmit
npm run build
```

## Release Command Sequence

```bash
npm ci
npm run lint
npm run test
npm run test:e2e
npx tsc --noEmit
npm run build
```

See `docs/release-checklist.md` for the full manual sign-off list and `docs/deployment.md` for deployment steps.

## Continuous Integration

CI runs on every push to `main`/`master` and on every pull request via `.github/workflows/ci.yml`. The workflow runs lint, unit tests, typecheck, build, and Playwright end-to-end tests against Chromium. Do not merge a pull request whose CI run is failing.

## Scope Notes

- No external API keys are required.
- No real GIS, permitting, ARKit, ARCore, Mapbox, Gemini, auth, or backend service is used.
- Feasibility and financial outputs are deterministic investor-demo estimates only. Confirm zoning, utility constraints, build costs, financing, tax treatment, and rents before making investment decisions.
