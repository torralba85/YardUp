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
- **Price (18A):** $39–49 flat, single Stripe price object. Impulse tier —
  price for the trust we have, not the value we intend; revisit after
  win-rate data exists.
- **Exclusivity (19C):** first unlock buys a **48-hour head start** —
  other matched builders cannot unlock until the window closes. After it,
  the lead can sell to remaining matched builders; locked cards then show
  an honest `UNLOCKED BY 1 BUILDER` line + countdown until available.
  Terms stated on the unlock slip.
- **Refund policy (20A):** bad-lead **credit** (not cash) within 7 days on
  verifiable bad contact: email bounces, dead number, owner denies
  submitting. Explicitly NOT covered: owner doesn't respond / builder
  loses the bid — stated crisply on the slip. Surfaces: promise block on
  the slip + "Report this lead" action on unlocked cards. Credits appear
  in the billing ledger as `CREDITED` rows (amber mono).
- **Homeowner disclosure (22A):** one mono line at the connection form:
  "We share your report and contact info with matched builders — the
  first responder gets a 48-hour head start. Builders pay us; you never
  pay anything."

## Feature 1: Stripe Lead Unlock

- New `lib/stripe.ts` + `/api/stripe/checkout` + `/api/stripe/webhook`.
- Firestore: `leadUnlocks` collection (builderId, connectionRequestId,
  stripeSessionId, status, amount, createdAt) + `headStartUntil` on the
  connection request (19C) + credit records (20A).
- Unlock price: $39–49 flat (18A).
- UI: unlock CTA on the lead card opens the **unlock slip** (3A); after
  Checkout the card enters CONFIRMING and the contact block reveals with
  the stamp/settle motion on webhook grant (6A). Never a "card flip".

## Feature 2: Builder Dashboard v2

- Extends `BuilderDashboard.tsx` / `BuilderInbox.tsx` / `BuilderProfileForm.tsx`.
- Sections: Lead inbox (tabs filter on TRIAGE), profile & service areas,
  billing ledger.
- **Two orthogonal axes (8A):** ACCESS = `locked` / `confirming` /
  `unlocked` (card visual, derived from `leadUnlocks`); TRIAGE =
  `new` / `interested` / `not-a-fit` (the shipped `BuilderResponseStatus`).
  "Archived" is the `not-a-fit` view, NOT a stored status — no new enum
  value, no migration. Inbox tabs: New (triage=new) · Interested · Archived
  (triage=not-a-fit). Lock state never appears as a tab.

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
  (freshness, structured match reasons, value band) a table row cannot hold.
  Constraint: cards stay instrument-grade — sharp corners, mono facts, no
  shadows, no hover-lift. Revisit a table view if builders exceed ~10
  leads/week (record as TODO, not drift).
- **Card hierarchy (B2):** value band first (Cormorant 600, forest — green
  means it pays you), location + ADU config in mono second, metrics third,
  CTA last. Preview serial `NO. LF-{hash}` (9A — random internal id, NEVER
  the APN) + `RECORDED {date}` as the mono eyebrow. The real APN serial
  returns only on the unlocked Certificate of Feasibility.

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

## Interaction States (decided 2026-06-12, Pass 2)

Every state describes what the user SEES. Stamp/settle motion per DESIGN.md;
all motion guarded by `prefers-reduced-motion`.

### Paywall integrity (5A — CRITICAL)

- **Server-side withholding, non-negotiable:** `ownerContact` and the precise
  parcel address/APN NEVER reach the client until a `leadUnlocks` grant
  exists. The blur treatment on locked cards is theater over absent data,
  not a mask over present data. Firestore rules + API shape change required.
- **Free (locked) lead shows:** neighborhood + ZIP (`BALLARD · SEATTLE
  98107` in mono), lot sqft, ADU config, build-estimate band, rent band,
  payback, owner-verified badge, freshness (`SUBMITTED 2 DAYS AGO`),
  structured match reasons (`MATCHED: SERVICE AREA — SEATTLE`,
  `OWNER-VERIFIED`). Preview serial is a random `LF-{hash}`, not the APN.
