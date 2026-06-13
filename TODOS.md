# TODOS

Design and product debt, recorded with context. Each entry names its
trigger so future changes are intentional, not drift.

## Lead inbox: table + certificate-pane view

- **What:** Add a dense ledger-table inbox view with a right-side
  certificate inspection pane for the builder dashboard, alongside the
  card view.
- **Why:** Card scanning degrades past ~10 leads/week per builder —
  comparison becomes the primary task and a table scans better.
- **Pros:** Scales to volume; the most anti-SaaS, instrument-grade layout
  (Codex's recommended direction in the 2026-06-12 design review).
- **Cons:** Second layout to maintain; needs its own mobile design.
- **Context:** Decided against for launch in the 2026-06-12
  /plan-design-review (issue 1, option 1A chosen): launch volume is 3–5
  leads/week and cards carry the trust scaffolding (freshness, owner
  excerpt, match reason) the first-$49 decision needs. See
  `docs/plans/monetization-marketplace-ai.md`.
- **Depends on / blocked by:** Lead-volume metrics per builder existing;
  marketplace v2 shipped.
- **Trigger:** Builders regularly seeing 10+ leads/week.

## Inbox read denormalization

- **What:** Denormalize triage status + unlock-grant state onto the lead
  preview doc (or use a collection-group query) so the builder inbox is one
  read instead of a per-lead fan-out.
- **Why:** `fetchBuilderInbox` (`lib/marketplace-firestore.ts:108`) fires one
  `getDoc` per matched lead; with the 1A split the inbox also needs grant
  state. At 50 leads that's ~150 reads per inbox open.
- **Pros:** Flat read cost regardless of lead count.
- **Cons:** Denormalized fields need sync on every triage/unlock write
  (dual-write or Cloud Function trigger).
- **Context:** Eng review 2026-06-12 issue 11 chose 11A (accept fan-out) for
  launch. Bounded by matched-lead count; invisible at 3–5 leads.
- **Depends on / blocked by:** marketplace v2 shipped.
- **Trigger:** Same as table view — builders regularly seeing 10+ leads/week.

## Server-side builder matching

- **What:** Move `matchedBuilderIds` computation out of the homeowner client
  (`lib/marketplace.ts:48`) into an `/api` endpoint at request-submit time.
- **Why:** Post-monetization, this list decides which builders are allowed to
  pay for a lead. A tampered client could exclude all but one builder or stuff
  the list. Firestore rules validate the list's size, not its honesty.
- **Pros:** List integrity guaranteed server-side; removes `fetchActiveBuilders`
  from the homeowner client (less data exposed).
- **Cons:** New endpoint + connection-form refactor.
- **Context:** Eng review 2026-06-12 issue 6 chose 6B (defer). Abuse requires a
  signed-in homeowner gaming which contractor pays $49 — low payoff at launch.
- **Depends on / blocked by:** Stripe monetization (PR-1) shipped.
- **Trigger:** Any sign of lead-routing abuse, OR the matching-quality
  iteration (where the not-a-fit feedback signal gets consumed) — fold in then.
