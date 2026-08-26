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

All run locally against `5711b34`:

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
- **`/robots.txt` is not broken in code.** It 404s in production only because
  the live deployment is a July build. The current build prerenders it
  correctly - verified by serving `.next/standalone/server.js` directly and
  receiving a 200 with the expected body.
- **`NEXT_PUBLIC_APP_URL` does not need a CI secret.** `.github/workflows/ci.yml`
  never sets it, and both `app/robots.ts` / `app/sitemap.ts` and
  `lib/server/checkout-origin.ts` already default to `https://lotfoundry.net`
  in production. Deploying current code flips the canonical host automatically.

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
