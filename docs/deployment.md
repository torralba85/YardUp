# Deployment Guide

LotFoundry is a Next.js 16 app deployed to Firebase Hosting and Cloud Functions.
The production Firebase project is `yardup-2026`.

## Architecture

| Layer | Firebase service | Purpose |
|---|---|---|
| Web app | Hosting + `app` | Serves all non-API Next.js routes and static assets |
| AI API | `apiAi` | Serves `/api/ai/**` with the OpenAI secret and a longer timeout |
| Stripe API | `apiStripe` | Serves `/api/stripe/**` with Stripe secrets only; keeps one instance warm (`minInstances: 1`, about $13 a month) so the buy click and webhooks skip a 5-8 s cold start |
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
ENABLE_NATIVE_STORE_VERIFICATION     # legacy umbrella flag; enables both platforms
ENABLE_APPLE_STORE_VERIFICATION      # bind Apple credentials only
ENABLE_GOOGLE_PLAY_VERIFICATION      # bind Google Play credentials only
APPLE_BUNDLE_ID                      # native verification only
APPLE_ROOT_CA_FINGERPRINT256         # native verification only
GOOGLE_PLAY_PACKAGE_NAME             # native verification only
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON     # native verification only
TYPESAFE_GEOCODE_PICKER              # "true" binds the TypeSafe key to `api`; spends metered quota on guest lookups
TYPESAFE_ZONING_SHADOW               # repository variable (not a secret); "true" binds the TypeSafe key to `api`; signed-in Regrid lookups only
TYPESAFE_API_KEY                     # TypeSafe flags only
```

Store production server-only values in Google Secret Manager. `functions/index.js`
binds `OPENAI_API_KEY` only to `apiAi`, Stripe values only to `apiStripe`, Google
Maps/server Places fallback/Regrid values only to `api`, and platform-specific
native-store credentials only to `apiStore` when the matching Apple or Google
verification flag is enabled, and the TypeSafe key (`TYPESAFE_API_KEY_SECRET`)
to `api` only when `TYPESAFE_GEOCODE_PICKER=true` or `TYPESAFE_ZONING_SHADOW=true` is in `functions/.env`. The legacy `ENABLE_NATIVE_STORE_VERIFICATION`
flag enables both platforms. The production secret
IDs are `OPENAI_API_KEY_SECRET`, `GOOGLE_MAPS_API_KEY_SECRET`,
`GOOGLE_PLACES_SERVER_KEY_SECRET`, and `REGRID_API_KEY_SECRET`; the handler maps
those values to the runtime variable names consumed by Next.js. Do not place
server credentials in GitHub Actions secrets or `NEXT_PUBLIC_*` variables.

Places API (New) App Check is enforced in `yardup-2026`. The production
`/api/suggest` route therefore authenticates server-to-server with the `api`
Function's short-lived OAuth token and `X-Goog-User-Project`; the dedicated
Places key is a local/non-enforced fallback, not the production auth path.

CI also needs `FIREBASE_SERVICE_ACCOUNT` and the browser-safe public Firebase and
Places configuration, plus `NEXT_PUBLIC_GA_MEASUREMENT_ID` (the GA4 property's
`G-XXXXXXXXXX` ID) if analytics should run in production. It is a browser-safe
public value, not a secret, but it is still read from an Actions secret so the
property can be configured separately from application code. An unset ID in
local/test builds produces no tag and no cookie banner; the production guard
below prevents accidentally deploying that state. The ID is baked in at build time, so changing it requires a
redeploy, not just a secret update.

Production currently targets the lotfoundry.net **Website** stream
`G-7C1LM7VPMT`. The legacy YardUp Web stream is not the production target.
The deploy job runs `node scripts/ci/verify-analytics.mjs` after building and
rejects missing, stale, or multiple GA4 IDs in the client chunks. Run that same
check before a manual deployment. An intentional stream migration must update
both the Actions secret and this versioned guard. After release, accept analytics
in a browser and verify an event in the Website stream; bundle validation alone
does not prove collection. Preserve the opt-in consent gate.

Restrict the browser Places key by HTTP referrer. Keep server-side Maps keys
server-safe rather than referrer-locked.

The Neighborhood 3D photoreal basemap uses two browser-visible keys with the same
treatment: `NEXT_PUBLIC_GOOGLE_MAP_TILES_KEY` (Map Tiles API only, referrer-locked,
separate from the Places key) and `NEXT_PUBLIC_CESIUM_ION_TOKEN` (local development
only; the ion Community plan is non-commercial). With neither configured the view
renders map imagery, which is an expected state. Full credential, billing, CSP, and
Google-attribution notes live in [cesium-photoreal-deployment.md](./cesium-photoreal-deployment.md).

## Content-Security-Policy (planned)

The app has no CSP today. Before adding one, read
[cesium-photoreal-deployment.md](./cesium-photoreal-deployment.md): the CesiumJS globe
needs `script-src`/`style-src` for `https://cesium.com`, `connect-src` for the Google
tile hosts plus `*.cesium.com` and the ion asset CDN, `worker-src blob:`, and
`img-src data: blob:`. Adding a CSP without these breaks the globe in a way that
looks like a Cesium bug. Test any CSP in staging with both photoreal routes
configured.

