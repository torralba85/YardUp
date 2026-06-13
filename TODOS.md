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