- **No free-form owner text on the preview (10A):** the homeowner's typed
  message can contain a phone number or address ("I'm Maria on 24th Ave"),
  so it is NEVER excerpted onto a locked card. The full message reveals
  only after unlock. Trust scaffolding is system-generated facts only.
- **Hidden until unlock:** owner name/email/phone, street address, exact
  APN, full certificate, full owner message.

### State table

```
FEATURE            | LOADING            | EMPTY                  | ERROR                       | SUCCESS                  | PARTIAL
-------------------|--------------------|------------------------|-----------------------------|--------------------------|------------------
Lead inbox         | 3 skeleton slips,  | Zero-ever: cause line  | "Couldn't reach the ledger. | Cards settle in (80ms    | New cards settle
                   | sand-2 shimmer,    | ("You cover 2 areas"), | Retry" inline, espresso,    | stagger), NEW chips      | on top while
                   | no spinners        | "Add service areas"    | not brick (nothing broken   | amber                    | older render
                   |                    | CTA, 1 greyed EXAMPLE  | belongs to the builder)     |                          |
                   |                    | card (mono EXAMPLE     |                             |                          |
                   |                    | chip, no unlock CTA).  |                             |                          |
                   |                    | Zero-new: quiet        |                             |                          |
                   |                    | "Nothing new this      |                             |                          |
                   |                    | week" + history below  |                             |                          |
Lead unlock (6A)   | CONFIRMING: amber  | —                      | Cancel/abandon: card        | Webhook grant: stamp/    | Timeout >60s:
                   | mono "PAYMENT      |                        | reverts to locked + quiet   | settle reveal of contact | "Unlock is
                   | RECEIVED ·         |                        | "Checkout canceled — the    | block + serial receipt   | processing —
                   | RECORDING UNLOCK…" |                        | lead is still available."   | line. Idempotent: one    | we'll email you.
                   | on return from     |                        | Declines handled inside     | unlock per builder+lead; | You won't be
                   | Checkout; client   |                        | Stripe Checkout             | retry resumes same       | charged twice."
                   | polls leadUnlocks  |                        |                             | session                  | + support path
Billing ledger     | Skeleton rows      | "No unlocks recorded   | "Ledger unavailable —       | Row appends with settle  | CREDITED rows in
(10A)              | (mono widths)      | yet." + link to        | receipts still available    |                          | amber mono
                   |                    | example lead           | in the Stripe portal"       |                          | (refund/credit)
Photo upload (9A)  | Upload progress    | Drop zone (wireframe   | Per-cause copy: wrong type, | Preview step: "Use this  | —
                   | bar (separate from | state 1)               | too large post-downscale,   | photo / Choose another"  |
                   | generation)        |                        | connection lost + resume    | (doubles as consent      |
                   |                    |                        |                             | moment)                  |
AI generation      | Step list + bar    | —                      | "The cast didn't take" +    | Result settles into      | Homeowner keeps
                   | "CASTING CONCEPT · |                        | top-2 fixable reasons +     | before/after board;      | using studio
                   | ~45s", non-        |                        | free unlimited retry.       | gallery card inserts     | while casting;
                   | blocking           |                        | Timeout >90s = failed, with | with STYLE-MATCHED chip  | subtle studio
                   |                    |                        | apology, never infinite     |                          | notification on
                   |                    |                        | wait. "Your photo was not   |                          | completion
                   |                    |                        | stored" trust line          |                          |
Builder profile    | —                  | New builder: form with | Field-level validation,     | Save = stamp/settle on   | Completeness
                   |                    | completeness meter at  | inline                      | the section              | meter (72%) +
                   |                    | 0%, explains matching  |                             |                          | ADD items in
                   |                    |                        |                             |                          | amber
```

### Status taxonomy (8A — two orthogonal axes)

- **ACCESS** (payment): `locked` / `confirming` / `unlocked` — visual state
  on the card, never a filter tab.
- **TRIAGE** (builder opinion): `new` / `interested` / `not-a-fit` (→
  archived view) — matches shipped `BuilderResponseStatus`; inbox tabs
  filter on this axis only.
- "Not a fit" on a LOCKED lead = free dismissal, logged as matching
  feedback to improve lead routing.

## User Journeys (decided 2026-06-12, Pass 3)

### Builder: the first $49