## CI/CD

`.github/workflows/ci.yml` runs:

1. `scope` on every PR, master push, and manual dispatch: repository hygiene,
   CI safeguard tests, and conservative changed-file detection.
2. `quality` (lint, unit tests, Firestore rules) and `browser` (typecheck, build,
   desktop/mobile Playwright) run in parallel. Only recognized documentation-only
   changes skip these jobs. Mixed, unknown, workflow, lockfile, rules, migration,
   and shared-code changes keep full validation.
3. `verify` is the stable aggregate check. It rejects failed/canceled jobs and
   unexpected skips; docs-only changes still get a successful explicit check.
4. `deploy` runs only on master after `verify`, when production inputs differ
   from the latest recorded release or a redeploy is forced. That latest attempt
   must be successful; missing or unsuccessful records force a full release.
   It retains the production build with its public environment values, dry-run,
   and existing apiStore → rules → Hosting → remaining Functions order.

Pull-request deploys are intentionally skipped. A green historical run does not
replace the `verify` run created by the commit under review.

See [CI efficiency and validation](ci-efficiency.md) for scope rules, deployment
record recovery, forced releases, and safe branch experiments.

### Signup Canary

`.github/workflows/signup-canary.yml` runs against production after each master
CI run whose deploy succeeded, and on manual dispatch. Each of its two checks
runs even if the other fails, and either failure turns the run red:

1. `npm run smoke:signup` creates a disposable email/password account through
   Identity Toolkit (with an App Check debug token), writes and reads its
   Firestore profile, signs back in, then deletes the account with Firebase
   Admin. It never touches the Firebase `authDomain`.
2. `npm run smoke:google-sign-in` (`scripts/ci/google-sign-in.mjs`) checks the
   Google sign-in path for the production `authDomain`, read the way
   `lib/firebase.ts` reads it (`NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, default
   `auth.lotfoundry.net`). It fails when:
   - the host does not resolve in DNS (NXDOMAIN);
   - `https://<authDomain>/__/auth/handler` or `/__/firebase/init.json` does
     not answer 200 itself (a redirect does not count) over verified TLS, or
     `init.json` is not the `yardup-2026` config;
   - Google's OAuth endpoint, asked to authorize the web client with
     `redirect_uri=https://<authDomain>/__/auth/handler`, redirects to its error
     page with an `authError` (decoded, e.g. `redirect_uri_mismatch`).

   Each check is tried three times, 5 seconds apart, so one transient answer
   cannot fail the run. It needs no secrets or dependencies and runs locally
   the same way.

The second check exists because the first stayed green for about 20 hours
(2026-10-15 08:33 UTC to 2026-10-16 04:22 UTC) while Google sign-in was down:
#282 moved the `authDomain` to `auth.lotfoundry.net` before its DNS record,
Hosting custom domain, certificate and OAuth redirect URI existed (setup in
[Cloudflare DNS](cloudflare-dns.md#authlotfoundrynet-firebase-auth-handler)).
It does not complete a Google sign-in, which needs a real Google account, so a
missing Firebase Auth authorized domain or a disabled Google provider still
gets past it. It also does not call Identity Toolkit's `createAuthUri`: App
Check is enforced, so that call returns 401 without the SDK's App Check token.
Apple sign-in is hidden (`NEXT_PUBLIC_APPLE_SIGN_IN`) and not checked.

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
FIREBASE_SMOKE_EMAIL=<test user> FIREBASE_SMOKE_PASSWORD=<password> FIREBASE_SMOKE_APPCHECK_DEBUG_TOKEN=<registered UUID4> npm run smoke:firebase
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
