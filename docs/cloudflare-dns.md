# Cloudflare + DNS for lotfoundry.net

**Last verified: 2026-11-09** (live browser checks; the apex details below were last confirmed with `curl` and DNS-over-HTTPS from CI on 2026-08-31).

The zone is on Cloudflare (`dion.ns.cloudflare.com`, `zita.ns.cloudflare.com`)
and the site is served by Firebase Hosting (`yardup-2026`). The intended shape
is **Cloudflare for DNS only** — every record that serves the app is grey-cloud
(DNS only) so Firebase terminates TLS and serves its own responses, with no
Cloudflare rules or managed content in the path.

The apex matches that shape. `www` no longer redirects off-domain (see
[`www` redirect: resolved](#www-redirect-resolved)); two dormant Cloudflare
settings may remain.

## Current state

| Host | Resolves to | Proxy | Serves | Status |
|---|---|---|---|---|
| `lotfoundry.net` | `199.36.158.100` | DNS only | Firebase (`Server: Google Frontend`), HTTP 200 | Correct |
| `www.lotfoundry.net` | Not re-checked (DNS-over-HTTPS unavailable from the 2026-11-09 check) | Not re-checked | Lands on `lotfoundry.net`, path preserved | Correct |

Supporting records are intact and must be left alone: `MX` (Google Workspace),
`TXT` for `hosting-site=yardup-2026`, both `google-site-verification` values,
SPF, DKIM (`google._domainkey`), and `_dmarc`.

### What is verified working on the apex

```
$ curl -sSI https://lotfoundry.net/
HTTP/2 200
server: Google Frontend
strict-transport-security: max-age=31556926
```

TLS is valid (no `-k` needed), so the Firebase certificate has issued —
`cert.state` has moved past the `CERT_VALIDATING` recorded in
`docs/release-handoff-2026-08-26.md`. `/robots.txt` serves the app's own file,
`/sitemap.xml` advertises `lotfoundry.net`, and `/.well-known/assetlinks.json`
returns 200. Blocker 1 of that handoff is resolved **for the apex only**.

## `auth.lotfoundry.net` (Firebase Auth handler)

Firebase Auth's `authDomain` is `auth.lotfoundry.net` (`lib/firebase.ts`, the
production env in `.github/workflows/ci.yml`). It must not be the apex: the
Android app (`native/android`) claims every `https://lotfoundry.net` URL as a
verified app link, so Google's or Apple's return to the apex's
`/__/auth/handler` can open outside the tab that started sign-in and fail with
"missing initial state". It must not be `yardup-2026.firebaseapp.com` either:
that is cross-site, so Chrome partitions the helper iframe's storage. A
lotfoundry.net subdomain is same-site and unclaimed.

Setup, all required before a build with this `authDomain` ships:

1. Firebase Console -> Hosting -> `yardup-2026` -> Add custom domain
   `auth.lotfoundry.net` (no redirect). Add the records it gives in Cloudflare
   as **DNS only** (grey cloud) and wait for the certificate.
2. Firebase Console -> Authentication -> Settings -> Authorized domains: add
   `auth.lotfoundry.net`.
3. Google Cloud Console -> APIs & Services -> Credentials -> the web OAuth
   client: add `https://auth.lotfoundry.net/__/auth/handler` to Authorized
   redirect URIs (and `https://auth.lotfoundry.net` to JavaScript origins).
4. Apple Developer -> the Sign in with Apple Services ID: add
   `auth.lotfoundry.net` to Domains and
   `https://auth.lotfoundry.net/__/auth/handler` to Return URLs. (Not done yet:
   no Apple Developer membership, so the web hides Apple sign-in until
   `NEXT_PUBLIC_APPLE_SIGN_IN=true`.)

Verify: `curl -sSI https://auth.lotfoundry.net/__/auth/handler` answers 200
from `Google Frontend`. Other paths on the host 301 to the apex (`proxy.ts`).
`npm run smoke:google-sign-in` checks DNS, the handler, `init.json` and the
Google OAuth redirect URI together; the Signup Canary runs it after every
production deploy (`docs/deployment.md`).

## `www` redirect: resolved

Until at least 2026-08-31, `www` was proxied through Cloudflare and a Cloudflare
rule 301'd every path to `yardup-2026.web.app` (left over from the OpenAI Build
Week setup). Cloudflare's zone-wide Managed Content `robots.txt` also shadowed
the app's robots route on `www`, blocking nine AI crawlers.

