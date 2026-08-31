# Cloudflare + DNS for lotfoundry.net

**Last verified: 2026-08-31** (live `curl` and DNS-over-HTTPS checks from CI).

The zone is on Cloudflare (`dion.ns.cloudflare.com`, `zita.ns.cloudflare.com`)
and the site is served by Firebase Hosting (`yardup-2026`). The intended shape
is **Cloudflare for DNS only** — every record that serves the app is grey-cloud
(DNS only) so Firebase terminates TLS and serves its own responses, with no
Cloudflare rules or managed content in the path.

The apex now matches that shape. `www` does not.

## Current state

| Host | Resolves to | Proxy | Serves | Status |
|---|---|---|---|---|
| `lotfoundry.net` | `199.36.158.100` | DNS only | Firebase (`Server: Google Frontend`), HTTP 200 | Correct |
| `www.lotfoundry.net` | `172.67.205.175`, `104.21.93.56` | Proxied | Cloudflare 301 to `yardup-2026.web.app` | **Broken** |

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

## Open issue: `www` is still proxied and still redirects off-domain

Three separate things are wrong, and fixing the DNS alone does not fix all of
them.

**1. The redirect rule still fires.** It preserves the path, so it is the same
Cloudflare rule the handoff documented:

```
$ curl -sSI https://www.lotfoundry.net/studio
HTTP/2 301
location: https://yardup-2026.web.app/studio
server: cloudflare
```

Anyone who types `www` lands on the non-canonical `web.app` host. That host
serves the same app (HTTP 200), so this is duplicate content on a domain the
sitemap does not list.

**2. Cloudflare's Managed Content `robots.txt` is enabled zone-wide.** On `www`
it shadows the app's own robots route — note that it wins even over the
redirect rule, which is why `/robots.txt` returns 200 while every other path
301s:

```
$ curl -sS https://www.lotfoundry.net/robots.txt
User-agent: *
Content-Signal: search=yes,ai-train=no,use=reference
...
User-agent: ClaudeBot
Disallow: /
# END Cloudflare Managed Content
```

It blocks nine AI crawlers (`Amazonbot`, `Applebot-Extended`, `Bytespider`,
`CCBot`, `ClaudeBot`, `CloudflareBrowserRenderingCrawler`, `Google-Extended`,
`GPTBot`, `meta-externalagent`). The apex escapes it only because the apex is
grey-clouded. **This is a latent trap:** re-proxying the apex for any reason
silently reinstates this block over `app/robots.ts`.

**3. `www` is probably not a registered Firebase custom domain.** The handoff
recorded exactly one custom domain (`lotfoundry.net`) on the Hosting API. This
could not be re-verified from CI, because outbound requests go through a proxy
that does its own DNS and ignores `curl --resolve`. **Check before changing
DNS** — pointing `www` at Firebase for an unregistered host serves a "Site Not
Found" page, which is worse than the current redirect:

```bash
TOKEN=$(gcloud auth print-access-token)
curl -sS -H "Authorization: Bearer $TOKEN" \
  -H "X-Goog-User-Project: yardup-2026" \
  "https://firebasehosting.googleapis.com/v1beta1/projects/yardup-2026/sites/yardup-2026/customDomains"
```

### Why this is worth fixing now

Beyond SEO, it splits analytics. `NEXT_PUBLIC_GA_MEASUREMENT_ID` measures one
GA4 property; a visitor who arrives on `www` is bounced to `yardup-2026.web.app`
and is recorded under that hostname instead of `lotfoundry.net`, so sessions
land in the wrong place and the referral chain is broken by the cross-domain
301. It also still blocks the Play release: Android does not follow a
cross-origin redirect when verifying Digital Asset Links, so a TWA built
against `www` launches with Custom Tab chrome (see `native/android/README.md`).

## Fix

### Option A — serve `www` from Firebase (recommended)

Matches what was already done for the apex and removes every Cloudflare moving
part. Do the steps in this order; reversing 1 and 2 causes a "Site Not Found"
window.

1. **Firebase Console -> Hosting -> Add custom domain -> `www.lotfoundry.net`.**
   Choose the redirect option so `www` 301s to the apex; the apex stays
   canonical. Note the A record value Firebase returns (usually
   `199.36.158.100`) and complete any TXT verification it asks for.
2. **Cloudflare -> DNS -> Records.** Delete the two proxied `www` A records
   (`172.67.205.175`, `104.21.93.56`) and add the A record from step 1, set to
   **DNS only (grey cloud)**.
3. **Cloudflare -> Rules.** Delete the rule redirecting to
   `yardup-2026.web.app`. Check **Redirect Rules**, **Page Rules**, and **Bulk
   Redirects** — it may be in any of the three. Grey-clouding already
   neutralizes it (rules run only on proxied traffic), but leaving it is a trap
   if the proxy is ever re-enabled.
4. **Cloudflare -> turn off Managed Content / the AI-crawler robots feature**
   for the zone, so it cannot shadow `app/robots.ts` on any host. This is the
   step that protects the apex from a future re-proxy.
5. **Firebase Console -> Authentication -> Settings -> Authorized domains.**
   Confirm `lotfoundry.net` is listed, and add `www.lotfoundry.net` if it will
   ever render the app rather than redirect.
6. Wait for the `www` certificate to reach `CERT_ACTIVE` (usually minutes;
   Firebase allows 24h). Expect `https://www.lotfoundry.net` to fail TLS in the
   gap between the DNS change and issuance — that is normal, and the apex keeps
   serving throughout. Do not roll the DNS back mid-issuance; it restarts the
   wait.

### Option B — stopgap, keep `www` on Cloudflare

If the Firebase step cannot happen now, retarget the existing redirect rule
from `https://yardup-2026.web.app` to `https://lotfoundry.net`, preserving path
and query. That is a one-field change and unbreaks `www` immediately.

It does not fix issue 2: `www/robots.txt` keeps serving Cloudflare's managed
block, and the rule remains a moving part outside Firebase. Treat it as a
stopgap, not the destination.

## Verification

After either option:

```bash
# www must reach the canonical apex, not web.app
curl -sSI https://www.lotfoundry.net/studio

# Apex must stay 200 from Google Frontend - not 301, not Server: cloudflare
curl -sSI https://lotfoundry.net/

# Must be the app's robots, with no "Cloudflare Managed Content" marker
curl -sS https://lotfoundry.net/robots.txt
curl -sS https://www.lotfoundry.net/robots.txt

# Must return 200 with both SHA-256 fingerprints
curl -sS https://lotfoundry.net/.well-known/assetlinks.json
```

DNS, without needing `dig`:

```bash
curl -sS -H "accept: application/dns-json" \
  "https://dns.google/resolve?name=www.lotfoundry.net&type=A"
```

`www` must resolve to the Firebase IP under Option A. Under either option the
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