```
STEP | BUILDER DOES              | FEELS                       | PLAN SUPPORTS IT WITH
-----|---------------------------|-----------------------------|--------------------------------------------
1    | Opens dashboard           | "Is this worth my time?"    | Money band: pipeline value of NEW leads
2    | Scans a locked lead       | Skeptical — burned by       | Freshness, structured match reasons,
     |                           | lead vendors before         | owner-verified badge, value band — all free
3    | Clicks Unlock             | "What exactly am I buying?" | Slip: exact field list, lot recap, ledger
     |                           |                             | price, bad-lead credit, exclusivity terms
4    | Pays in Stripe Checkout   | Committed, slightly anxious | Stripe trust line; idempotent session
5    | Returns to dashboard      | "Did it work?"              | CONFIRMING state — never a locked card
6    | Contact reveals           | Paid off                    | Stamp/settle reveal; receipt in ledger
7    | Calls the homeowner       | Moment of truth             | Lead freshness + verified contact = answered
```

5-sec visceral: the money band says the inbox is worth opening. 5-min
behavioral: preview→slip→confirming is friction-free. 5-yr reflective: the
ledger of unlocks vs. won projects is the retention story.

### Homeowner: photo of their own house

```
STEP | HOMEOWNER DOES            | FEELS                       | PLAN SUPPORTS IT WITH
-----|---------------------------|-----------------------------|--------------------------------------------
1    | Sees "YOUR HOUSE → YOUR   | Curious, slightly protective| Instrument-grade affordance, not a gimmick
     | ADU" in the rail          | ("my house?")               |
2    | Picks a photo             | Hesitant — where does       | Mono trust line (11A): "Used only to match
     |                           | this go?                    | your ADU's style. Never shown to builders.
     |                           |                             | Delete anytime."
3    | Confirms preview          | In control                  | 9A preview step = consent moment
4    | Waits 20–60s              | Anticipation (or doubt)     | Step list + estimate, non-blocking; keeps
     |                           |                             | using the studio (partial state)
5    | Before/after board opens  | The magic moment            | 4C drafting board: their house ↔ their ADU
6    | Judges the render         | Delight or "not quite me"   | STYLE CONCEPT chip + "Cast another" as a
     |                           |                             | normal action (11A) — iteration is expected
7    | Adds to certificate       | Pride, ownership            | 12A opt-in attach, stamp/settle commit —
     |                           |                             | never auto-attach; certificate stays curated
```

## Design Conformance & Anti-Slop (decided 2026-06-12, Passes 4–5)

- **13A — Conform while extending.** Builder-surface and inspiration
  components are brought to DESIGN.md v2 *as part of this work, not after*:
  `rounded-*` → sharp (chips stay pill), `bg-gradient-to-t` → solid scrim,
  mono floor 9–10px → 11px. Applies to `BuilderInbox`, `BuilderDashboard`,
  `BuilderProfileForm`, `InspirationGalleryPanel`.
