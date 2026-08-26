# Release Handoff - Web Production + Google Play

**Date:** 2026-08-26
**Branch:** `feature/map-quality-improvements` @ `5711b34`
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
| Unit | `npm run test` | pass |
| Types | `npx tsc --noEmit` | pass |
| Build | `npm run build` | pass |
| E2E | `npm run test:e2e` | 82 passed, 14 skipped, 0 failed |
| Secrets | `npm run repo:public-check` | pass (595 files) |
| Android config | `npm run android:validate` | pass |
| Audit (root) | `npm audit` | 0 vulnerabilities |
| Audit (functions) | `cd functions && npm audit` | 0 vulnerabilities |

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
records on Cloudflare proxy IPs (`172.67.205.175`, `104.21.93.56`). A Firebase
verification TXT record (`hosting-site=yardup-2026`) is already present, so
custom-domain setup was at least started.

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

1. **Cloudflare dashboard -> lotfoundry.net -> Rules.** Find and delete the rule
   redirecting to `yardup-2026.web.app`. Check **Redirect Rules**, **Page
   Rules**, and **Bulk Redirects** - it may be in any of the three.
2. **Firebase Console -> Hosting -> `yardup-2026`.** Confirm `lotfoundry.net`
   and `www.lotfoundry.net` are added as custom domains. If not, add them.
3. **Cloudflare DNS.** Replace the apex `A` records with the exact records
   Firebase Console displays for the domain, and set them to **DNS only (grey
   cloud)**, not proxied. Do the same for `www`. Use the values Firebase shows -
   do not copy IPs from elsewhere, they differ per site.
4. Wait for Firebase to report the certificate as active (can take up to 24h,
   usually much less).

### Verification

```bash
# Must return 200 and Server: Google Frontend - not 301, not Server: cloudflare
curl -sSI https://lotfoundry.net/

# Must return the app's robots, not Cloudflare's managed block
curl -sS https://lotfoundry.net/robots.txt

# Must return 200 with both SHA-256 fingerprints
curl -sS https://lotfoundry.net/.well-known/assetlinks.json
```

## Blocker 2 - master is 66 commits stale (OPEN, gated on Blocker 1)

CI deploys only `master`. The live site is a July build, which is why
`/robots.txt` 404s and the sitemap still advertises `yardup-2026.web.app` with
a `2026-07-23` `lastmod`.

**Order matters.** `lib/server/checkout-origin.ts` resolves production Stripe
`success_url` / `cancel_url` to `https://lotfoundry.net`. Deploying before
Blocker 1 is fixed means every checkout return bounces through a 301 - tolerable
in a browser, but it breaks TWA full-screen. Fix Cloudflare first, then merge.

After merge, CI runs verify then deploys Hosting + Functions + Firestore rules.
Capture the run ID, Firebase revisions, and the previous revision as rollback
target.

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
3. **Recapture store screenshots.** This release changes the entire brand type
   system (Newsreader / Instrument Sans / DM Mono). Every checked-in screenshot
   in `public/screenshots/` and every Play listing graphic was captured from the
   previous fonts and is now stale. Regenerate with
   `node scripts/capture-store-screenshots.mjs`, then re-export listing
   graphics.
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
