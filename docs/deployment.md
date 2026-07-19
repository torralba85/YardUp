# Deployment Guide

LotFoundry is a Next.js 16 app deployed to Firebase Hosting and Cloud Functions.
The production Firebase project is `yardup-2026`.

## Architecture

| Layer | Firebase service | Purpose |
|---|---|---|
| Web app | Hosting + `app` | Serves all non-API Next.js routes and static assets |
| AI API | `apiAi` | Serves `/api/ai/**` with the OpenAI secret and a longer timeout |
| Stripe API | `apiStripe` | Serves `/api/stripe/**` with Stripe secrets only |
| Native-store API | `apiStore` | Serves `/api/store/**` receipt verification with native-store secrets only when enabled |
| General API | `api` | Serves remaining `/api/**` routes with Google Maps, server Places fallback, and Regrid secrets; production Places calls use the Function's OAuth identity so App Check can remain enforced |

All five Functions use the same prepared Next.js handler. The rewrite selects the
least-privilege function rather than a different application bundle.

## Prerequisites

- Node.js 22 or newer.
- Firebase CLI: `npm install -g firebase-tools`.
- Access to `yardup-2026`, or a consciously updated `.firebaserc` and public Firebase configuration.
- CI service account permissions to deploy Firebase Hosting, Cloud Functions v2, and Firestore rules.

## Local deploy

```bash
npm ci
npm run build:firebase
firebase login
npm run deploy:dry-run
npm run deploy
```

`npm run deploy` covers Hosting, Functions, and Firestore rules. Deploy rules only
with `npm run deploy:rules` when that is the explicitly intended scope.

## Firebase configuration

`firebase.json` uses these rewrite boundaries:

```text
/api/ai/**      -> apiAi
/api/stripe/**  -> apiStripe
/api/store/**   -> apiStore
/api/**         -> api
**              -> app
```

Keep `firebase.json`, `functions/index.js`, and `scripts/prepare-firebase.js`
aligned whenever a function boundary changes.

## Environment and secrets

For local development, use `.env.local` and/or `functions/.env`; never commit
either file. The full variable reference is in [README.md](../README.md) and
[AGENTS.md](../AGENTS.md). The server-side variables most relevant to deploys are:

```text
GOOGLE_MAPS_API_KEY
GOOGLE_GEOCODING_KEY                 # optional dedicated key
GOOGLE_PLACES_SERVER_KEY             # optional dedicated key
REGRID_API_KEY
OPENAI_API_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_APP_URL
APPLE_BUNDLE_ID                      # native verification only
APPLE_ROOT_CA_FINGERPRINT256         # native verification only
GOOGLE_PLAY_PACKAGE_NAME             # native verification only
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON     # native verification only
```

Store production server-only values in Google Secret Manager. `functions/index.js`
binds `OPENAI_API_KEY` only to `apiAi`, Stripe values only to `apiStripe`, Google
Maps/server Places fallback/Regrid values only to `api`, and native-store credentials only
to `apiStore` when `ENABLE_NATIVE_STORE_VERIFICATION=true`. The production secret
IDs are `OPENAI_API_KEY_SECRET`, `GOOGLE_MAPS_API_KEY_SECRET`,
`GOOGLE_PLACES_SERVER_KEY_SECRET`, and `REGRID_API_KEY_SECRET`; the handler maps
those values to the runtime variable names consumed by Next.js. Do not place
server credentials in GitHub Actions secrets or `NEXT_PUBLIC_*` variables.

Places API (New) App Check is enforced in `yardup-2026`. The production
`/api/suggest` route therefore authenticates server-to-server with the `api`
Function's short-lived OAuth token and `X-Goog-User-Project`; the dedicated
Places key is a local/non-enforced fallback, not the production auth path.

CI also needs `FIREBASE_SERVICE_ACCOUNT` and the browser-safe public Firebase and
Places configuration. Restrict the browser Places key by HTTP referrer. Keep
server-side Maps keys server-safe rather than referrer-locked.

## CI/CD

`.github/workflows/ci.yml` runs:

1. `verify` on every pull request and push: lint, unit tests, typecheck, build,
   and Playwright.
2. `deploy` only after `verify` passes on `master`: `build:firebase`, deploy
   dry-run, then Hosting, Functions, and Firestore rules deployment.

Pull-request deploys are intentionally skipped. A green historical run does not
replace the `verify` run created by the commit under review.

## Release verification

Before a production deploy, run the release gate from a clean worktree:

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

After deployment, confirm:

- `/`, `/studio`, `/settings`, `/about`, `/help`, `/feedback`, `/delete-account`,
  `/privacy`, and `/terms` load successfully.
- Address search works with the configured provider keys and preserves a usable
  fallback without them.
- A dedicated Firebase smoke user can sign in, save, load, and delete a scenario.
- Authenticated data export and deletion work with a dedicated test account.
- Stripe checkout/webhook and native-store verification are tested only with the
  configured credentials and their respective sandbox or live test flows.

## Rollback

```bash
firebase hosting:rollback
git revert <commit>
git push
firebase deploy --only functions
firebase deploy --only firestore:rules
```

Saved scenarios live under `users/{uid}/savedScenarios`; the current create/load/delete
flow does not require a rollback schema migration.

## Dependency audit note

The root and Functions manifests override the transitive `websocket-driver`
dependency to `^0.7.5`, resolving the advisories previously tracked in this
guide. Continue running `npm audit --audit-level=moderate` against both dependency
trees after updates, reconcile the result with [SECURITY.md](../SECURITY.md), and
do not use `npm audit fix --force`.
