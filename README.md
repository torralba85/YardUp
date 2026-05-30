# LotFoundry — ADU Feasibility Studio

A production-grade ADU feasibility studio. Search a real property address to pull live parcel data (lot dimensions, setbacks, zoning) via Regrid, visualize the lot on a satellite aerial map, and instantly see zoning coverage, build cost ranges, monthly rent, NOI, and a payback estimate. Generate a concept report you can print, save, or share.

## Product Scope

- **Live parcel search:** Enter any US residential address → Regrid parcel API returns actual lot dimensions, setbacks, and zoning
- **Aerial visualization:** Google Maps Static satellite view with parcel boundary + ADU footprint overlay
- **Feasibility engine:** Instant NOI, payback, build cost ranges, and zoning compliance
- **Demo mode:** Three hardcoded presets (Seattle, Portland, Austin) for offline / API-less use
- **Scenario persistence:** Named scenarios saved locally; shareable deep-link URLs
- **Concept report:** Printable / downloadable PDF-quality summary

## Run Locally

Prerequisite: Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

### Environment Variables (optional — enables live parcel data)

Create `.env.local`:
```
GOOGLE_MAPS_API_KEY=<server-side Maps Static + Geocoding key>
NEXT_PUBLIC_GOOGLE_PLACES_KEY=<browser-safe Places Autocomplete key>
REGRID_API_KEY=<server-side Regrid Parcel API key>
```

Without these keys the app runs in demo mode with the three built-in presets.

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

## Deployment

The app deploys to Firebase Hosting + Cloud Functions. Set the three environment variables in the Firebase Functions config. See `docs/deployment.md` for the full deployment guide, including CI setup, post-deploy smoke checks, and rollback steps.

## Scope Notes

- Feasibility and financial outputs are estimates only. Confirm zoning, utility constraints, build costs, financing, tax treatment, and rents with local professionals before investing.
- Parcel data is sourced from Regrid and may not reflect recent changes. Always verify with your local jurisdiction.
