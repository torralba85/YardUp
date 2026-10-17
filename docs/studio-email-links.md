# Studio email links

The free inline card appears after a real parcel resolves, on desktop Feasibility, mobile Earn, and beside the Certificate estimate. It is hidden for demo/estimated parcels and addresses already saved or purchased by the current user. A separate unchecked marketing option is independent of the requested transactional email and analytics consent.

## Delivery queue and Resend transport

`POST /api/studio/email-scenario-link` validates the request, generates an unguessable 192-bit layout token, persists an Admin-only `studioScenarioLeads` document in Firestore, and only then dispatches the transactional email via Resend from `support@lotfoundry.net`, so an emailed link never points at an unsaved layout. A failed snapshot write returns 503 and sends nothing.

- **Domain:** `lotfoundry.net` verified on Resend (us-east-1). DNS records in Cloudflare: DKIM (`resend._domainkey`), SPF (`send.lotfoundry.net`), and CNAME (`rsend.lotfoundry.net` unproxied). Google Workspace MX records on the apex remain untouched.
- **Outbound Sender:** `LotFoundry <support@lotfoundry.net>`, with reply-to `support@lotfoundry.net`.
- **Secret:** `RESEND_API_KEY` (restricted sending-only API key stored in Google Cloud Secret Manager for `yardup-2026` and `.env.local`, bound to `exports.api` in `functions/index.js`).
- **Delivery status:** The record is created with `emailDeliveryStatus: "queued_firestore"`. When Resend accepts the message, the route updates it to `emailDeliveryStatus: "sent_resend"` with the `resendId`; if only that follow-up update fails, the request still succeeds because the email went out and the snapshot is saved. If the provider is unavailable, unconfigured, or errors, the record stays `queued_firestore` and the route returns `{ ok: true, delivery: "queued", scenarioUrl }` with a copy link fallback.
- **UI:** In `EmailScenarioLinkCard.tsx`, `delivery === "sent"` renders "Sent! Check your inbox for your 3D lot link (plus a quick-copy link button below)."

## Snapshot and privacy

The URL uses the existing v2 design serializer on `https://lotfoundry.net/studio`, adds an unguessable 192-bit `layout` token and the requested UTM values, and never contains an email or street address. The stored `scenarioSnapshot` is bounded JSON text, preserving GeoJSON without Firestore's unsupported nested arrays. It retains the real parcel, placement/rotation, dimensions, roof, finish, openings and complete financial assumptions. The read API returns only a freshly validated design, stripping private and paid fields. It does not grant a Certificate entitlement. Links remain resumable until the record is deleted; do not set a TTL on these records while promising permanent links. A holder of the bearer link can see the address and design, as disclosed in the form/email/privacy policy. Delete the lead record to revoke a link and erase its stored recipient/queue payload on a verified support request.

Firestore rules deny all direct client access to `studioScenarioLeads`; only Admin writes and the projected read API are allowed. POST validation enforces a real parcel, a parsed exact canonical URL origin (localhost only outside production), same-site submission, bounded request/design validation, honeypot and shared fail-closed quotas (2 per client/hour, 30 globally/hour). Numeric email metadata is recomputed using the current feasibility model, not trusted from client summary fields. Requesting the link means consent to that transactional delivery; marketing requires its independent opt-in. Analytics use the existing consent-aware wrapper/initialization queue with bounded boolean/category fields, never email/address/token.

Financial figures are planning estimates and carry their existing source basis. Rent is called illustrative when market data is unverified; it is not unconditionally labeled HUD. The strict `sqft < 750` flag describes size, not a finding that all fees are waived. California wording is limited to CA parcels and discloses other fees/program exceptions. Source checked 2026-10-16: https://www.sandiego.gov/planning/work/public-spaces/faq .

## Release checks

- Ship Hosting/Functions and Firestore rules together through normal master CI after PR approval. The existing proxy matcher excludes both new `/api/studio/*` endpoints; Firebase `/api/**` rewrites cover them without changes.
- Unit/integration coverage verifies validation, queue persistence, privacy projection, strict size threshold, card pending/success/error/copy states, optional marketing, consent-aware analytics, signup prefill and snapshot restore.
- After deployment, test one owner-approved recipient via the configured delivery worker, confirm queue acceptance/delivery separately, and reopen its canonical link in a fresh browser. Confirm exact real lot and custom configuration without consuming another guest lookup. Do not claim inbox delivery from queue acceptance.
