# LotFoundry — ADU Feasibility Studio

A production-grade ADU feasibility studio. Search a real property address to pull live parcel data (lot dimensions, setbacks, zoning) via Regrid, visualize the lot on a satellite aerial map, and instantly see zoning coverage, build cost ranges, monthly rent, NOI, and a payback estimate. Generate a concept report you can print, save, or share.

## Product Scope

- **Live parcel search:** Enter any US residential address → Regrid parcel API returns actual lot dimensions, setbacks, and zoning
- **Aerial visualization:** Google Maps Static satellite view with parcel boundary + ADU footprint overlay
- **Feasibility engine:** Instant NOI, payback, build cost ranges, and zoning compliance
- **AI parcel + permit brief:** One authenticated OpenAI response joins parcel fit, review risks, a jurisdiction-grounded approval timeline, and recorded next steps; the same brief is included in the certificate and exports
- **AI style-matched concepts:** Upload a home photo and generate a conceptual ADU mockup that matches visible exterior style cues
- **Demo mode:** Three hardcoded presets (Seattle, Portland, Austin) for offline / API-less use
- **Scenario persistence:** Authenticated users save scenarios to Firebase; guest users keep local browser saves; shareable deep-link URLs
- **Concept report:** Printable / downloadable Certificate of Feasibility with the financial ledger, AI parcel interpretation, and typical permit timeline

## Run Locally

Prerequisite: Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

### Environment Variables (optional — enables live parcel data and AI)

Create `.env.local`:
```
GOOGLE_MAPS_API_KEY=<server-side Maps Static + Geocoding key>
NEXT_PUBLIC_GOOGLE_PLACES_KEY=<browser-safe Places Autocomplete key>
REGRID_API_KEY=<server-side Regrid Parcel API key>
OPENAI_API_KEY=<server-side OpenAI API key>
OPENAI_TEXT_MODEL=gpt-5.5
OPENAI_IMAGE_MODEL=gpt-5.5
NEXT_PUBLIC_FIREBASE_API_KEY=<Firebase web API key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<Firebase auth domain>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<Firebase project ID>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<Firebase storage bucket>
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<Firebase messaging sender ID>
NEXT_PUBLIC_FIREBASE_APP_ID=<Firebase web app ID>
```

Without parcel API keys the app runs in demo mode with the three built-in presets.
Without `OPENAI_API_KEY`, the AI panels stay visible but return a setup message instead of generating content.
Without Firebase overrides the app uses the checked-in `yardup-2026` web app config.

## Verification Commands

```bash
npm run lint
npm run test
npm run test:e2e
FIREBASE_SMOKE_EMAIL=<test user> FIREBASE_SMOKE_PASSWORD=<password> npm run smoke:firebase
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

The app deploys to Firebase Hosting + Cloud Functions. Set the required server-side variables in the Firebase Functions config. See `docs/deployment.md` for the full deployment guide, including CI setup, post-deploy smoke checks, and rollback steps.

## Scope Notes

- Feasibility and financial outputs are estimates only. Confirm zoning, utility constraints, build costs, financing, tax treatment, and rents with local professionals before investing.
- Parcel data is sourced from Regrid and may not reflect recent changes. Always verify with your local jurisdiction.
- AI parcel interpretations, permit timelines, and style-matched ADU images are conceptual planning aids, not permit approvals, construction documents, or architectural advice.
