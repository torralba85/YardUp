# Builder dashboard: one hierarchy, readable figures, shared components

Andrew asked on November 4, 2026 whether the builder dashboard could be improved visually. Rendered
locally with sample leads at 1440, 1180, 390 and 320px, the dashboard read as a stack of equal-weight
boxes and drifted from A LOT MORE in ways the rest of the product had already fixed:

- The page opened on a generic "Builder dashboard" heading, then underline tabs (§6 forbids them), then
  a second bordered box repeating the company name, so the builder's own identity sat third.
- Lead cards, the table and the inspector set facts in 9–10.5px uppercase runs: 40 arbitrary type sizes
  and 13 hand-written kicker recipes across `components/builder`.
- The 10-lead credit pack put chalk text on signal orange (2.83:1, §2.3 rule 1 fails), and both packs
  were hand-rolled `<button>`s.
- Access and zoning states were hand-built pills instead of `StatusChip`; the billing figures were
  hand-set `font-display text-3xl` instead of the money scale.
- With credits, the unlock button read "Unlock with 1 Credit 1 Credit".
- At 320px the money band's "$823K est. build" pushed the page 17px wide.
- The band's "Spend this month" summed the whole ledger, and the billing ledger listed rows in
  Firestore order, not by date.

## What changed

- **Header.** Kicker "Builder workspace", the company name as the `h1`, its service areas as the sub
  line and a `StatusChip` for Active / Inactive. The duplicate company box is gone. The view switch is
  `Segmented` ("Leads · n" / "Billing & credits").
- **Money band.** Cells split by the on-dark hairline, `lf-kicker` labels and a unit under every figure.
  "Spend this month" is now "Total spend", which is what it measures.
- **Lead card.** Rent potential still leads (B2), then the location with a zoning `StatusChip`, then a
  hairline fact grid (Lot, ADU, Finish, Payback, Build) at 14px. A filled orange dot marks New. Unlock
  and the response buttons share one footer row; the redundant response label is gone.
- **Table.** Body text is 12–14px. While the inspector sits beside the table (≥ xl), the Specs column
  hides and the inspector keeps its fixed 450px, so all other columns fit without a horizontal scroll at
  every desktop width. Rows show a focus outline.
- **Credit shop.** `PanelHeader` with the current balance; both packs are `ui/Button`, the 10-pack is
  `primary` (carbon on orange).
- **Billing.** Overview figures use `lf-money-lg`, the ledger header is `PanelHeader`, and rows read
  newest first.
- **Empty state.** The explanation and the example lead sit side by side on desktop; the example uses
  the new card anatomy.

The ratchet in `app/design-tokens.test.ts` fell with it: arbitrary type sizes 151 → 111, inline
kickers 23 → 10, raw buttons 75 → 71. `components/builder` now has none of the first two.

## Verification

Rendered with `next dev` against local fixtures (a temporary `turbopack.resolveAlias` over the
Firestore and auth modules, never committed): cards, table with locked and unlocked selections,
billing and empty states at 1440 and 1180px, and cards and billing at 390 and 320px. The page has no
horizontal overflow at any of them, and the leads table fits its column at 1024–1920px. The builder
unit tests, the design-token ratchet, lint, the full Vitest suite and the production build pass.