Checked in a browser on 2026-11-09:

- `https://www.lotfoundry.net/studio` lands on `https://lotfoundry.net/studio`
  (path and query preserved). It no longer reaches `yardup-2026.web.app`.
- `https://www.lotfoundry.net/robots.txt` serves the app's own `app/robots.ts`
  output, with no `Cloudflare Managed Content` marker.
- `https://yardup-2026.web.app/...` lands on `lotfoundry.net` (`proxy.ts`).
- `https://auth.lotfoundry.net/__/auth/handler` is answered by Firebase Auth.

**Not verified from that check:** the `www` DNS records and proxy status, and
whether the `www` -> apex hop comes from a Firebase Hosting custom-domain
redirect (the intended setup) or from a retargeted Cloudflare rule. The check
could not read response headers, DNS, or the Cloudflare zone. Confirm with:

```bash
curl -sSI https://www.lotfoundry.net/studio   # want: 301 to lotfoundry.net, Server: Google Frontend
curl -sS -H "accept: application/dns-json" \
  "https://dns.google/resolve?name=www.lotfoundry.net&type=A"   # want: Firebase IP, not 172.67.* / 104.21.*
```

### Remaining cleanup (Cloudflare dashboard)

These do nothing while the serving records are grey-cloud, but each one comes
back if a record is ever re-proxied:

1. **Cloudflare -> lotfoundry.net -> Rules.** Delete any rule redirecting to
   `yardup-2026.web.app`. Check **Redirect Rules**, **Page Rules**, and **Bulk
   Redirects**. If `www` is still proxied and its redirect now comes from a
   Cloudflare rule pointed at the apex, leave that rule until `www` is moved to
   Firebase.
2. **Cloudflare -> turn off Managed Content / the AI-crawler robots feature**
   for the zone, so it cannot shadow `app/robots.ts` on any host if a record is
   re-proxied.
3. **Firebase Console -> Hosting -> custom domains.** Confirm
   `www.lotfoundry.net` is listed with a redirect to `lotfoundry.net`. If it is
   not, add it (redirect option), then point `www` at the A record it gives, as
   **DNS only**, and wait for the certificate before removing any Cloudflare
   rule.

## Verification

After any Cloudflare or Firebase Hosting change:

```bash
# www must reach the canonical apex, not web.app
curl -sSI https://www.lotfoundry.net/studio

# Apex must stay 200 from Google Frontend - not 301, not Server: cloudflare
curl -sSI https://lotfoundry.net/

# Must be the app's robots, with no "Cloudflare Managed Content" marker
curl -sS https://lotfoundry.net/robots.txt
curl -sS https://www.lotfoundry.net/robots.txt

# Must return 200 with the app's SHA-256 fingerprints
curl -sS https://lotfoundry.net/.well-known/assetlinks.json
```

DNS, without needing `dig`:

```bash
curl -sS -H "accept: application/dns-json" \
  "https://dns.google/resolve?name=www.lotfoundry.net&type=A"
```

`www` should resolve to the Firebase IP once it is served from Firebase. The
apex must stay on `199.36.158.100` and never return a `172.67.*` or `104.21.*`
Cloudflare proxy address.

## Notes

- **No CAA record exists**, which is permissive and is why Firebase certificate
  issuance succeeds. If one is ever added, it must include `pki.goog` (Firebase
  Hosting) or certificate renewal will start failing silently at expiry.
- **`_dmarc` is `p=none`** — monitoring only, with aggregate reports going to
  Cloudflare. Fine as a starting point; tightening to `quarantine` is a separate
  email-hygiene task, not a hosting one.
- The apex `Strict-Transport-Security` header has no `includeSubDomains`. Do not
  add it until `www` serves valid TLS from Firebase, or `www` becomes
  unreachable rather than merely misrouted.
