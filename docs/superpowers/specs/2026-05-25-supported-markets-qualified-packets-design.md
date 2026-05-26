# Supported Markets And Qualified Packets Design

**Date:** 2026-05-25
**Product:** YardUp mobile app, operated under ADU Advisor
**Status:** Approved for Phase 1 implementation

## Objective

YardUp should help a homeowner see ADU earning potential and reach an appropriate builder without implying that the app covers only Los Angeles or that an undelivered packet has been sent. Phase 1 establishes truthful market coverage and the commercial event needed for later builder-paid revenue.

## Decisions

1. The app is not restricted to California or to the currently seeded jurisdictions.
2. Current sourced rule and parcel starter content remains available for Los Angeles, San Diego, San Jose, Oakland, and Sacramento.
3. Addresses outside current sourced coverage use a `local-review` jurisdiction state. This state preserves the estimate workflow but clearly states that local rule and builder availability verification is required.
4. Unknown locations never silently inherit Los Angeles parcel facts, permit guidance, or builder matches.
5. The initial monetization model is a builder-paid qualified introduction or delivered quote-packet fee.
6. A packet saved locally because delivery is unavailable is not delivered, not billable, and remains retryable.
7. A delivered packet is commercially eligible only when the homeowner explicitly consented to send it to the selected builder and delivery is independently recorded.
8. Phase 1 does not collect money. A charge flow requires a builder fee schedule, builder acceptance of commercial terms, tax/receipt policy, dispute handling, and Stripe account setup.

## Homeowner Flow

The Value tab remains the first money surface: estimated rent, annual income, cost, payback, builder matches, and packet readiness. The address control accepts properties in any market.

For a currently covered jurisdiction, the homeowner sees seeded, source-labeled permit and parcel guidance and builder matches limited to declared service coverage.

For a `local-review` project:

- Revenue and cost assumptions remain editable and clearly estimated.
- Permit content states that local guidance is not yet sourced for that jurisdiction.
- Parcel facts are not fabricated from another city.
- Builder matches show a verification-needed empty state rather than out-of-area builders.
- The user can complete a feasibility study without being led into an unavailable builder send flow.

## Quote Packet And Revenue Flow

The builder action is a transparent homeowner-authorized handoff:

1. The homeowner prepares a packet containing the ROI model, lot summary when available, concept, and permit notes when available.
2. Before delivery, the UI states that sending shares the packet with the selected builder and that builders may pay YardUp for qualified introductions; homeowners are not charged for sending.
3. The current CTA is explicit and honest, such as `Consent and submit packet`; use delivery wording only once delivery exists.
4. The callable accepts the consent assertion and records an outreach submission after the server write succeeds.
5. A successful remote write records status `submitted`, a consent timestamp, and commercial status `not_eligible` because it is not proof of builder delivery.
6. A failed or unavailable cloud action stores status `saved` and commercial status `not_eligible`, labels the packet as saved for retry, and keeps the send action available.
7. A future verified delivery event may record status `sent`, a delivery timestamp, and commercial status `eligible_for_builder_fee`.
8. Legacy `sent` records without recorded consent or delivery evidence remain displayable as delivered but are not newly marked billable.

This creates an auditable revenue boundary without taking payment or overclaiming revenue generation.

## Data Contract

### Jurisdictions

Introduce:

- `CoveredJurisdictionId`: the five currently sourced jurisdictions.
- `JurisdictionId`: `CoveredJurisdictionId | "local-review"`.

`RegulationGuide` can return a low-confidence, source-honest `local-review` guide. No `ParcelSummary` is seeded for `local-review`.

### Builders

`ContractorProfile` gains `supportedJurisdictions: CoveredJurisdictionId[]`. Matching functions return only profiles whose declared coverage includes the project jurisdiction; `local-review` returns no direct matches.

### Quote Requests

`QuoteRequest` gains:

- `status: "saved" | "submitted" | "sent"`
- `homeownerConsentAt?: string`
- `deliveredAt?: string`
- `commercialStatus: "not_eligible" | "eligible_for_builder_fee"`

The callable input gains `homeownerConsent: true`. Server-created outreach records set consent time but remain pending and non-eligible. Client fallback records are saved locally as non-eligible. Only a verified future delivery record sets delivery time and eligibility.

## UI And Copy

- Use the existing Quiet Ascent system in `DESIGN.md`.
- Keep revenue values dominant and builder action secondary but visible.
- Use `supported markets` and `local rules verification` language.
- For non-covered locations, use permit amber for verification-required states, never false positive green readiness.
- Show a clear no-cost homeowner disclosure near the builder handoff action.
- Remove account copy that promises cloud sync when that behavior is not implemented.

## API And Store Accuracy

Update API documentation and store-review content to state:

- jurisdiction coverage varies; unknown locations receive verification guidance, not Los Angeles defaults;
- quote requests recorded by the current cloud write remain pending verified delivery;
- local-only saved packets and server-recorded pending submissions are not delivered or fee eligible;
- no homeowner payment is required in Phase 1;
- builder-paid introductions are a planned commercial model supported by delivered-consent records, not a live charge feature.

## Testing And Release Gates

Required tests:

- unknown addresses infer `local-review`, while known seeded cities retain sourced coverage;
- `local-review` returns generic low-confidence guide and no parcel or direct builder matches;
- contractor filtering honors declared supported jurisdictions;
- failed quote delivery yields a saved, non-eligible packet that can be retried;
- successful outreach submission requires homeowner consent but remains pending and non-eligible without delivery evidence;
- a sent record becomes eligible only with both consent and delivery evidence;
- UI labels distinguish saved packets from delivered requests.

Before reporting completion, run:

```bash
npm run typecheck
npm test
npm run backend:typecheck
npm run backend:test
npm run release:check
```

Visually verify Value, Builders, Permits, and guided-flow delivery states in the Expo web preview at a narrow mobile width.

## Deferred Work

- Stripe Checkout or Connect onboarding and payment collection.
- Builder pricing tiers or dollar amounts.
- Closed-sale commission attribution and contractual enforcement.
- New sourced regulatory coverage beyond the currently seeded cities.

These items are deferred because shipping a payment or commission promise before commercial terms and compliance are defined would create a false revenue workflow and store-review risk.
