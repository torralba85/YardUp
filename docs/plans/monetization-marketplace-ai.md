# Plan: Monetization, Builder Dashboard v2, AI Photo-to-ADU

Status: DRAFT — under /plan-design-review
Date: 2026-06-12
Branch target: feature branch off `master`

## Goal

Turn LotFoundry's free feasibility funnel into revenue without breaking the
viral loop. Three workstreams:

1. **Stripe monetization** — builders pay per lead. Homeowner side stays
   100% free (report, certificate, sharing). No Stripe Connect; plain
   Stripe Checkout + webhooks + Billing customer portal.
2. **Builder dashboard v2** — extend the existing marketplace v1
   (`components/builder/`, `lib/marketplace-types.ts`) into a dashboard
   builders log into daily: lead inbox, lead unlock (paid), profile and
   service-area management, billing history.
3. **AI photo-to-ADU style match** — in the design studio, homeowners
   upload a photo of their own house; AI generates an ADU concept rendered
   in the same architectural style. Output joins the report/certificate.

## Revenue Model (decided 2026-06-12)

- **Builder pays per lead.** A lead = a homeowner-submitted
  `ConnectionRequest` with full feasibility snapshot (already modeled in
  `lib/marketplace-types.ts`).
- Builders see a **preview** of each matched lead (city, lot size, ADU
  config, estimated project value band) free. **Unlocking** the lead
  (homeowner contact info + full certificate snapshot) is the paid action.
- Stripe surface: Checkout for unlock purchases, webhook to grant access,
  Stripe customer portal for receipts. No payouts, no Connect.
- Homeowner side: free forever in this phase. AI renders included free
  (drives report quality, which drives lead value).

## Feature 1: Stripe Lead Unlock

- New `lib/stripe.ts` + `/api/stripe/checkout` + `/api/stripe/webhook`.
- Firestore: `leadUnlocks` collection (builderId, connectionRequestId,
  stripeSessionId, status, amount, createdAt).
- Unlock price: single price point to start (TBD in review).
- UI: unlock CTA on lead preview card; post-payment the card flips to the
  full certificate snapshot + contact block.

## Feature 2: Builder Dashboard v2

- Extends `BuilderDashboard.tsx` / `BuilderInbox.tsx` / `BuilderProfileForm.tsx`.
- Sections: Lead inbox (new / unlocked / archived), profile & service
  areas, billing history.
- Lead statuses already modeled: `new` / `interested` / `not-a-fit`.

## Feature 3: AI Photo-to-ADU Style Match

- Entry point: design studio (likely `InspirationGalleryPanel` or a new
  panel).
- Flow: upload photo of homeowner's house → AI generates ADU concept in
  matching style → result appears in studio and can be attached to the
  report/certificate.
- Generation backend: image model via API (provider TBD — out of design
  review scope; design assumes 20–60s async generation).

## Information Architecture (decided 2026-06-12, Pass 1)

Approved wireframes: `~/.gstack/projects/torralba85-YardUp/designs/builder-dashboard-20260612/`
(builder-dashboard.png · ai-style-match.png · lead-unlock.png + matching .html sources)

### Builder dashboard — first viewport

```
+----------+--------------------------------------------------------------+
| MAHOGANY |  ESPRESSO MONEY BAND                                         |
| SIDEBAR  |  [NEW-LEAD PIPELINE VALUE]  [spend this month]  [avg resp]   |
|          |   <- Cormorant, leads the screen (decision 2A)               |
| Lead     +----------------------------------------------+---------------+
|  inbox * |  LEAD INBOX — ledger-slip cards (decision 1A)| RIGHT RAIL    |
| Unlocked |   1. value band (Cormorant forest)           | profile       |
| Profile  |   2. location @ permitted granularity + mono | standing      |
| Billing  |   3. metrics: build est / payback / verified | service areas |
|          |   4. unlock CTA (forest) or contact block    | month ledger  |
+----------+----------------------------------------------+---------------+
```

- **Hierarchy:** (1) money band — pipeline value of NEW matched leads (sum of
  estimated build-value bands; derivation added to snapshot), (2) NEW leads
  with unlock CTAs, (3) unlocked/working leads, (4) archived. Profile +
  billing live in the sidebar, never compete with the inbox.
- **Decision 1A — ledger-slip cards, not a table.** Cards earn existence:
  the unlock decision is per-lead, and each card carries trust scaffolding
  (freshness, owner-message excerpt, match reason) a table row cannot hold.
  Constraint: cards stay instrument-grade — sharp corners, mono facts, no
  shadows, no hover-lift. Revisit a table view if builders exceed ~10
  leads/week (record as TODO, not drift).
- **Card hierarchy (B2):** value band first (Cormorant 600, forest — green
  means it pays you), location + ADU config in mono second, metrics third,
  CTA last. Serial `NO. LF-{APN}` + `RECORDED {date}` as the mono eyebrow.

### Unlock surface (decision 3A)

Centered **unlock slip** over an espresso scrim — a stamped paper instrument
echoing the Certificate of Feasibility: double-rule serial header, lot recap,
what-you-get list, ledger T-account ("THIS PURCHASE … DUE NOW"), forest
"Pay with Stripe" CTA, bad-lead-credit reassurance block. Esc/close returns
to the inbox with no state change.

### AI Style Match placement (decision 4C — hybrid)

- **Entry:** instrument-grade upload affordance pinned at the TOP of the
  inspiration rail ("YOUR HOUSE → YOUR ADU", 1.5px espresso border) — always
  visible, never buried in the gallery scroll.
- **Result:** opens a focused **before/after drafting board** overlay —
  homeowner photo left, generated ADU concept right, mono metadata rail
  (style match %, traits), actions below (Add to certificate · Recast).
  The 3D parcel scene keeps the studio canvas at all other times.
- Generated concepts also insert as the first gallery card with a
  `STYLE-MATCHED` mono chip, reusing the existing Apply flow.

## What already exists (reuse, don't reinvent)

- Marketplace v1 data model: `BuilderProfile`, `ConnectionRequest` (with
  parcel + financials snapshot), `BuilderResponse` — `lib/marketplace-types.ts`
- `app/builder/page.tsx`, `BuilderDashboard`, `BuilderInbox`,
  `BuilderProfileForm`
- Studio: `InspirationGalleryPanel`, `ReportPreview`, money band,
  `use-count-up` / `use-motion-number`
- Auth: Firebase auth with login/signup routes
- DESIGN.md v2: warm foundry palette, Cormorant money figures, IBM Plex
  Mono data layer, certificate instrument, mahogany sidebar, sharp corners

## NOT in scope

- Stripe Connect / payouts to builders — no money flows through us to
  builders in this phase.
- Homeowner-side payments of any kind — protects the certificate viral loop.
- Builder subscription tiers — revisit after per-lead volume proves out.
- AI provider selection / prompt engineering — engineering concern; design
  assumes async generation with 20–60s latency and a failure rate.
- Native mobile apps.

## Open design decisions

(Tracked by /plan-design-review — resolved items move into the sections above.)
