# Studio email links

The free inline card appears after a real parcel resolves, on desktop Feasibility, mobile Earn, and beside the Certificate estimate. It is hidden for demo/estimated parcels and addresses already saved or purchased by the current user. A separate unchecked marketing option is independent of the requested transactional email and analytics consent.

## Delivery queue and Resend transport

`POST /api/studio/email-scenario-link` validates the request, generates an unguessable 192-bit layout token, persists an Admin-only `studioScenarioLeads` document in Firestore, and only then dispatches the transactional email via Resend from `support@lotfoundry.net`, so an emailed link never points at an unsaved layout. A failed snapshot write returns 503 and sends nothing.

- **Domain:** `lotfoundry.net` verified on Resend (us-east-1). DNS records in Cloudflare: DKIM (`resend._domainkey`), SPF (`send.lotfoundry.net`), and CNAME (`rsend.lotfoundry.net` unproxied). Google Workspace MX records on the apex remain untouched.
- **Outbound Sender:** `LotFoundry <support@lotfoundry.net>`, with reply-to `support@lotfoundry.net`.
- **Secret:** `RESEND_API_KEY` (restricted sending-only API key stored in Google Cloud Secret Manager for `yardup-2026` and `.env.local`, bound to `exports.api` in `functions/index.js`).
- **Delivery status:** The record is created with `emailDeliveryStatus: "queued_firestore"`. When Resend accepts the message, the route updates it to `emailDeliveryStatus: "sent_resend"` with the `resendId`; if only that follow-up update fails, the request still succeeds because the email went out and the snapshot is saved. If the provider is unavailable, unconfigured, or errors, the record stays `queued_firestore` and the route returns `{ ok: true, delivery: "queued", scenarioUrl }` with a copy link fallback.
- **Send:** `dispatchScenarioEmail` sends the message the route already rendered and saved, with an 8 s timeout (`AbortSignal.timeout`) and a Resend idempotency key. The `X-Entity-Ref-ID` header and the idempotency key carry a SHA-256 reference to the lead token, never the token itself.
- **UI:** In `EmailScenarioLinkCard.tsx`, `delivery === "sent"` renders "Sent! Check your inbox for your 3D lot link (plus a quick-copy link button below)." `"queued"` renders "Saved! We couldn't email it right now, so copy your 3D lot link below to keep it." No worker replays queued records, so the copy does not promise a later email.

## Abuse protection

The route sends real email to an address the visitor types, so it must not work as an open relay for support@lotfoundry.net. `Origin` can be forged and the per-client key comes from forwarding headers a script can rotate, so those checks alone are not enough.

- **App Check:** the card asks `lib/app-check-token.ts` for a fresh limited-use App Check token (reCAPTCHA Enterprise) and sends it as `X-Firebase-AppCheck`. `lib/server/app-check.ts` verifies it with `consume: true`, so each token proves one real browser request and cannot be replayed. Consuming calls the App Check API as the `api` function's service account (`166268911022-compute@developer.gserviceaccount.com`), which needs `roles/firebaseappcheck.tokenVerifier`. Without that role the signature-verified token is still accepted and the gap is logged as `[app-check] replay protection unavailable`. A missing, invalid or already-used token gets 403 before any quota or write; an App Check outage gets 503 with `Retry-After: 60`. `LOTFOUNDRY_ALLOW_PUBLIC_API=true` skips the check outside production only.
- **Recipient cap:** besides 2 per client/hour and 30 globally/hour, each recipient address gets at most 3 layout emails per 24 hours. The quota document is keyed by a SHA-256 hash of the address.
- **Printed text:** the parcel address (≤ 120 characters), city (≤ 80) and rent basis line (≤ 160, which quotes the client's market area label) must be single-line text with no `<>`, links, bare domains or `@`. Anything else is a 400, so the email cannot carry someone else's message. HTML escaping stays as a second layer.

## Snapshot and privacy

The URL uses the existing v2 design serializer on `https://lotfoundry.net/studio`, adds an unguessable 192-bit `layout` token and the requested UTM values, and never contains an email or street address. The stored `scenarioSnapshot` is bounded JSON text, preserving GeoJSON without Firestore's unsupported nested arrays. It retains the real parcel, placement/rotation, dimensions, roof, finish, openings and complete financial assumptions. The read API returns only a freshly validated design, stripping private and paid fields. It does not grant a Certificate entitlement. Links remain resumable until the record is deleted; do not set a TTL on these records while promising permanent links. A holder of the bearer link can see the address and design, as disclosed in the form/email/privacy policy. Delete the lead record to revoke a link and erase its stored recipient/queue payload on a verified support request.

Firestore rules deny all direct client access to `studioScenarioLeads`; only Admin writes and the projected read API are allowed. POST validation enforces a real parcel, a parsed exact canonical URL origin (localhost only outside production), same-site submission, bounded request/design validation, honeypot, a consumed App Check token and shared fail-closed quotas (2 per client/hour, 3 per recipient/day, 30 globally/hour). Numeric email metadata is recomputed using the current feasibility model, not trusted from client summary fields. Requesting the link means consent to that transactional delivery; marketing requires its independent opt-in. Analytics use the existing consent-aware wrapper/initialization queue with bounded boolean/category fields, never email/address/token.

Financial figures are planning estimates and carry their existing source basis. Rent is called illustrative when market data is unverified; it is not unconditionally labeled HUD. The strict `sqft < 750` flag describes size, not a finding that all fees are waived. California wording is limited to CA parcels and discloses other fees/program exceptions. Source checked 2026-10-16: https://www.sandiego.gov/planning/work/public-spaces/faq .

## Release checks

- Ship Hosting/Functions and Firestore rules together through normal master CI after PR approval. The existing proxy matcher excludes both new `/api/studio/*` endpoints; Firebase `/api/**` rewrites cover them without changes.
- Unit/integration coverage verifies validation, queue persistence, privacy projection, strict size threshold, card pending/success/error/copy states, optional marketing, consent-aware analytics, signup prefill and snapshot restore.
- After deployment, send one layout to an owner-approved inbox from the live Studio and confirm it arrives in the inbox (not spam), from support@lotfoundry.net, with a working link. Reopen the link in a fresh browser and confirm the exact lot and design without another guest lookup. A request without an App Check token must get 403. Do not claim inbox delivery from Resend acceptance alone.
