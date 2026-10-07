# LotFoundry Analytics Measurement Specification

Status: reviewed implementation plan; P0 privacy and reporting prerequisites are not yet implemented
Date: 2026-09-27
Target branch: master
Product: LotFoundry
Repository: torralba85/YardUp

## Purpose

Define the smallest analytics contract that lets LotFoundry answer four questions reliably:

1. Are visitors reaching a useful feasibility result?
2. Which parts of the parcel-to-decision funnel create or lose intent?
3. Are homeowner and builder monetization surfaces converting?
4. Is the parcel/data layer healthy enough that product metrics can be trusted?

This specification extends the analytics plumbing already in the repository. It does not introduce another analytics SDK.

## Current repository state

LotFoundry already has:

- Consent-gated GA4 loading under lib/analytics and components/analytics.
- A generic trackEvent helper in lib/analytics/gtag.ts.
- Page-view tracking for App Router navigation.
- A Google Ads purchase-conversion helper in lib/analytics/adsConversion.ts.
- Existing product telemetry for ADU landing CTAs and Cesium photoreal failures.
- Real parcel resolution, aerial imagery, feasibility calculations, saved scenarios, certificate purchase, builder matching, lead submission, builder unlocks, Stripe, Firebase Auth, and Firestore.

The missing layer is a consistent product-event taxonomy and KPI contract. Existing helpers also have gaps: page views currently include raw query parameters, withdrawal does not explicitly disable the retained gtag function, and the certificate conversion ID derives from account/property identity. This document specifies required corrections; it does not assert that current production behavior satisfies them.

## Measurement principles

### 1. Use the right source for the right question

GA4 is the behavioral source for consented user journeys.

Processor/store financial records are authoritative for monetary amounts. Firestore grants are authoritative for entitlements and marketplace records, and must be reconciled to those financial records rather than summed as revenue.

Parcel/API operational health should come from server-side operational telemetry or logs when available, not only client analytics.

Never report GA4 purchase counts as authoritative revenue because users may decline analytics consent.

### 2. No PII in analytics

Never send any of the following to GA4:

- street address
- formatted address
- latitude or longitude
- APN
- email
- phone
- owner or builder name
- free-form user text
- uploaded photo metadata
- raw Firestore document IDs that encode account or property identity

Use bounded categories and buckets instead.

#### P0 prerequisites before expanding instrumentation

- Sanitize URL context before the first consented page view and every later event. Phase 1 sends only the pathname: strip all query parameters and fragments, including legacy or untrusted `/studio?q=<address>` URLs. Sanitize page_path, page_location, page_referrer, and any default Google tag/Ads URL context; do not let automatic collection restore raw URLs. Page titles must never contain property or account data.
- Gate pageview, trackEvent, and Ads conversion helpers on current configured-and-granted consent. On withdrawal, explicitly disable collection, prevent queued/new product events from sending, clear analytics cookies, and ensure the retained window.gtag function cannot bypass that state. Regrant may enable only new events, not replay events from the denied period.
- Use a stable, randomly generated opaque analytics_order_id persisted by the backend for a verified paid order, exposed as transaction_id only after consent. Never reuse purchaseId(uid, certKey), raw grant IDs, addresses, account IDs, or deterministic hashes of those values. If the safe ID is unavailable, do not emit a purchase event.
- Preserve once-per-order deduplication when migrating Google Ads to the same safe identifier contract. Do not preserve the current identity-bearing ID merely to preserve implementation details.
- These requirements need runtime changes and regression tests before rollout. Merging this specification does not implement them.

### 3. Prefer decision events over noisy interaction events

Do not fire an event on every slider movement, drag, camera change, or text keystroke.

Track meaningful product transitions such as:

- a parcel lookup completed
- a feasibility result was reviewed
- a design was committed
- a report was opened
- a certificate checkout began
- a homeowner submitted a builder connection
- a builder paid to unlock a lead

### 4. Event names are stable contracts

Use snake_case.
Keep names under GA4 limits.
Do not rename an event after launch without a migration note.
Do not reuse an event name with a different business meaning.

## Primary KPI framework

### KPI 1 — Activated Feasibility Sessions

Definition:

Unique consented Studio sessions that record feasibility_result_viewed after a usable parcel or estimated parcel has been resolved.

Formula:

Activated Feasibility Sessions = count of unique sessions with feasibility_result_viewed

