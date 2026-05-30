# Deployment Guide

LotFoundry ships as a Next.js 16 app deployed to **Firebase Hosting + Cloud Functions**.

## Architecture

| Layer | Firebase Service | Purpose |
|---|---|---|
| Static assets & SPA | Firebase Hosting | Serves the Next.js standalone build, fonts, icons, manifest |
| API routes (`/api/*`) | Cloud Functions (nodejs22) | Proxies Regrid parcel data and Google Maps Static aerial images |

## Prerequisites

- Node.js 22 or newer locally.
- Firebase CLI installed: `npm install -g firebase-tools`
- A Firebase project named `lotfoundry` (or update `.firebaserc` with your project ID).
- A service account key with the **Firebase Hosting Admin** role for CI deployment.

## Local Deploy

```bash
# 1. Install dependencies
npm ci

# 2. Build the app + prepare Firebase output
npm run build:firebase

# 3. Login to Firebase (first time only)
firebase login

# 4. Deploy hosting + functions
npm run deploy
# or: firebase deploy --only hosting,functions
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
- `hosting.rewrites`: `/api/**` routes to the `api` Cloud Function; all other routes serve `index.html` for SPA client-side routing.
- `functions.source`: `functions` — the Node.js function directory.
- `functions.runtime`: `nodejs22`.

### `.firebaserc`

Sets the default Firebase project ID to `yardup-2026`.

### `functions/index.js`

Two Firebase Functions v2 HTTPS functions:
- **`app`** — serves all Next.js SSR pages and static assets
- **`api`** — serves `/api/parcel` and `/api/aerial` proxy routes

## CI/CD (GitHub Actions)

`.github/workflows/ci.yml` runs two jobs:

1. **verify** — lint, test, typecheck, build, and Playwright E2E (runs on every push and PR).
2. **deploy** — runs only on pushes to `master` after `verify` passes. Builds with `build:firebase`, authenticates via `google-github-actions/auth`, and runs `firebase deploy --only hosting,functions`.

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
```

Firebase Functions v2 reads this file automatically. Do **not** commit `.env` — it's in `.gitignore`.

### CI / production

Set these four secrets in your GitHub repository Settings → Secrets → Actions:

| Secret | Purpose |
|---|---|
| `GOOGLE_MAPS_API_KEY` | Server-side Maps Static + Geocoding key |
| `NEXT_PUBLIC_GOOGLE_PLACES_KEY` | Browser-safe Places Autocomplete key (restricted by HTTP referrer in GCP Console) |
| `REGRID_API_KEY` | Regrid Parcel API key |
| `FIREBASE_SERVICE_ACCOUNT` | JSON service account key for Firebase deploy |

The CI workflow writes `functions/.env` from these secrets before building, and the Firebase action deploys the result.

## Release Verification

Before promoting a deploy run the local release gate:

```bash
npm ci
npm run lint
npm run test
npm run test:e2e
npx tsc --noEmit
npm run build
```

All commands must pass. CI (`.github/workflows/ci.yml`) runs the same gate.

## Post-Deploy Smoke Test

After deployment, manually verify:

- Title `LotFoundry | ADU Feasibility Studio` loads on the Firebase Hosting URL.
- The default feasibility workflow is visible.
- The report preview is visible at the bottom of the page.
- Selecting `compact-lot` and `1,000 sf` displays the `Review needed` alert.
- No console errors in the browser devtools.
- The Share Link button copies the current scenario URL.
- (If API keys configured) Address search returns parcel data via `/api/parcel`.

## Rollback

Firebase Hosting:
```bash
firebase hosting:rollback
```

Cloud Functions:
```bash
git revert <commit> && git push
firebase deploy --only functions
```

No data migration is required because the app stores all user state locally in the browser.

## Audit Note

`npm audit --audit-level=moderate` currently reports a Next.js nested PostCSS advisory whose automatic fix proposes a breaking Next.js downgrade. Do **not** run `npm audit fix --force`. Track this through Next.js upstream releases and apply once a non-breaking fix is available.
