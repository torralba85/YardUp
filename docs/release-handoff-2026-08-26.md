# Release Handoff - Web Production + Google Play

**Date:** 2026-08-26
**Branch:** `feature/map-quality-improvements` @ `5f63585`
**PR:** [#162](https://github.com/torralba85/YardUp/pull/162) -> `master` (MERGEABLE / CLEAN, `verify` passing)
**Firebase project:** `yardup-2026`

This document records what is verified, what blocks release, and the exact
steps for the gates that need console access. It supersedes the status claims
in `docs/superpowers/plans/2026-08-25-production-deployment-and-website-completion.md`,
which was written before this work landed.

## Verified on this branch

All run locally against `5f63585`:

| Gate | Command | Result |
|---|---|---|
| Lint | `npm run lint` | pass (0 warnings) |
| Unit | `npm run test` | 770 passed, 135 files |
| Types | `npx tsc --noEmit` | pass |
| Build | `npm run build` | pass |
| E2E | `npm run test:e2e` | 82 passed, 14 skipped, 0 failed |
| Firebase build | `npm run build:firebase` | pass, incl. `assertFunctionsDependencies()` |
| Deploy config | `npm run deploy:dry-run` | pass, rules compiled, functions packaged |
| Secrets | `npm run repo:public-check` | pass (595 files) |
| Android config | `npm run android:validate` | pass |
| Audit (root) | `npm audit` | 0 vulnerabilities |
| Audit (functions) | `cd functions && npm audit` | 0 vulnerabilities |

Playwright browsers were missing locally on first run and produced 86 spurious
failures (`Executable doesn't exist ... chrome-headless-shell.exe`). That is an
environment gap, not a product defect; `npx playwright install chromium` fixes
it. CI installs its own browsers.

`deploy:dry-run` emits one non-blocking warning: `package.json indicates an
outdated version of firebase-functions`. Worth scheduling, not a release gate.

### Changes made in this session

- `feat(security)` baseline headers - X-Content-Type-Options, X-Frame-Options,
  Referrer-Policy, Permissions-Policy. `payment=(self)` is load-bearing for Play
  Billing and is locked by a test.
- `fix(payments)` Firestore read-before-write ordering in store grants; a
  purchase by a user with no builder profile previously recorded the grant and
  replay key while skipping the credit increment.
- `feat(commerce)` channel-native credit-pack pricing; Play requires its own
  localized prices rather than hardcoded `$175`/`$300`.
- `feat(android)` 1.0.6 / versionCode 7 with a published-ceiling guard.
- `style(design-system)` Newsreader / Instrument Sans / DM Mono.
- `chore(pwa)` service worker cache `v4` -> `v5` so returning visitors leave the
  old app shell.
- `chore(store)` manifest screenshots recaptured on the new type.

GitHub reports 52 Dependabot alerts, but those are against the **default
branch** (`master`), which is 66 commits stale. Merging PR #162 clears them.

## Corrections to prior status docs

- **Phase 1 credential blocker is closed.** `README.md` and
  `docs/devpost-submission.md` no longer carry plaintext reviewer passwords;
  both now state credentials are time-limited and owner-issued. The secret
  scanner passes.
- **`/robots.txt` WAS genuinely broken** (this corrects an earlier reading that
  blamed the stale deployment). Deploying current code did not fix it. Firebase
  Hosting does not route `/robots.txt` through the `**` -> `app` rewrite; it
  returns a bare 0-byte 404 before Next.js sees the request. The tell: that 404
  carries none of the `next.config.ts` headers, while a genuinely missing route
  returns Next's branded 404 with all of them. Reproduced against the Hosting
  URL, the Cloud Run function URL directly, and the `lotfoundry.net` Host
  header; `/sitemap.xml` resolves fine through the same rewrite. Fixed in
  `c6ca15b` by materializing `dist/robots.txt` from the prerendered body in
  `prepare-firebase.js`. Now 200 in production.
- **`NEXT_PUBLIC_APP_URL` does not need a CI secret.** `.github/workflows/ci.yml`
  never sets it, and both `app/robots.ts` / `app/sitemap.ts` and
  `lib/server/checkout-origin.ts` already default to `https://lotfoundry.net`
  in production. Deploying current code flips the canonical host automatically.

## DEPLOYED 2026-08-26

Production was deployed manually from a developer machine at ~17:15 UTC while
GitHub Actions was unavailable (Blocker 4). Hosting, all five Functions, and
Firestore rules are live at `https://yardup-2026.web.app`.

Post-deploy smoke - every route 200:

```
/  /studio  /about  /help  /feedback  /privacy  /terms  /delete-account
/login  /signup  /settings  /builder  /robots.txt  /sitemap.xml
/manifest.json  /.well-known/assetlinks.json  /sw.js  /offline.html
```

Confirmed live: all five security headers, `sitemap.xml` emitting
`https://lotfoundry.net`, service worker `v5`, `/robots.txt` 200,
`/api/suggest` 200.

**`lotfoundry.net` already resolves correctly at Firebase's edge.** Requesting
the Firebase IP with a `lotfoundry.net` Host header returns 200 for `/`,
`/about`, `/sitemap.xml`, and `/robots.txt`. Only DNS and the certificate remain
- once the Cloudflare change lands, the site works immediately with no further
deploy.

Note: PR #162 is **not merged**. `master` is still 66+ commits behind what is
running in production. Merge it once Actions is restored so the branch and the
deployed artifact agree.

## Blocker 1 - Cloudflare redirects all of lotfoundry.net (OPEN)

`lotfoundry.net` does not serve the app. Every path returns `301` to
`https://yardup-2026.web.app`, and the response carries `Server: cloudflare` -
so the redirect is a **Cloudflare rule**, not Firebase. Firebase never sees the
request.

```
$ curl -sSI https://lotfoundry.net/
HTTP/1.1 301 Moved Permanently
Location: https://yardup-2026.web.app/
Server: cloudflare
```

DNS confirms the zone is on Cloudflare (`dion/zita.ns.cloudflare.com`), with A
records on Cloudflare proxy IPs (`172.67.205.175`, `104.21.93.56`).

**The Firebase side is already done.** Queried via the Hosting API
(`v1beta1/projects/yardup-2026/sites/yardup-2026/customDomains`):

| Field | Value |
|---|---|
| Domain | `lotfoundry.net` (created 2026-07-28) |
| `ownershipState` | `OWNERSHIP_ACTIVE` |
| `hostState` | `HOST_MISMATCH` |
| `cert.state` | `CERT_VALIDATING` |

So the domain is registered and ownership is verified; the certificate is
blocked only because DNS still points at Cloudflare. Nothing needs to be added
in the Firebase Console for the apex domain - this is purely a DNS change.

**`www.lotfoundry.net` is NOT registered.** The API returns exactly one custom
domain. If `www` should resolve, add it in Firebase Console -> Hosting as a
second custom domain (Firebase can set it up as a redirect to the apex).

**Why this blocks the Play release too:** Android does not follow a
cross-origin redirect when verifying Digital Asset Links. A TWA built against
`lotfoundry.net` while it redirects will launch with Custom Tab browser chrome
instead of full screen. This is already documented in `native/android/README.md`.

**A second reason not to stay proxied:** Cloudflare is serving its *managed*
`robots.txt` at the edge, which sets `Disallow: /` for `ClaudeBot`, `GPTBot`,
`Google-Extended`, `CCBot`, `Amazonbot`, `Bytespider`, `Applebot-Extended`, and
`meta-externalagent`. That shadows the app's own robots route even if the
redirect is removed. Target DNS-only (grey cloud) so Firebase serves directly.

### Fix

All of this happens in the **Cloudflare dashboard**; no Firebase Console change
is needed for the apex domain. These are the exact records the Hosting API
reports as required.

1. **Cloudflare -> lotfoundry.net -> DNS -> Records.** Delete these four
   records, which Firebase flags `REMOVE`:

   | Type | Value |
   |---|---|
   | `A` | `104.21.93.56` |
   | `A` | `172.67.205.175` |
   | `AAAA` | `2606:4700:3031::6815:5d38` |
   | `AAAA` | `2606:4700:3037::ac43:cdaf` |

2. **Add one record**, set to **DNS only (grey cloud)** - not proxied:

   | Type | Name | Value | Proxy |
   |---|---|---|---|
   | `A` | `@` (lotfoundry.net) | `199.36.158.100` | DNS only |

   Grey cloud matters twice: it stops Cloudflare shadowing the app's
   `robots.txt`, and Cloudflare rules only run on proxied traffic, so grey-cloud
   also stops the redirect from firing.

3. **Leave every `TXT` record alone.** `hosting-site=yardup-2026`, both
   `google-site-verification` values, SPF, and DKIM are all still required.

4. **Cloudflare -> lotfoundry.net -> Rules.** Delete the rule redirecting to
   `yardup-2026.web.app`. Check **Redirect Rules**, **Page Rules**, and **Bulk
   Redirects** - it may be in any of the three. Step 2 already neutralizes it,
   but leaving it in place is a trap if the proxy is ever re-enabled.

5. Wait for `cert.state` to move from `CERT_VALIDATING` to `CERT_ACTIVE`.
   Usually minutes; Firebase allows up to 24h. Re-check with:

   ```bash
   TOKEN=$(gcloud auth print-access-token)
   curl -sS -H "Authorization: Bearer $TOKEN" \
     -H "X-Goog-User-Project: yardup-2026" \
     "https://firebasehosting.googleapis.com/v1beta1/projects/yardup-2026/sites/yardup-2026/customDomains"
   ```

**Expect a short TLS gap.** Between the DNS flip and the certificate going
active, `https://lotfoundry.net` may fail to negotiate TLS. This is unavoidable
in the Firebase custom-domain flow - the cert cannot issue until DNS points at
Firebase. `yardup-2026.web.app` keeps serving throughout, so nothing is fully
dark. Do not roll the DNS back mid-issuance; that restarts the wait.

### Verification

```bash
# Must return 200 and Server: Google Frontend - not 301, not Server: cloudflare
curl -sSI https://lotfoundry.net/

# Must return the app's robots, not Cloudflare's managed block
curl -sS https://lotfoundry.net/robots.txt

# Must return 200 with both SHA-256 fingerprints
curl -sS https://lotfoundry.net/.well-known/assetlinks.json
```

## Blocker 2 - master is 66 commits stale (OPEN, NOT gated on Blocker 1)

CI deploys only `master`. The live site is a July build, which is why
`/robots.txt` 404s and the sitemap still advertises `yardup-2026.web.app` with
a `2026-07-23` `lastmod`.

**This does not need to wait for Blocker 1.** `lib/server/checkout-origin.ts`
resolves production Stripe `success_url` / `cancel_url` to
`https://lotfoundry.net`, so while the redirect stands those returns bounce
through a 301. A 301 preserves both path and query, so `?cert=...` and
`?credits_added=1` survive and checkout returns work correctly in a browser.
The thing that genuinely breaks on a redirecting host is Digital Asset Links
verification, and that gates the **AAB build** (Blocker 3), not this deploy.

Waiting is the more expensive option: it leaves production on a July build with
a 404 `robots.txt`, no security headers, the Firestore read-before-write payment
bug, and 52 open Dependabot alerts.

After merge, CI runs verify then deploys Hosting + Functions + Firestore rules.

### Rollback target

Production has been frozen since 2026-07-23. The currently live release, and
therefore the rollback target for this deploy:

| Field | Value |
|---|---|
| Release | `sites/yardup-2026/releases/1784830700797000` |
| Version | `sites/yardup-2026/versions/0cc37cbbb4e7d19b` |
| Released | `2026-07-23T18:18:20Z` |
| By | `firebase-adminsdk-fbsvc@yardup-2026.iam.gserviceaccount.com` |

Roll back from Firebase Console -> Hosting -> release history -> "Rollback" on
that version, or re-run the deploy workflow from the previous `master` commit.
Note this only rolls back Hosting; Cloud Functions and Firestore rules are
deployed separately and need their own revert if the problem is in either.

## Blocker 3 - Google Play production release (OPEN, gated on Blockers 1-2)

Checked in and ready: `versionName 1.0.6` / `versionCode 7`, target API 36, Play
Billing wired, both upload-key and Play App Signing SHA-256 fingerprints served
from `public/.well-known/assetlinks.json`.

`versionCode 6` (1.0.5) was built locally and published 2026-08-11 without the
bump ever being committed. `PUBLISHED_VERSION_CODE` in
`native/android/scripts/validate-config.mjs` now tracks that ceiling and the
validator asserts the manifest exceeds it.

### Steps

1. **Confirm the ceiling in Play Console.** The repo cannot know whether an
   internal-track upload already consumed `versionCode 7`. If it did, raise both
   `twa-manifest.json` and `app/build.gradle` and bump `PUBLISHED_VERSION_CODE`.
2. **Do not build until Blocker 1 verification passes.** 1.0.6 is the first
   bundle carrying the `lotfoundry.net` host.
3. **Store screenshots: manifest set is done, Play listing art is not.** This
   release changes the entire brand type system (Newsreader / Instrument Sans /
   DM Mono), so everything captured on the old fonts is stale. The three
   manifest screenshots in `public/screenshots/` were recaptured on 2026-08-26
   from the production build and are current. The separate **Play listing
   graphics still need re-export**, along with the 512x512 Play icon and
   1024x500 feature graphic.

   When re-exporting, note that `phone-studio.png` is a weak listing image:
   roughly the lower half of the frame is empty background below the demo-lot
   chips, because the Find step has no content there until an address resolves.
   It is fine as a PWA manifest screenshot but should not be used as primary
   Play listing art. Prefer a captured Earn or Check reveal, which carry the
   money figure.
4. Build the signed AAB from the protected release workspace and run
   `npm run android:validate:release`.
5. Upload to the internal track. Run device tests for purchase, restore,
   refund/revocation, and account deletion.
6. Verify the app launches **full screen** (no Custom Tab address bar). If
   browser chrome appears, Digital Asset Links verification failed - recheck
   Blocker 1.
7. Promote to production.

## Blocker 4 - GitHub Actions is not queueing runs (OPEN, blocks the deploy)

Pushes to `feature/map-quality-improvements` on 2026-08-26 between 16:15 and
16:44 UTC produced **no workflow runs at all**. PR #162's head SHA matches the
pushed commit (`5bf3acc`), so the pushes registered, but:

- `gh api repos/torralba85/YardUp/commits/5bf3acc.../check-runs` returns
  `total_count: 0`
- the newest CI run is still `df4d42d` at `2026-08-26T03:12:39Z`
- Actions is enabled (`{"enabled": true, "allowed_actions": "all"}`) and the CI
  workflow is `active`; the repo is not archived or disabled

### Likely cause: exhausted Actions minutes

The repo is **private**, so Actions minutes are metered. The `Dependabot
Updates` workflow has been hanging and being cancelled at the 24-hour platform
timeout, repeatedly:

```
2026-08-22T20:01:59Z -> 2026-08-23T20:02:02Z  cancelled  github_actions in /.
2026-08-17T00:39:04Z -> 2026-08-18T00:39:06Z  cancelled  npm_and_yarn in /functions
2026-08-17T00:39:04Z -> 2026-08-18T00:39:06Z  cancelled  npm_and_yarn in /.
...
```

61 such runs appear in the last 100 workflow runs, each burning ~1,440 minutes.
That is far beyond any Free or Pro monthly allowance and is the most plausible
reason new runs are refused.

### To confirm and fix

1. Check <https://github.com/settings/billing/summary> for Actions usage and
   whether the spending limit is reached. (`gh` cannot read this without the
   `user` scope: `gh auth refresh -h github.com -s user`.)
2. Raise the spending limit, or wait for the monthly reset, or make the repo
   public (Actions minutes are free for public repos).
3. **Fix the runaway independently of the release.** These runs are not doing
   useful work - they hang for 24h and get killed. Options: disable Dependabot
   version updates in `.github/dependabot.yml`, reduce their schedule, or
   investigate why the job never completes. Left alone this will exhaust the
   allowance again next cycle.

### If you must deploy from a developer machine

Done once on 2026-08-26 while Actions was unavailable. **`.env.local` must be
moved aside first**, not merely overridden.

Next loads `.env.production.local` *and* `.env.local` for a production build, so
any key present only in `.env.local` is still inlined. This repo's `.env.local`
carries `NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN`, and a build made with it in
place **baked that token into a public static chunk** - verified by grepping the
token value out of `.next/static/chunks/` and `dist/`. Shipping it would hand
every visitor a token that bypasses App Check enforcement, which `CLAUDE.md`
explicitly forbids.

CI never hits this because a CI checkout has no `.env.local` at all.

Safe procedure:

```bash
mv .env.local .env.local.disabled-for-release
# .env.production.local should contain ONLY:
#   NEXT_PUBLIC_APP_URL=https://lotfoundry.net
#   NEXT_PUBLIC_GOOGLE_PLACES_KEY=<browser Places key>
npm run build:firebase
# confirm the build line reads: "Environments: .env.production.local"
# confirm the debug token is absent:
grep -rl "<token value>" .next/static/ dist/ || echo CLEAN
npm run deploy
mv .env.local.disabled-for-release .env.local   # restore afterwards
```

The Places key can be read without pasting secrets around:

```bash
gcloud services api-keys get-key-string 6c62509e-eada-4a6c-8400-e186856b9ea3 \
  --project=yardup-2026 --format="value(keyString)"
```

`functions/.env` should mirror what production already has
(`ENABLE_NATIVE_STORE_VERIFICATION=""`) so the deploy does not silently flip
native store verification.

One benign match remains: `localhost:3000` appears in a Remotion vendor chunk as
an SSR fallback for `new URL()`. It is library code, present in CI builds too.

### Why CI is still the right default

A developer-machine deploy has three failure modes CI cannot hit, and two of
them are silent:

- `.env.local` sets `NEXT_PUBLIC_APP_URL=http://localhost:3000`. `NEXT_PUBLIC_*`
  is inlined at build time, so a careless build bakes `localhost:3000` into the
  sitemap, robots, and Stripe return URLs.
- `.env.local` also carries the App Check debug token, which lands in a public
  static chunk. Nothing in the build warns about it.
- `NEXT_PUBLIC_GOOGLE_PLACES_KEY` has no checked-in fallback, so a build without
  it ships with address autocomplete quietly broken.

CI writes `.env.production.local` from secrets into a checkout that has no
`.env.local`, which is why it avoids all three by construction. Restore Actions
and go back to deploying through it.

**Worth adding:** a release guard that fails the build when
`NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN` is set and `NODE_ENV=production`.
`scripts/validate-public-repo.mjs` is the natural home. Today the only thing
standing between a dev-machine deploy and a leaked App Check bypass is
remembering to move one file.

## Remaining owner-only gates

These need console or business access and are not code-resolvable:

- Play Console: version ceiling, AAB upload, track promotion, Data Safety form
- Stripe Dashboard: live webhook endpoint on `/api/stripe/webhook`,
  `checkout.session.completed` enabled, signing secret matching
  `STRIPE_WEBHOOK_SECRET`, one live-mode test per product
- Google Cloud: confirm the browser Places key restriction and that the server
  key has Maps Static + Geocoding + Places without an invalid referrer restriction
- Firebase: run `FIREBASE_SMOKE_EMAIL=... FIREBASE_SMOKE_PASSWORD=... npm run smoke:firebase`
  with a dedicated smoke user
- Legal: counsel review of financial estimates, AI concepts, lead resale/refunds,
  and marketplace retention policy
- Support: `/help` as the Play support URL, `/delete-account` as the Play data
  deletion URL - both must be live on `lotfoundry.net` before submission

## Post-deploy smoke

Run against `https://lotfoundry.net` once Blockers 1-2 are cleared:

```bash
for p in / /studio /about /help /feedback /privacy /terms /delete-account \
         /login /signup /robots.txt /sitemap.xml /manifest.json \
         /.well-known/assetlinks.json; do
  printf '%-40s %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' "https://lotfoundry.net$p")"
done
```

Every path must return 200. `robots.txt` must be the app's own rules, and
`sitemap.xml` must list `https://lotfoundry.net` URLs - not `yardup-2026.web.app`.