Use the same GA4 session unit throughout the activation, high-intent, and builder-match rates. In exported data, deduplicate by GA4's existing user_pseudo_id plus ga_session_id; do not send a custom user/property identifier. Multiple parcel reviews in one session still count as one activated session. These consented-session metrics are not counts of unique properties, projects, or all product users.

Why it matters:

This is the clearest early product-value event. Page views and address searches are intent. A reviewed feasibility result means the user reached the core LotFoundry job.

Primary drivers:

- Studio entries
- address search submissions
- parcel lookup completion rate
- parcel fallback rate
- feasibility result view rate

Guardrails:

- parcel lookup errors
- fallback share
- invalid or review-needed result share
- major client/runtime failures

### KPI 2 — High-Intent Homeowner Rate

Definition:

Share of activated feasibility sessions that reach at least one strong downstream intent action.

Strong intent actions:

- certificate_checkout_started
- builder_connection_submitted

Formula:

High-Intent Homeowner Rate =
unique activated sessions with either strong-intent event
divided by
unique sessions with feasibility_result_viewed

Why it matters:

This separates curiosity from users willing to create a durable record or engage a builder.

Supporting metrics:

- report open rate
- report export rate
- certificate paywall view rate
- certificate checkout-start rate
- builder match availability
- builder connection-submit rate

### KPI 3 — Gross Platform Revenue

Definition:

Successfully collected live sale value across LotFoundry monetization surfaces, after discounts, excluding taxes, before processor/store fees and before refunds.

Authoritative sources:

- Stripe financial transaction records for web sales
- App Store and Google Play financial records for native sales
- Firestore certificate, unlock, and credit grants only for entitlement reconciliation and product classification

Do not sum existing grant amount fields. Certificate/direct-unlock amounts are cents, while the credit ledger's amountPaid uses major currency units. Native entitlements do not provide a reliable sale-price record, and demo grants can carry nominal prices without a real payment.

Normalize imported financial records to an internal sale ledger with: an opaque order key, processor/store transaction key, purchase_type, purchase_channel, currency, integer amount_minor, currency exponent, paid_at, live/test status, and refund/chargeback adjustments. Keep this ledger server-side; it is not a GA4 payload. Deduplicate source records by channel and transaction key. Exclude demo/test/failed payments. Count credit-pack sales once when paid; spending those credits on an unlock is not another sale.

Report gross sales, refunds/chargebacks, and net-of-refunds sales separately. Reconcile reversals to the original order and record their effective dates; do not silently erase the original sale. Segment totals by currency; only combine currencies under a documented exchange-rate source and date policy. Until financial imports exist, label this KPI unavailable rather than substituting list prices or grant amounts.

GA4 is not the source of truth for this KPI.

Required cuts:

- purchase type
- platform or purchase channel
- week
- new versus returning purchaser where available from first-party data
- builder versus homeowner revenue

Optional behavioral derivative:

Consented Certificate Revenue per Activated Feasibility Session =
sum of verified certificate purchase value emitted in activated GA4 sessions
divided by
those Activated Feasibility Sessions, including sessions with no purchase

Use the same reporting window and GA4 session unit on both sides, deduplicate by the safe transaction_id, and report each currency separately. Purchases in another session and nonconsented sales do not enter this numerator. This is a consented, same-session certificate conversion metric, not gross platform revenue; report KPI 3 separately. Keep this derivative unavailable until safe order IDs and verified sale amounts exist. Never divide all-channel first-party revenue by a consent-limited denominator.

## Marketplace KPI framework

These are secondary but important because LotFoundry has a two-sided builder marketplace.

### Builder Match Rate

Unique activated homeowner sessions with at least one eligible local builder
divided by
activated homeowner sessions that reach the Builders step

### Homeowner Connection Rate

Unique activated homeowner sessions with at least one match and a successful builder_connection_submitted event
divided by
unique activated homeowner sessions with builder_matches_viewed and at least one match

### Lead Unlock Rate

Unique eligible matched leads with at least one confirmed non-demo builder unlock
divided by
unique leads with at least one stored eligible matched builder

Use Firestore connectionRequests.matchedBuilderIds and unlock grants. Select the same lead-creation cohort for numerator and denominator, count each lead once, and state the observation cutoff for unlocks. Include paid and credit unlocks; exclude demo/test records. This is a matched-lead unlock rate, not a preview-impression conversion rate. Firestore does not currently record rendered previews, so do not use impressions as its denominator.

### Lead Liquidity

Median time from homeowner connection submission to first builder unlock.

This should come from first-party timestamps, not GA4.

