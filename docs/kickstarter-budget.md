# Kickstarter Project Budget - Bring the ADU Studio to Mobile

**Updated:** 2026-09-10
**Source of truth:** the Kickstarter-owned budget sheet, "Project budget: LotFoundry -
Bring the ADU Studio to Mobile" (owner `sheets@kickstarter.com`, shared with the
creator account). This document mirrors that workbook so the numbers are reviewable
in-repo; the sheet itself is what feeds the budget graphic in the project editor.
**Scope basis:** remaining native-store work enumerated in
[`docs/store-deployment-readiness.md`](store-deployment-readiness.md).

All figures are planning estimates for a twelve-month build-and-run window. They are
not quoted contract rates except where marked as published prices.

## Funding goal summary

| Cost category | Phase | Expected total |
|---|---|---:|
| Research & Development | Making | $9,900.00 |
| Packaging | Fulfilling | $1,125.00 |
| Shipping | Fulfilling | $1,290.00 |
| Labor | Multiple/Other | $16,550.00 |
| Compliance, Legal & Campaign Production | Multiple/Other | $3,424.00 |
| **Subtotal** | | **$32,289.00** |
| Kickstarter fee (5%) | | $1,614.45 |
| Payment processing fee (5%) | | $1,614.45 |
| Taxes (10%) | | $3,228.90 |
| Margin of error (10%) | | $3,228.90 |
| **Estimated funding goal** | | **$41,975.70** |

Kickstarter's template applies each percentage to the subtotal rather than to the
final goal. That slightly under-collects, because fees are charged on the amount
raised. The margin-of-error row absorbs the difference.

The Manufacturing tab is deliberately left at zero. LotFoundry is a software product
with no per-unit manufacturing; physical reward costs sit under Packaging and
Shipping instead.

## Research & Development - $9,900.00

Platform, data and tooling costs that keep the feasibility engine accurate and pay
for building the mobile clients.

| Item | Description | Expected total |
|---|---|---:|
| Regrid parcel data licence | Parcel boundary and attribute retrieval, 12 months at ~$300/mo | $3,600.00 |
| Google Maps Platform | Static Maps, Geocoding and Places (New), 12 months at ~$150/mo | $1,800.00 |
| OpenAI API inference | Parcel/permit briefs and style-matched concepts, 12 months at ~$200/mo | $2,400.00 |
| Firebase hosting, Functions, Firestore | Backend and scaling headroom for mobile traffic, 12 months at ~$100/mo | $1,200.00 |
| iOS and Android test devices | Used handsets for StoreKit and Play Billing sandbox testing on real hardware | $900.00 |

## Packaging - $1,125.00

Materials for the printed Certificate of Feasibility offered to upper reward tiers.
Quantities assume 150 backers select a physical tier.

| Item | Quantity | Unit cost | Expected total |
|---|---:|---:|---:|
| Printed Certificate of Feasibility | 150 | $4.50 | $675.00 |
| Rigid no-bend mailer | 150 | $2.20 | $330.00 |
| Thank-you card and access insert | 150 | $0.80 | $120.00 |

## Shipping - $1,290.00

| Reward | Expected backers | Shipping cost | Expected total |
|---|---:|---:|---:|
| Founding Supporter (U.S.) | 120 | $6.50 | $780.00 |
| Founding Supporter (UK / EU) | 20 | $16.00 | $320.00 |
| Founding Supporter (rest of world) | 10 | $19.00 | $190.00 |
| Early Bird / Standard / Bundle (digital only) | 0 | $0.00 | $0.00 |

## Labor - $16,550.00

| Role | Hours | Rate | Expected total |
|---|---:|---:|---:|
| Your labor cost | 260 | $55.00 | $14,300.00 |
| Assistant - QA and real-device testing | 50 | $45.00 | $2,250.00 |

The 260 hours break down against the outstanding native-store gates:

| Work | Hours |
|---|---:|
| Capacitor iOS shell, build config and signing | 60 |
| StoreKit bridge and receipt verification via `/api/store/purchases/verify` | 55 |
| Offline certificate library and share/photo handoff | 45 |
| Android release rebuild, Play Billing hardening, closed-track validation | 45 |
| Real-device restore / refund / revocation testing on both platforms | 30 |
| Store screenshots, listing graphics and submission paperwork | 25 |

## Compliance, Legal & Campaign Production - $3,424.00

| Item | Description | Expected total |
|---|---|---:|
| Apple Developer Program | Annual membership required to distribute on the App Store (published price) | $99.00 |
| Google Play developer registration | One-time developer account fee (published price) | $25.00 |
| Legal review | Privacy labels, Data Safety declarations, advisory-only disclaimers | $1,500.00 |
| Campaign video production | Screen-capture walkthrough of the studio, edit and voiceover | $1,200.00 |
| Accounting and business insurance | Bookkeeping for campaign funds, general liability cover | $600.00 |

## Open decisions

These four inputs move the goal materially and are the creator's to settle before the
project is published.

| Decision | Current assumption | Why it matters |
|---|---|---|
| Self-pay hours and rate | 260 h at $55/h | Largest single line. Dropping to 180 h at $50/h takes the goal to roughly $32,000. |
| Runway funded | 12 months of data, mapping, AI and hosting | Funding 6 months instead removes about $4,500 from the subtotal. |
| Tax set-aside | 10% | The template default is 0%. Most of this budget is deductible expense, so the right figure needs an accountant. |
| Physical reward volume | 150 backers on a certificate tier | Drives both Packaging and Shipping. Revisit once tier limits are fixed. |

## Verification

The mirrored workbook was audited programmatically: every cross-sheet reference was
resolved to its target total cell, every `SUM` range was replayed against its
populated rows, and every product formula was confirmed to multiply cells on its own
row. No populated line item falls outside a summed range. LibreOffice is unavailable
in the authoring container, so the workbook ships without cached values; it carries
`fullCalcOnLoad`, so Excel and Google Sheets recalculate it on open.

## Related documents

- [`docs/store-deployment-readiness.md`](store-deployment-readiness.md) - the outstanding native-store gates this budget funds
- [`docs/store-listing-copy.md`](store-listing-copy.md) - store listing text
- [`docs/play-production-release.md`](play-production-release.md) - Play release process