- **Copy rule:** "Unlock lead" (verb on a thing) is fine; the aspirational
  construction ("Unlock your property potential / your backyard's
  potential") stays banned everywhere, including marketing for this feature.
- **Iconography:** no unicode glyphs as UI icons (`⌂`, `⚠` in wireframes are
  placeholders) — drawn 1px hairline icons in the plat-map linework style.
- **14A — BLOCKING PREREQUISITE:** wire `IBM_Plex_Mono` via
  `next/font/google` in `app/layout.tsx` (`--font-mono`) before any other
  task in this plan. (DESIGN.md implementation note, Codex blocking flag.)
- **15A — Price color semantics (append to DESIGN.md color rules):** a
  price the user pays is Cormorant **espresso** — forest remains reserved
  for money *toward* the user (value bands, earnings, primary CTA). Inside
  the forest CTA the price renders in sand, not forest-on-forest.

## Responsive & Accessibility (decided 2026-06-12, Pass 6)

### Mobile (16A)

- **Lead card (4-col):** value band (Cormorant, full width) → location +
  config mono line → metrics as 2×2 mono grid → full-width unlock CTA
  (forest, 44px min height). Triage actions as a bottom row, not swipe-only.
- **Unlock slip → full-screen sheet** (existing mobile sheet pattern,
  safe-area aware). Ledger and what-you-get list identical to desktop.
- **Checkout return deep-links** to `/builder?lead={id}` with that card in
  CONFIRMING state — the builder never hunts to learn whether payment
  worked. Lead id rides the Stripe success URL.
- **AI on mobile:** upload via native camera/photo picker; before/after
  board is a swipeable full-screen sheet (wizard pattern); generation
  continues if the sheet is dismissed, completion surfaces a notification.

### Accessibility (17A)

- Unlock slip: focus trap, `Esc` closes, focus returns to the originating
  unlock button; `aria-live="polite"` announces CONFIRMING → UNLOCKED.
- Locked contact info is ABSENT from the DOM (server-side, per 5A) and
  announced as "Contact locked — unlock to view", never blur-only (blur is
  both an a11y failure and a paywall leak).
- Generation progress: `aria-live` step announcements; upload flow fully
  keyboard-operable (file input, preview confirm, board actions).
- Touch targets ≥ 44px; amber-on-parchment mono verified ≥ 4.5:1 (11px
  mono is body-adjacent — treat as body text for contrast).
- `prefers-reduced-motion`: stamp/settle and count-up degrade to instant
  state change with no scale/translate.

## Engineering Architecture (decided 2026-06-12, eng review)

Cross-model note: Gemini Code Assist (security-medium) and Codex (P1) both
independently flagged the paywall-bypass on PR #42, confirming decision 1A.

### Delivery: two PRs (D2)

- **PR-1 (revenue):** Plex Mono wiring, paywall data split, Stripe
  Checkout + webhook, dashboard v2, billing, conformance, mobile, a11y.
  Tasks T1–T5, T8–T10, T13–T16.
- **PR-2 (AI):** Style Match upload, generation job pipeline, before/after
  board, photo privacy. Tasks T6–T7, T11–T12.
- Payments get an isolated, exhaustively-tested diff; the AI feature lands
  on a QA'd base. The two PRs share almost no files.

### Paywall data model (1A — the security model IS the data layout)

```
connectionRequests/{id}              ← PUBLIC PREVIEW (matched builders read)
  ├── neighborhood, zip, lotSqft, aduConfig, buildBand, rentBand, payback
  ├── ownerVerified, createdAt, matchReasons[]   ← structured, no PII
  ├── previewSerial: "LF-{hash}"     ← 9A: random, NOT the APN
  └── matchedBuilderIds[], headStartUntil        ← 19C
      │
      ├── private/contact            ← SUBCOLLECTION, gated
      │     ownerContact, streetAddress, exactAPN, ownerMessage(full)
      │     rule: read if isOwner OR exists(leadUnlocks/{uid}_{id})
      │
      └── builderResponses/{builderId}            ← triage (unchanged)

leadUnlocks/{builderId}_{requestId}  ← deterministic id = idempotency (2A)
  builderId, requestId, stripeSessionId, status, amount, createdAt
  WRITE: admin SDK only (webhook). Client cannot self-grant.

unlockReservations/{requestId}       ← 3A head-start race guard
  builderId, expiresAt (30min TTL)
```

- **Firestore rule** on `private/contact`: `allow read: if isOwner(ownerUid)
  || exists(/databases/$(db)/documents/leadUnlocks/$(request.auth.uid + '_' + requestId))`.
  The paywall enforces at the database layer; client SDK + realtime stay.
- **Migration:** existing `connectionRequests` docs split — contact fields
  moved to `private/contact`, preview fields redacted in place, `previewSerial`
  backfilled. One-time script, idempotent. **REGRESSION RISK:** owner-submit
  flow now writes two docs (batch) — regression test required.
- **Split TypeScript types (7A):** `RedactedLead` (no contact fields exist
  on the type) and `UnlockedLeadContact` (returned only by the gated fetch).
  Rendering contact on a locked card becomes a compile error.

### Payments (2A, 3A, 4A)

- **Webhook (2A):** thin hand-rolled `/api/stripe/webhook` — verify signature
  on the RAW body (`req.text()` before parse), read `builderId`+`requestId`
  from session metadata, `set()` the grant on the deterministic id. Replays
  and Stripe retries are no-ops by construction. Single event:
  `checkout.session.completed`.
- **Head-start race (3A):** `/api/stripe/checkout` claims `unlockReservations/
  {requestId}` in a transaction (30min TTL) before creating the session —
  a second builder sees "another builder is unlocking this lead" and never
  reaches Stripe. Webhook settles reservation → grant in a transaction;
  expired reservations free automatically; a straggler payment auto-credits.
  Card states: locked · reserved · confirming · unlocked.
- **Secrets (4A):** `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` via
  Functions `defineSecret` (Secret Manager); publishable key as
  `NEXT_PUBLIC_*`. No secrets in repo/config plaintext.
- **Demo mode (4A):** unlock CTA runs the full state machine against a mock
  grant, card stamps `DEMO`. Mock path gated server-side by env so it can
  never grant in production. Preserves the zero-key demo rule (CLAUDE.md).

### AI generation (5A — PR-2)

- `styleMatchJobs/{id}` doc: `status: queued → casting → done | failed`,
  client watches via `onSnapshot` (same realtime pattern as the unlock
  reveal). Survives navigation/sleep; provider-agnostic (image model slots
  behind the job processor). Stuck-job sweeper marks `casting > 90s` as
  `failed`. EXIF/GPS stripped client-side before upload (21A).

### DRY / quality

- **Converter helper (8A):** extract one `docToEntity<T>` + timestamp helper
  in `lib/marketplace-firestore.ts`; all old and new collections use it.
  Kills the fifth copy of the per-collection converter idiom.

### Performance (11A)

- `fetchBuilderInbox` keeps its bounded per-lead fan-out at launch (3–5
  leads). Denormalizing status+grant onto the lead (or a collection-group
  query) is deferred to the same ~10-leads/week trigger as the table view.

### Deferred (TODOs, not PR-1 scope)

- **Server-side matching (6B):** `matchedBuilderIds` is computed client-side
  today (`marketplace.ts:48`). Post-money this decides who may pay you —
  move to `/api` at submit time. Low attacker payoff at launch; clean later
  home with the matching-quality work.

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

## Photo Privacy Lifecycle (decided 2026-06-12, 21A — makes 11A's promise true)

- EXIF (including GPS) stripped **client-side** before upload.
- Storage: owner-only Firebase Storage rules; the original photo NEVER
  appears on certificates, in builder-visible surfaces, or in any shared
  artifact. Generated **concept** only, and only via opt-in attach (12A).
- Delete control in the studio removes the photo AND derived renders.
- No model-training use of homeowner photos without separate consent.

## Approved Mockups

| Screen/Section | Mockup Path | Direction | Notes |
|----------------|-------------|-----------|-------|
| Builder dashboard | `~/.gstack/projects/torralba85-YardUp/designs/builder-dashboard-20260612/builder-dashboard.png` | Mahogany builder desk, money band led by new-lead pipeline value, ledger-slip lead cards | 1A/2A; redaction per 5A (neighborhood+ZIP, server-side); price color per 15A |
| AI Style Match states | `~/.gstack/projects/torralba85-YardUp/designs/builder-dashboard-20260612/ai-style-match.png` | 4-state panel: upload / generating / result / error, foundry casting language | Entry per 4C (rail top); result opens before/after board; trust line per 11A |
| Lead unlock slip | `~/.gstack/projects/torralba85-YardUp/designs/builder-dashboard-20260612/lead-unlock.png` | Certificate-style purchase slip: serial header, lot recap, ledger, forest Stripe CTA | 3A; 48h head-start terms per 19C; bad-lead credit per 20A; price espresso per 15A |

| Before/after drafting board | `~/.gstack/projects/torralba85-YardUp/designs/builder-dashboard-20260612/before-after-board.png` | Focused overlay: your photo ↔ ADU concept, mono metadata rail, attach/recast/delete | 4C result surface; 11A/21A privacy footer; 12A opt-in attach |
| Payment state sequence | `~/.gstack/projects/torralba85-YardUp/designs/builder-dashboard-20260612/confirming-state.png` | Locked → Confirming → Unlocked card states | 6A; 5A locked redaction; 19C head-start countdown; 20A report action |

HTML sources (same directory) are the buildable reference — exact tokens,
spacing, and type scale.

> **Eng-review corrections to apply when building from these wireframes:**
> the locked-card serials shown as `NO. LF-{APN}` are illustrative — real
> previews use a random `LF-{hash}` (9A); the APN serial appears only on the
> unlocked certificate. No free-form owner-message excerpt on locked cards
> (10A) — structured match reasons only.

## Implementation Tasks

Synthesized from this review's findings. Each task derives from a specific
finding above. Run with Claude Code or Codex; checkbox as you ship.
P1 blocks ship; P2 lands same branch; P3 is a follow-up.

- [x] **T1 (P1, human: ~30min / CC: ~15min)** — typography — Wire IBM Plex Mono in `app/layout.tsx` _(already wired: `layout.tsx` loads `IBM_Plex_Mono`→`--font-mono`; `globals.css` `@theme` maps it to the `font-mono` utility)_
  - Surfaced by: Pass 5 — 14A blocking prerequisite (DESIGN.md note + Codex)
  - Files: `app/layout.tsx`, `app/globals.css`
  - Verify: mono surfaces render Plex Mono, not system fallback; build passes
- [x] **T2 (P1, human: ~2d / CC: ~2h)** — paywall — Server-side withholding of `ownerContact` + precise address until unlock
  - Surfaced by: Pass 2 — 5A (subagent critical A1: blur paywall is a free paywall)
  - Files: `lib/marketplace-firestore.ts`, `lib/marketplace-types.ts` (redacted lead shape), `firestore.rules`
  - Verify: locked lead payload contains no contact/address fields (network tab + unit test)
  - **Done:** split types `LeadPreview` (no PII) / `UnlockedLeadContact`; redacted root + gated `private/contact` subdoc (root committed first so rules `get()` sees it); `firestore.rules` adds the subcollection gate + `leadUnlocks` (admin-write-only); `fetchUnlockedContact` gated read. Tests: `marketplace.test.ts` redaction, `marketplace-firestore.test.ts` write-split regression, `BuilderDashboard.test.tsx` asserts PII absent. 180/180 unit, tsc + lint clean. _Migration of pre-existing `connectionRequests` deferred (pre-launch; no prod leads)._
- [ ] **T3 (P1, human: ~3d / CC: ~4h)** — payments — Stripe Checkout + webhook + `leadUnlocks` grant with idempotency
  - Surfaced by: Plan Feature 1 + Pass 2 — 6A, 18A ($39–49 single price)
  - Files: `lib/stripe.ts` (new), `app/api/stripe/checkout/route.ts`, `app/api/stripe/webhook/route.ts`, Firestore `leadUnlocks`
  - Verify: Stripe test mode end-to-end; duplicate unlock attempt resumes session, never double-charges
  - **Structure + demo done (live Stripe = the paused wall):** `lib/stripe.ts` (lazy SDK, `isStripeConfigured`, $49 default price), `lib/server/firebase-admin.ts` (Admin Firestore), `lib/server/lead-unlocks.ts` (`grantLeadUnlock` via `create()` → exact idempotency, deterministic `{builderId}_{requestId}` id). `/api/stripe/checkout` verifies matched-builder, idempotent on already-unlocked, **demo branch grants without keys (env-gated, never in prod)**, real branch builds a Checkout session w/ metadata. `/api/stripe/webhook` verifies sig on raw body, grants on `checkout.session.completed`. Tests: grant idempotency/replay, checkout demo+guards, webhook sig+grant (195/195, tsc+lint clean). ⏳ **Pending Stripe test keys:** live test-mode E2E (the only unverified piece).
- [x] **T4 (P1, human: ~2d / CC: ~3h)** — builder UI — Lead card states (locked/confirming/unlocked) + unlock slip
  - Surfaced by: Pass 1 — 3A; Pass 2 — 6A; Pass 5 — 15A (price espresso)
  - Files: `components/builder/` (new LeadCard, UnlockSlip), wireframes `confirming-state.html`, `lead-unlock.html`
  - Verify: e2e through mock checkout return; aria-live announces state change
  - **Done:** `LeadCard` (locked/confirming/unlocked per 6A — stamp/settle reveal via `.lf-stamp`, never a flip; reduced-motion = instant swap); `UnlockSlip` (3A certificate slip: double-frame, serial, ledger, bad-lead-credit terms, Esc/focus). `BuilderInbox` rewired with the unlock flow (`startLeadUnlock` → demo: confirming→unlocked + gated `fetchUnlockedContact`; real: redirect to Stripe) + `aria-live` announcer. `lib/lead-unlock-api.ts` client; adapter exposes per-lead `unlocked`. **15A applied (flagged):** rent figure forest, but unlock **price in espresso** + **clay** pay CTA (forest = money toward user only) — diverges from the mockup's forest button; revert is trivial if undesired. Tests: LeadCard 3 states, UnlockSlip, unlock-api, dashboard demo-unlock integration (209/209, tsc+lint clean). _Unlocked-state actions (View certificate / Report) render only when wired — deferred to T11/T9. Playwright E2E through real demo grant needs the Admin-credentialed backend — follow-up._
- [ ] **T5 (P1, human: ~2d / CC: ~3h)** — builder UI — Dashboard v2: money band (new-lead pipeline value), triage tabs, empty states
  - Surfaced by: Pass 1 — 1A/2A; Pass 2 — 7A/8A
  - Files: `components/builder/BuilderDashboard.tsx`, `BuilderInbox.tsx`, wireframe `builder-dashboard.html`
  - Verify: zero-ever vs zero-new empty states render; EXAMPLE card has no unlock CTA
- [ ] **T6 (P1, human: ~2d / CC: ~3h)** — studio AI — Upload flow: HEIC convert, downscale ~2048px, EXIF/GPS strip, preview confirm
  - Surfaced by: Pass 2 — 9A; Pass 7 — 21A
  - Files: new `components/studio/StyleMatchPanel.tsx`, `lib/` upload util
  - Verify: iPhone HEIC accepted; uploaded blob contains no EXIF (unit test)
- [ ] **T7 (P1, human: ~2d / CC: ~3h)** — studio AI — Generation states + before/after drafting board + gallery insert
  - Surfaced by: Pass 1 — 4C; Pass 2 state table (A4); Pass 3 — 11A framing
  - Files: `components/studio/` (board overlay), `InspirationGalleryPanel.tsx`, wireframes `ai-style-match.html`, `before-after-board.html`
  - Verify: error + timeout (>90s) states reachable in dev mock; studio stays usable while casting
- [ ] **T8 (P2, human: ~1d / CC: ~1.5h)** — payments — 48h head-start: `headStartUntil`, countdown on locked cards, slip terms
  - Surfaced by: Pass 7 — 19C
  - Files: webhook handler, `LeadCard`, `UnlockSlip`
  - Verify: second builder blocked until window closes; card shows honest unlocked-by line
- [ ] **T9 (P2, human: ~1d / CC: ~1.5h)** — payments — "Report this lead" + bad-lead credit records (`CREDITED` ledger rows)
  - Surfaced by: Pass 7 — 20A (chargeback prevention)
  - Files: unlocked card actions, billing ledger component, Firestore credit records
  - Verify: credited row renders amber mono; slip states the policy + exclusions
- [ ] **T10 (P2, human: ~0.5d / CC: ~1h)** — billing — In-app ledger + Stripe customer portal link + empty state
  - Surfaced by: Pass 2 — 10A
  - Files: `components/builder/` billing section
  - Verify: double-rule total; portal link opens Stripe-hosted page
- [ ] **T11 (P2, human: ~0.5d / CC: ~45min)** — homeowner — Disclosure line at connection form; certificate opt-in attach w/ stamp
  - Surfaced by: Pass 7 — 22A; Pass 3 — 12A
  - Files: `components/studio/BuilderLeadPanel.tsx` (form), `ReportPreview.tsx`/certificate
  - Verify: disclosure copy exact per plan; attach never automatic
- [ ] **T12 (P2, human: ~1d / CC: ~1.5h)** — privacy — Owner-only Storage rules + delete control (photo + derived renders)
  - Surfaced by: Pass 7 — 21A (makes 11A's promise true)
  - Files: `storage.rules`, `StyleMatchPanel` delete action
  - Verify: rules test: non-owner read denied; delete removes render set
- [ ] **T13 (P2, human: ~1d / CC: ~1h)** — conformance — Bring builder/inspiration components to DESIGN.md v2
  - Surfaced by: Pass 4 — 13A (rounded→sharp, gradient→scrim, mono ≥11px, no unicode-glyph icons)
  - Files: `BuilderInbox.tsx`, `BuilderDashboard.tsx`, `BuilderProfileForm.tsx`, `InspirationGalleryPanel.tsx`
  - Verify: grep for `rounded-` (non-chip) and `gradient` in builder/ returns none
- [ ] **T14 (P2, human: ~1.5d / CC: ~2h)** — mobile — Mobile lead card, sheet slip, checkout return deep-link `/builder?lead={id}`
  - Surfaced by: Pass 6 — 16A
  - Files: builder mobile tree, Stripe success URL config
  - Verify: Playwright mobile viewport: return lands on the right card in CONFIRMING
- [ ] **T15 (P2, human: ~1d / CC: ~1.5h)** — a11y — Focus trap + Esc + return focus on slip; aria-live; contrast check; reduced-motion
  - Surfaced by: Pass 6 — 17A
  - Files: `UnlockSlip`, state components
  - Verify: keyboard-only unlock completes; axe pass on dashboard
- [ ] **T16 (P3, human: ~15min / CC: ~5min)** — docs — Append 15A price-color rule + iconography note to DESIGN.md
  - Surfaced by: Pass 5 — 15A; Pass 4 iconography
  - Files: `DESIGN.md`
  - Verify: rule present in Color section + Decisions Log row

## Design decisions log (all resolved 2026-06-12)

| # | Decision | Choice |
|---|----------|--------|
| D3 | Revenue model | Builder pays per lead; homeowner free |
| 1 | Inbox layout | 1A ledger-slip cards (table view = TODO at 10+ leads/wk) |
| 2 | Money band figure | 2A new-lead pipeline value |
| 3 | Unlock surface | 3A certificate-style slip |
| 4 | AI placement | 4C rail entry → before/after board |
| 5 | Redaction | 5A neighborhood+ZIP, server-side withholding |
| 6 | Payment states | 6A confirming/timeout/cancel/idempotency bundle |
| 7 | Empty state | 7A cause + lever + EXAMPLE card |
| 8 | Taxonomy | 8A access × triage, two axes |
| 9 | Upload spec | 9A HEIC + downscale + preview-confirm |
| 10 | Billing | 10A in-app ledger + Stripe portal link |
| 11 | Photo trust copy | 11A trust line + concept framing |
| 12 | Certificate attach | 12A opt-in, stamp motion, never auto |
| 13 | v2 conformance | 13A conform while extending |
| 14 | Plex Mono | 14A blocking prerequisite |
| 15 | Price color | 15A espresso (forest = money toward user only) |
| 16 | Mobile | 16A full mobile spec + checkout deep-link |
| 17 | A11y | 17A full bundle |
| 18 | Price | 18A $39–49 flat |
| 19 | Exclusivity | 19C 48h first-unlock head start |
| 20 | Refunds | 20A credit on verifiable bad contact, 7 days |
| 21 | Photo privacy | 21A full lifecycle |
| 22 | Disclosure | 22A benefit-framed line at connection form |

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 1 | ISSUES (addressed) | Gemini+Codex on PR #42: paywall split, APN leak, owner-text PII, archived status |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | CLEAN | 11 issues, 0 critical gaps, 0 unresolved; 2-PR split |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | CLEAN | score: 2/10 → 9/10, 23 decisions |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

- **CROSS-MODEL:** Two independent passes agree. Design outside voices (Codex high-reasoning + Claude subagent) and the PR #42 bot review (Gemini Code Assist security-medium + Codex P1) BOTH flagged the paywall bypass — confirming eng decision 1A (database-enforced split). Bot review additionally surfaced the APN-on-preview leak (resolved 9A) and owner-text PII (resolved 10A); both folded into the eng review and the plan.
- **UNRESOLVED:** 0. All 23 design + 11 eng decisions resolved.
- **CRITICAL GAPS:** 0. Two failure modes carry mandatory tests: owner-submit regression (2-doc split) and EXIF-strip privacy.
- **VERDICT:** DESIGN + ENG CLEARED — ready to implement as two PRs (revenue first, AI second). Run `/ship` per PR when built.