## Parcel/data health metrics

These metrics determine whether product analysis can be trusted.

- Parcel lookup completion rate
- Parcel success rate
- Parcel fallback rate
- Parcel error rate
- Parcel source mix
- Parcel lookup latency distribution
- Photoreal error-event count (diagnostic only; not an availability rate)
- Zoning coverage rate
- Boundary-geometry coverage rate

Recommended segmentation:

- source
- auth state
- parcel mode
- state code
- device mode

Do not segment by exact address or coordinates. The existing photoreal_tileset_error event counts failed configured routes; several failures may belong to one view, and success or missing configuration emits no matching result. Do not infer attempts, unique failed views, or availability from it. A future availability KPI requires a separate attempt/result contract.

## Common event parameters

Use only parameters relevant to a specific event. Do not attach all fields to every event.

Recommended bounded parameters:

- app_surface: landing | studio | builder
- device_mode: desktop | mobile
- auth_state: guest | signed_in
- parcel_mode: estimated | live | preset
- parcel_source: regrid | county_gis | fallback | estimated | preset | unknown
- state_code: two-letter US state code when already known
- feasibility_status: eligible | review_needed | blocked | unknown
- lot_size_bucket: under_3000 | 3000_4999 | 5000_7499 | 7500_9999 | 10000_plus
- adu_sqft_bucket: under_400 | 400_599 | 600_799 | 800_999 | 1000_plus
- report_format: print | html | csv | share
- purchase_type: certificate | lead_unlock | credit_pack
- purchase_channel: web_stripe | ios_storekit | android_play
- builder_match_bucket: none | one | two_three | four_plus
- result: success | fallback | error | canceled
- entry_source: landing_cta | shared_link | unknown
- search_mode: free_text | places
- roof_style: shed | gable | flat
- finish: cedar | lap | stucco | board
- triage_status: new | interested | not-a-fit (retain the code's spelling)
- access_status: locked | unlocked; derive from BuilderInboxItem.unlocked
- project_value_bucket: under_100000 | 100000_199999 | 200000_299999 | 300000_499999 | 500000_plus | unknown
- match_reason_count_bucket: none | one | two_three | four_plus
- unlock_mode: paid | credit | demo | unknown
- latency_bucket: under_500ms | 500_1499ms | 1500_2999ms | 3000_9999ms | 10000ms_plus | unknown
- has_ai_brief: true | false

Source mapping: LiveParcelData.source regrid → regrid, county-gis → county_gis, fallback → fallback. Statewide GIS resolves as county-gis in the current API. USA Structures enriches footprint evidence and is not a parcel_source. Use estimated/preset only for explicit client modes; unavailable source maps to unknown, without guessing a provider.

Feasibility mapping: use summarizeFeasibility(parcel, result, config, placement).verdict from lib/feasibility-verdict.ts, with the same inputs as the displayed summary. Map Likely Feasible → eligible, Needs Review → review_needed, and Unlikely → blocked; use unknown only when no valid summary exists. Never independently derive this parameter from zoningStatus or an individual blocked constraint. These are planning-estimate labels, not permitting determinations.

Entry attribution: when consent is already granted, the initiating landing CTA stores a bounded landing_cta marker for the next Studio navigation. A share link may carry an explicit allowlisted shared_link source marker, read only after consent and removed from all analytics URL context. Consume one current-navigation marker once at the Studio route boundary; a same-navigation internal CTA marker takes precedence over a shared-link marker. Clear internal markers on consumption or canceled navigation, and expire them after five minutes. Never infer source from parcel parameters, a referrer, or the absence of a marker: use unknown. Loading a saved scenario inside an existing Studio entry does not create another studio_opened event. Do not store or reconstruct denied-period attribution; late consent uses unknown unless a current consented navigation establishes source.

Search mapping: AddressSearch.onSelect emits places; onSubmitText, including signed-in manual submissions and server-suggestion fallback, emits free_text. auth_state independently records whether the user is signed in.

Billing mapping: detectPurchaseChannel() web → web_stripe, app-store → ios_storekit, google-play → android_play. Screen size does not identify billing channel.

Bucket rules: numeric intervals use inclusive lower/exclusive upper bounds (for example 500 ≤ latency < 1500). Lot/ADU sizes are nonnegative square feet; match/reason counts are nonnegative integers. Omit lot/ADU buckets for missing, negative, or non-finite inputs. For project_value_bucket, use the existing lead preview buildBandLow in USD, not a private exact estimate; invalid/missing/non-USD amounts map to unknown. Latency is elapsed milliseconds measured from lookup start to settlement; invalid/missing values map to unknown.

unlock_mode mapping: demo when explicitly confirmed by the grant; credit for a confirmed credit spend (including a store credit purchase followed by spend); paid for a confirmed direct paid unlock; unknown when reconciliation does not expose provenance. Do not infer payment from an unlocked entitlement. builder_lead_preview_viewed emits access_status=locked by definition.

Monetary parameters: currency is the actual three-letter ISO currency code and value is a finite nonnegative amount in that currency's major units. Checkout values may use a confirmed current quote; purchase values require the verified sale amount. Omit unavailable checkout amounts and suppress monetary purchase events when the verified amount is unavailable. Never use the web list price for a localized store transaction.

Avoid high-cardinality raw strings.

## Phase 1 event contract

These events are the minimum product-funnel contract.

### 1. studio_opened

Business meaning:
The user entered the Studio product surface.

Fire:
Once per Studio route entry when current consent is granted and the analytics dispatcher is ready, before recording later events from that entry. Own this at the route boundary outside SignedInStudioGate so the initial address gate is part of Studio entry. If consent or dispatcher readiness arrives while the route is still open, emit once then using current state; this is a new observation, not replay of denied-period actions. Keep the sent flag across gate-to-studio transitions and React remounts within that entry. Withdrawal cancels any pending observation; regrant does not duplicate an entry already sent.

Parameters:
- device_mode
- auth_state
- parcel_mode when known
- entry_source from the common bounded domain

Owner:
app/(firebase)/studio/page.tsx, above SignedInStudioGate, native onboarding, and FeasibilityStudio.

### 2. address_search_submitted

Business meaning:
The user intentionally submitted an address lookup.

Fire:
On an accepted lookup submission, not on every keystroke. Include the signed-in entry gate and landing address handoff as well as searches inside the Studio; a handoff is one submission, not another event at each boundary. Only observe submissions made after consent and analytics readiness; never replay a pre-consent handoff.

Parameters:
- search_mode: free_text | places
- auth_state
- device_mode

Do not send the address query.

Owner:
SignedInStudioGate.lookupText/lookupCoordinates plus FindStep / ConstraintsPanel / FeasibilityInspector, delegating to one shared submission helper. Pass only the bounded search mechanism, never the query or coordinates.

### 3. parcel_lookup_completed

Business meaning:
A parcel lookup attempt finished.

Fire:
Exactly once per accepted attempt after the complete geocode/parcel lookup settles, including geocoding failures before fetchParcel. Start latency when the accepted lookup begins and stop at settlement. Emit only if consent was granted at start and remains granted at settlement; a withdrawal cancels that attempt's analytics even if consent is later regranted. Suppress abandoned/canceled attempts. Use a local attempt token for deduplication across handoff boundaries; never send it to GA4.

Parameters:
- result: success | fallback | error
- parcel_mode
- parcel_source
- auth_state
- state_code when known
- latency_bucket from the common bounded domain (register it as an event-scoped custom dimension)

Owner:
Both SignedInStudioGate.lookupText/lookupCoordinates (before FeasibilityStudio mounts) and ParcelProvider.searchByAddress/searchParcel in lib/parcel-context.tsx must use the same completion helper. Handing a resolved parcel into the provider is not a second lookup. A helper only around fetchParcel is insufficient because earlier geocoding can fail.

### 4. feasibility_result_viewed

Business meaning:
The user reviewed a usable feasibility result.

Fire:
Once for the first meaningful review of each resolved parcel context in a Studio session. Changing a slider or revisiting the step must not refire it. A new parcel can generate another event, but session KPIs still deduplicate by the GA4 session unit. Keep parcel deduplication local; never transmit the address or parcel key.

Parameters:
- parcel_mode
- parcel_source
- feasibility_status
- lot_size_bucket
- adu_sqft_bucket
- auth_state
- state_code when known

Owner:
components/FeasibilityStudio.tsx at the Feasibility/Rules transition.

### 5. adu_design_committed

Business meaning:
The user progressed from design controls after making or accepting a configuration.

Fire:
When leaving the Design step toward Certificate/Builders, not on each slider change.

Parameters:
- adu_sqft_bucket
- roof_style from the common bounded domain
- finish from the common bounded domain
- feasibility_status

Owner:
components/FeasibilityStudio.tsx step transition.

### 6. scenario_saved

Business meaning:
A signed-in user successfully persisted a scenario.

Fire:
Only after the save succeeds.

Parameters:
- parcel_mode
- feasibility_status

Owner:
handleSaveScenario in components/FeasibilityStudio.tsx.

### 7. report_opened

Business meaning:
The concept/certificate report preview became visible.

Fire:
When reportOpen changes from false to true after an explicit view action or a newly reconciled certificate purchase opens the report. Passive entitlement hydration alone does not count.

Parameters:
- feasibility_status
- has_ai_brief: boolean
- auth_state

Owner:
handleGenerateReport in components/FeasibilityStudio.tsx.

### 8. report_exported

Business meaning:
The user exported or shared the report.

Fire:
After the export/share action begins successfully.

Parameters:
- report_format: print | html | csv | share
- feasibility_status

Owner:
ReportPreview callbacks or their wrappers in FeasibilityStudio.

### 9. certificate_paywall_viewed

Business meaning:
A user who does not already own the certificate viewed the paid certificate offer.

Fire:
Once per certificate surface view.

Parameters:
- auth_state
- feasibility_status
- purchase_channel

Owner:
components/studio/CertificatePanel.tsx.

### 10. certificate_checkout_started

Business meaning:
The user intentionally started certificate checkout.

Fire:
Immediately before the checkout client call after validation.

Parameters:
- value
- currency
- purchase_channel
- feasibility_status

Owner:
components/studio/CertificatePanel.tsx.

### 10a. certificate_checkout_redirected

Business meaning:
The checkout API returned a Stripe Checkout URL and the browser is navigating to it. Unlike certificate_checkout_started, this proves the buyer reached Stripe.

Fire:
Immediately before `window.location.assign` to the returned Checkout URL. Never on API errors, store-billing grants, demo grants or already-purchased grants.

Parameters:
- value
- currency
- purchase_channel
- feasibility_status

Owner:
components/studio/CertificatePanel.tsx.

### 10b. certificate_checkout_cancelled

Business meaning:
The buyer left Stripe Checkout through its back/cancel link. Leaving Checkout is not a payment failure.

Fire:
Once, when the studio loads with the server-stamped `checkout=cancelled` marker from the certificate Checkout `cancel_url`. The panel strips the marker with `history.replaceState`, so a reload does not fire it again.

Parameters:
- purchase_channel

feasibility_status is deliberately omitted: the event fires before the studio restores the scenario from the URL, so the status would describe the default lot.

Owner:
components/studio/CertificatePanel.tsx.

### 11. purchase

Business meaning:
A certificate purchase grant has been reconciled successfully.

GA4 standard event:
Use the GA4 recommended purchase event in addition to the existing Google Ads conversion event.

Parameters:
- transaction_id: the opaque analytics_order_id defined in the P0 prerequisites
- value: verified sale value in major currency units
- currency: actual sale currency
- items: one item with item_id=certificate, item_name=Certificate of Feasibility, item_category=certificate, quantity=1, and price equal to the verified certificate sale value
- purchase_channel

item_category belongs inside items, not solely at event level. Follow [Google's ecommerce event format](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce).

Rules:
- fire once per verified live paid order, with a stable safe ID across refreshes
- require current consent, a safe ID, and verified amount/currency; suppress demo/test grants and entitlement-only restores without a newly reconciled order
- preserve the Google Ads once-per-order dedupe property while migrating away from identity-bearing IDs
- do not use GA4 as authoritative revenue

Owner:
components/studio/CertificatePanel.tsx after purchase access is confirmed.

### 12. builder_matches_viewed

Business meaning:
A signed-in homeowner viewed the builder destination and the matching result was known.

Fire:
Once per relevant parcel.

Parameters:
- builder_match_bucket
- state_code when known
- feasibility_status

Owner:
BuildersPanel / FeasibilityStudio builder-step integration.

### 13. builder_connection_submitted

Business meaning:
A homeowner successfully created a ConnectionRequest.

Fire:
Only after createConnectionRequest succeeds.

Parameters:
- builder_match_bucket
- feasibility_status
- adu_sqft_bucket
- state_code when known

Owner:
handleBuilderLeadSubmit in components/FeasibilityStudio.tsx.

### 14. builder_lead_preview_viewed

Business meaning:
A builder viewed a locked matched lead preview.

Fire:
At most once per rendered lead per dashboard session.

Parameters:
- triage_status
- access_status
- project_value_bucket
- match_reason_count_bucket

Do not send lead IDs, address, homeowner contact, or APN.

Owner:
builder lead-card/list boundary.

### 15. builder_unlock_checkout_started

Business meaning:
A builder intentionally started a paid lead unlock.

Fire:
Before checkout begins after eligibility validation.

Parameters:
- value
- currency
- purchase_type: lead_unlock
- purchase_channel from the runtime billing mapping; never hard-code it

Owner:
builder unlock slip / lead unlock checkout boundary.

### 16. builder_lead_unlocked

Business meaning:
The client reconciled a granted lead unlock.

Fire:
Once per newly reconciled confirmed grant associated with a consented unlock attempt, whether access changes in place or is already unlocked on the first post-checkout dashboard load. Before redirect, retain a pending attempt only while consent is granted. On return, reconcile authenticated grant state with that pending attempt; the unlocked=1 URL marker alone is not proof of payment or access. Allow bounded refresh/retry for webhook delay, but emit nothing without confirmed access. Deduplicate the in-place and return paths with one opaque grant/attempt receipt and a durable sent marker; neither raw lead IDs nor account IDs reach GA4. Require consent at attempt and reconciliation, clear pending analytics state on withdrawal, and never replay denied-period unlocks or passive historical grants. Safe receipts and return reconciliation are implementation prerequisites; they do not exist merely because this document is merged.

Parameters:
- purchase_type: lead_unlock
- unlock_mode from the common bounded domain
- triage_status

Business reporting:
Use Firestore unlock grants for entitlement counts and timestamps. Monetary revenue comes from reconciled processor/store financial records; a credit spend or demo grant is not a new sale.

Owner:
BuilderInbox for in-place grants and BuilderDashboard for authenticated post-Stripe-return reconciliation, using one shared dedupe helper. Dashboard hydration can already contain unlocked=true before BuilderInbox mounts, so do not rely solely on a locked-to-unlocked render transition.

## Phase 2 event contract

Add these only after the core funnel is stable.

- auth_prompt_shown
- sign_up
- login
- ai_project_brief_requested
- ai_project_brief_completed
- ai_project_brief_failed
- style_match_requested
- style_match_completed
- style_match_failed
- builder_triage_changed

Do not delay Phase 1 to instrument these.

## Existing events to preserve

Preserve existing event names and intended deduplication, subject to the P0 privacy corrections. Do not preserve unsafe URL collection, post-withdrawal sending, or identity-bearing transaction IDs:

- ADU landing CTA events generated by aduCtaEvent
- Cesium photoreal diagnostic event
- Google Ads certificate purchase conversion

Where possible, document existing names in the analytics event map so future engineers can see both the legacy and core-funnel contract.

## Recommended implementation shape

### A. Keep the current GA4 helper

Continue using lib/analytics/gtag.ts after implementing the P0 URL sanitization and current-consent guards. Reusing the module does not mean its present privacy behavior is already sufficient.

Do not add PostHog, Amplitude, Segment, Mixpanel, or another analytics SDK in this pass.

### B. Add one typed event module

Create lib/analytics/events.ts.

Responsibilities:

- central event-name constants
- shared bounded parameter types
- small helper functions for event-specific calls
- bucket helpers for lot size, ADU size, builder matches, and project value
- no business persistence
- no PII
- no analytics script loading

The module should delegate to trackEvent.

### C. Keep instrumentation close to successful actions

Examples:

- parcel lookup event belongs where the parcel request settles
- scenario_saved belongs after Firestore save succeeds
- builder_connection_submitted belongs after the connection request write succeeds
- purchase belongs after purchase access is confirmed
- report_exported belongs in the successful export/share callback

Do not infer success from button clicks when the underlying action can fail.

## GA4 custom dimensions

Register only dimensions that answer a recurring business question.

Recommended event-scoped custom dimensions:

- app_surface
- auth_state
- device_mode
- parcel_mode
- parcel_source
- feasibility_status
- state_code
- report_format
- purchase_type
- purchase_channel
- builder_match_bucket
- result
- latency_bucket
- entry_source
- search_mode

Parcel Health reports use the registered latency_bucket dimension for GA4 distributions; raw latency percentiles belong in operational telemetry. DebugView visibility alone is not a reporting definition. See [Google's custom definitions guidance](https://support.google.com/analytics/answer/14240153).

Do not register raw transaction_id as a custom dimension.
Do not register high-cardinality property or user identifiers.

## Dashboard specification

### View 1 — Product funnel

Report separate entry paths:

- Live lookup: studio_opened → address_search_submitted → parcel_lookup_completed with success or fallback → feasibility_result_viewed. Include lookups made in SignedInStudioGate before FeasibilityStudio mounts.
- Preset/demo: studio_opened → feasibility_result_viewed with parcel_mode=preset. Do not require or synthesize an address submission or API lookup.
- Restored/shared/estimated context: studio_opened → feasibility_result_viewed for the current context; require lookup steps only if an actual lookup occurred.

From activation, measure certificate_checkout_started and builder_connection_submitted as separate intent branches. Neither requires report_opened. For new certificate buyers, purchase reconciliation may then open the report; existing owners may open it without new checkout. Report views/exports are separate engagement measures, not prerequisites for either intent branch.

Build conversion counts from distinct sessions and observed events within each path. Mark late-consent entries as partially observed and do not fabricate their earlier steps. Multiple parcel attempts in one session are not separate session activations; attempt-level parcel health is reported separately.

Show:

- weekly counts
- step conversion
- drop-off
- new versus returning when GA4 supports it
- desktop/mobile
- guest/signed-in

### View 2 — Parcel health

Show:

- lookups
- success/fallback/error share
- parcel source mix
- latency bucket distribution (operational telemetry may also report percentiles)
- state-level performance
- photoreal errors

Use operational telemetry as the stronger source when GA4 consent bias would hide failures.

### View 3 — Monetization

Authoritative source first.

Show:

- certificate revenue
- lead-unlock revenue
- credit-pack revenue
- purchases by channel
- consented same-session certificate revenue per activated feasibility session, separate from authoritative total revenue
- certificate paywall → checkout conversion
- certificate checkout started → Stripe redirect → purchase, with Stripe cancellations reported separately
- matched-lead unlock rate from first-party records; preview impressions reported separately

### View 4 — Marketplace liquidity

Show:

- homeowner connection requests
- matched leads
- leads with at least one unlock
- median time to first unlock
- builder match rate
- builder unlock rate
- zero-match share

## Data-quality checks

Before trusting a KPI, verify:

- analytics consent is configured and functioning
- production has NEXT_PUBLIC_GA_MEASUREMENT_ID
- expected events appear in GA4 DebugView or Realtime
- event parameters use only documented bounded values
- no street address, coordinate, email, phone, owner name, APN, or free text reaches GA4
- purchase is deduped by a safe opaque order ID; demo/test grants are excluded
- mixed currency/unit inputs and refunds/chargebacks reconcile correctly
- parcel lookup events reconcile with API traffic directionally
- Firestore purchase and unlock grants reconcile with Stripe/store transactions
- connection-request counts reconcile with builder_connection_submitted directionally, allowing for consent opt-outs

## Test plan

### Unit tests

Add tests for lib/analytics/events.ts:

- helpers delegate to trackEvent with the expected event name
- bucket boundaries are deterministic
- no helper requires PII
- invalid/high-cardinality inputs are not accepted where types can prevent them

Update tests at instrumentation call sites:

- signed-in pre-mount gate and in-Studio lookup success/fallback/geocode-error paths emit once per attempt; passing resolved data to ParcelProvider does not duplicate completion
- preset, restored, and estimated entries activate without synthetic lookup events
- feasibility_status follows the rendered summarizeFeasibility verdict, including over-coverage review, minimum-envelope failure, placement review, and absent-summary cases
- free_text covers guest and signed-in submissions; source markers obey precedence, expiry, consumption, and unknown fallback
- failed scenario save does not emit scenario_saved
- failed builder submission does not emit builder_connection_submitted
- certificate checkout click emits checkout-start once
- reconciled purchase emits purchase once
- in-place and Stripe-return unlock reconciliation emit once for a confirmed new grant, including initially unlocked dashboard data and delayed webhook delivery; duplicate returns, forged markers, historical grants, and withdrawal do not emit
- KPI fixtures use one population and unit for each numerator/denominator, with cohort cutoff, currency, demo exclusions, and duplicate records covered
- report export emits the correct format

### Consent behavior

Implement and verify the required contract; the current helper behavior does not yet meet all of it:

- without measurement ID, no tag and no banner
- before consent, product event calls are harmless no-ops
- after consent and dispatcher readiness, Studio entry emits once while still open and precedes subsequent observed events; gate-to-studio handoff and regrant do not duplicate it
- after withdrawal, analytics cookies are removed and no new events send, even when window.gtag remains defined
- initial and navigated `/studio?q=<address>` URLs never reach page-view, Ads, or inherited event context
- denied-period events are never replayed on regrant
- purchase identifiers and item fields contain no account/property identity
- locale-specific store prices are not replaced with the web list price

### E2E

Use a non-production GA measurement ID for analytics E2E.

Verify representative journeys:

1. guest enters Studio and searches
2. parcel lookup completes
3. user reaches feasibility
4. signed-in user opens report
5. certificate checkout initiation path
6. builder connection submission path

Do not require external GA network delivery to make product E2E pass. Mock or inspect the local gtag queue where appropriate.

## Implementation checklist

### P0 — Existing-layer privacy prerequisites

- [ ] sanitize initial/navigation URL context and inherited Google tag/Ads context
- [ ] enforce current consent in pageview, trackEvent, and Ads conversion helpers
- [ ] explicitly disable collection and queued events on withdrawal
- [ ] persist safe opaque analytics order IDs and migrate conversion dedupe safely
- [ ] add regression coverage for those behaviors before new event rollout

### P0 — Analytics contract

- [ ] Add lib/analytics/events.ts
- [ ] Add event helper tests
- [ ] Document existing legacy event names
- [ ] Add safe bucket helpers and a single feasibility verdict mapper
- [ ] Add consent-aware Studio route entry, bounded navigation attribution, and shared gate/provider lookup instrumentation

### P0 — Homeowner funnel

- [ ] studio_opened
- [ ] address_search_submitted
- [ ] parcel_lookup_completed
- [ ] feasibility_result_viewed
- [ ] adu_design_committed
- [ ] scenario_saved
- [ ] report_opened
- [ ] report_exported

### P0 — Homeowner monetization

- [ ] certificate_paywall_viewed
- [ ] certificate_checkout_started
- [ ] GA4 purchase event after confirmed certificate grant
- [ ] preserve Google Ads dedupe while correcting privacy and order identifiers

### P0 — Marketplace

- [ ] builder_matches_viewed
- [ ] builder_connection_submitted
- [ ] builder_lead_preview_viewed
- [ ] builder_unlock_checkout_started
- [ ] builder_lead_unlocked, with consent-aware in-place/return reconciliation and opaque durable deduplication

### P0 — Privacy and QA

- [ ] tests prove no address/coordinate/contact fields are sent
- [ ] update analytics documentation with the no-PII contract
- [ ] verify consent withdrawal and regrant satisfy the corrected contract
- [ ] verify GA4 parameter cardinality is bounded

### P1 — Reporting setup

- [ ] register GA4 custom dimensions
- [ ] build Product Funnel view
- [ ] build Parcel Health view
- [ ] build Monetization view
- [ ] build Marketplace Liquidity view
- [ ] implement normalized financial imports, currency/unit validation, reversal handling, and grant reconciliation

### P2 — Advanced analysis

- [ ] instrument AI brief/style-match events
- [ ] add cohort/retention analysis
- [ ] enable GA4 BigQuery export if event volume and analysis needs justify it
- [ ] define weekly founder KPI readout

## Definition of done

This work is complete when:

1. The core parcel-to-decision funnel can be measured without collecting PII.
2. GA4 behavior metrics clearly distinguish product usage from authoritative payment and marketplace records.
3. A developer can find every event name and parameter definition in one module and this document.
4. Core events have tests for success/failure and duplicate firing.
5. Revenue reconciles to processor/store financial records; grants reconcile entitlement counts without double-counting credit spend or demo value.
6. LotFoundry can produce a weekly KPI readout covering activation, high intent, revenue, parcel health, and marketplace liquidity.

## Review basis

Contract corrections were checked against master d637229: lib/analytics/gtag.ts, components/analytics/GoogleAnalytics.tsx, lib/analytics/adsConversion.ts, components/studio/CertificatePanel.tsx, lib/parcel-types.ts, lib/feasibility.ts, lib/marketplace-types.ts, lib/commerce/purchase-channel.ts, lib/lead-unlock-api.ts, lib/server/certificate-purchases.ts, lib/server/lead-unlocks.ts, app/api/stripe/webhook/route.ts, and components/FeasibilityStudio.tsx. Follow-up review against master 3e0c997 also checked app/(firebase)/studio/page.tsx, SignedInStudioGate, AddressSearch, BuilderDashboard, BuilderInbox, lib/feasibility-verdict.ts, and lib/marketplace-types.ts. All implementation checklist items remain outstanding until their code and tests land.
