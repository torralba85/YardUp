# Deployment Guide

LotFoundry ships as a Next.js 16 app deployed to **Firebase Hosting + Cloud Functions**.

## Architecture

| Layer | Firebase Service | Purpose |
|---|---|---|
| Static assets & SPA | Firebase Hosting | Serves the Next.js standalone build, fonts, icons, manifest |
| AI API routes (`/api/ai/*`) | Cloud Functions (nodejs22) | Runs OpenAI-backed parcel insights and style-matched ADU concepts |
| Other API routes (`/api/*`) | Cloud Functions (nodejs22) | Proxies Regrid parcel data and Google Maps Static aerial images |

## Prerequisites

- Node.js 22 or newer locally.
- Firebase CLI installed: `npm install -g firebase-tools`
- Firebase project access for `yardup-2026` (or update `.firebaserc` and the `NEXT_PUBLIC_FIREBASE_*` values for another project).
- A service account key with the **Firebase Hosting Admin** role for CI deployment.

## Local Deploy

```bash
# 1. Install dependencies
npm ci

# 2. Build the app + prepare Firebase output
npm run build:firebase

# 3. Login to Firebase (first time only)
firebase login

# 4. Validate and deploy hosting + functions + Firestore rules
npm run deploy:dry-run
npm run deploy
# or: firebase deploy --only hosting,functions,firestore:rules --project yardup-2026
```

## Build Configuration

The project's `next.config.ts` exports:

```ts
const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  transpilePackages: ["motion"],
};
```

- `output: "standalone"` produces a self-contained server bundle that the Cloud Function uses.
- `scripts/prepare-firebase.js` copies the standalone output into `dist/` (for Hosting) and `functions/.next/` (for Functions).

## Firebase Configuration

### `firebase.json`

- `hosting.public`: `dist` — the prepared static + standalone output.
- `hosting.rewrites`: `/api/ai/**` routes to the longer-timeout `apiAi` Cloud Function, `/api/**` routes to the generic `api` Cloud Function, and all other routes serve the Next.js app function.
- `functions.source`: `functions` — the Node.js function directory.
- `functions.runtime`: `nodejs22`.

### `.firebaserc`

Sets the default Firebase project ID to `yardup-2026`.

### `functions/index.js`

Firebase Functions v2 HTTPS functions:
- **`app`** — serves all Next.js SSR pages and static assets
- **`apiAi`** — serves `/api/ai/*` routes with a longer timeout for OpenAI image generation
- **`api`** — serves generic non-payment API routes such as `/api/parcel` and `/api/aerial`
- **`apiStripe`** — serves Stripe checkout and webhook routes with Stripe Secret Manager bindings

## CI/CD (GitHub Actions)

`.github/workflows/ci.yml` runs two jobs:

1. **verify** — lint, test, typecheck, build, and Playwright E2E (runs on every push and PR).
2. **deploy** — runs only on pushes to `master` after `verify` passes. Builds with `build:firebase`, authenticates via `google-github-actions/auth`, dry-runs the same Firebase target set, and then runs `firebase deploy --only hosting,functions,firestore:rules`.

### Required CI Secrets

| Secret | Purpose |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | JSON service account key with **Firebase Admin** role. Generate in Firebase Console → Project Settings → Service Accounts → Generate new private key. |

## Environment Variables

### Local development

Create `functions/.env` (copied from `functions/.env.example`):
```
GOOGLE_MAPS_API_KEY=<server-side Maps Static + Geocoding key>
NEXT_PUBLIC_GOOGLE_PLACES_KEY=<browser-safe Places Autocomplete key>
REGRID_API_KEY=<server-side Regrid Parcel API key>
OPENAI_API_KEY=<server-side OpenAI API key>
NEXT_PUBLIC_FIREBASE_API_KEY=<Firebase web API key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<Firebase auth domain>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<Firebase project ID>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<Firebase storage bucket>
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<Firebase messaging sender ID>
NEXT_PUBLIC_FIREBASE_APP_ID=<Firebase web app ID>
```

Firebase Functions v2 reads this file automatically. Do **not** commit `.env` — it's in `.gitignore`.

### CI / production

Set these secrets in your GitHub repository Settings → Secrets → Actions:

| Secret | Purpose |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Service account JSON for Firebase deploy |
| `GOOGLE_MAPS_API_KEY` | Server-side Maps Static, Geocoding, or related Google API key |
| `GOOGLE_GEOCODING_KEY` | Server-side geocoding key when separate from Maps key |
| `NEXT_PUBLIC_GOOGLE_PLACES_KEY` | Browser-safe Places key restricted by HTTP referrer |
| `REGRID_API_KEY` | Server-side Regrid parcel API key |
| `OPENAI_API_KEY` | Server-side OpenAI API key for AI parcel insights and style-matched ADU concepts |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase web app ID |

The CI workflow writes `functions/.env` from these secrets before building, and the Firebase action deploys the result. The service account must be able to deploy Firebase Hosting, Cloud Functions v2, and Firestore rules in `yardup-2026`; if Cloud Billing API access or required Firebase/GCP APIs are disabled, the dry-run step fails before the live deploy command.

## Release Verification

Before promoting a deploy run the local release gate:

```bash
npm ci
npm run lint
npm run test
npm run test:e2e
npx tsc --noEmit
npm run build
npm run build:firebase
npm run deploy:dry-run
FIREBASE_SMOKE_EMAIL=<test user> FIREBASE_SMOKE_PASSWORD=<password> npm run smoke:firebase
```

All commands must pass before promotion. CI (`.github/workflows/ci.yml`) runs the non-credentialed gates; run the Firebase smoke command with a dedicated test user before or after deploy.

## Post-Deploy Smoke Test

After deployment, manually verify:

- Title `LotFoundry | ADU Feasibility Studio` loads on the Firebase Hosting URL.
- The default feasibility workflow is visible.
- The report preview is visible at the bottom of the page.
- Selecting `compact-lot` and `1,000 sf` displays the `Review needed` alert.
- No console errors in the browser devtools.
- The Share Link button copies the current scenario URL.
- `FIREBASE_SMOKE_EMAIL=<test user> FIREBASE_SMOKE_PASSWORD=<password> npm run smoke:firebase` signs in, saves a scenario to Firestore, loads it, and deletes it.
- (If API keys configured) Address search returns parcel data via `/api/parcel`.

## Production Acceptance Criteria

- Firebase deploy dry-run passes before live deploy.
- Live deploy includes Hosting, Functions, and Firestore rules.
- Firestore rules tests pass before deploy.
- Dedicated Firebase smoke user can sign in, save a scenario, load it, and delete it.
- Production URL loads `/`, `/privacy`, `/terms`, `/login`, `/signup`, `/studio`, and `/builder` (account management lives inside the studio AppShell, not a standalone `/account` route).
- Browser console has no release-blocking errors during the estimate and save/load flows.
- API keys are restricted in Google Cloud Console to the minimum required referrers or server contexts.

## Rollback

Firebase Hosting:
```bash
firebase hosting:rollback
```

Cloud Functions:
```bash
git revert <commit> && git push
firebase deploy --only functions
firebase deploy --only firestore:rules
```

Saved scenarios for authenticated users live in Firestore under `users/{uid}/savedScenarios`; rollback does not require a schema migration for the current create/load/delete flow.

## Audit Note

`npm audit --audit-level=moderate` currently reports a Next.js nested PostCSS advisory whose automatic fix proposes a breaking Next.js downgrade. Do **not** run `npm audit fix --force`. Track this through Next.js upstream releases and apply once a non-breaking fix is available.
