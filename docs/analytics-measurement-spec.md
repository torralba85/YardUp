# LotFoundry Analytics Measurement Specification

Status: implementation-ready
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

The missing layer is a consistent product-event taxonomy and KPI contract.

## Measurement principles

### 1. Use the right source for the right question

GA4 is the behavioral source for consented user journeys.

Firestore and payment systems are the authoritative source for completed transactions and marketplace records.

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

### KPI 1 — Activated Feasibility Projects

Definition:

Unique consented Studio sessions that record feasibility_result_viewed after a usable parcel or estimated parcel has been resolved.

Formula:

Activated Feasibility Projects = count of unique sessions with feasibility_result_viewed

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

Successfully granted paid value across LotFoundry monetization surfaces.

Authoritative sources:

- certificate purchase grants
- builder lead unlock grants
- builder credit-pack purchase grants, when used

GA4 is not the source of truth for this KPI.

Required cuts:

- purchase type
- platform or purchase channel
- week
- new versus returning purchaser where available from first-party data
- builder versus homeowner revenue

Recommended operating derivative:

Revenue per Activated Feasibility Project =
authoritative gross platform revenue
divided by
Activated Feasibility Projects

Treat this as an operating ratio, not a GA4-only metric.

## Marketplace KPI framework

These are secondary but important because LotFoundry has a two-sided builder marketplace.

### Builder Match Rate

Unique activated homeowner projects with at least one eligible local builder
divided by
activated homeowner projects that reach the Builders step

### Homeowner Connection Rate

builder_connection_submitted
divided by
builder_matches_viewed sessions with at least one match

### Lead Unlock Rate

Unique leads unlocked by at least one builder
divided by
eligible matched lead previews shown to builders

Use Firestore lead records and unlock grants as the authoritative source when calculating this rate for business reporting.

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
- Aerial/photoreal availability rate
- Zoning coverage rate
- Boundary-geometry coverage rate

Recommended segmentation:

- source
- auth state
- parcel mode
- state code
- device mode

Do not segment by exact address or coordinates.

## Common event parameters

Use only parameters relevant to a specific event. Do not attach all fields to every event.

Recommended bounded parameters:

- app_surface: landing | studio | builder
- device_mode: desktop | mobile
- auth_state: guest | signed_in
- parcel_mode: estimated | live | preset
- parcel_source: regrid | county_gis | state_gis | structures | fallback | estimated | preset | unknown
- state_code: two-letter US state code when already known
- feasibility_status: eligible | review_needed | blocked | unknown
- lot_size_bucket: under_3000 | 3000_4999 | 5000_7499 | 7500_9999 | 10000_plus
- adu_sqft_bucket: under_400 | 400_599 | 600_799 | 800_999 | 1000_plus
- report_format: print | text | csv | share
- purchase_type: certificate | lead_unlock | credit_pack
- purchase_channel: web_stripe | ios_storekit | android_play
- builder_match_bucket: none | one | two_three | four_plus
- result: success | fallback | error | canceled

Avoid high-cardinality raw strings.

## Phase 1 event contract

These events are the minimum product-funnel contract.

### 1. studio_opened

Business meaning:
The user entered the Studio product surface.

Fire:
Once per Studio mount.

Parameters:
- device_mode
- auth_state
- parcel_mode when known
- entry_source when bounded, for example landing_cta | direct | saved_scenario | shared_link | unknown

Owner:
components/FeasibilityStudio.tsx or the Studio route wrapper.

### 2. address_search_submitted

Business meaning:
The user intentionally submitted an address lookup.

Fire:
On submit, not on every keystroke.

Parameters:
- search_mode: guest_text | places
- auth_state
- device_mode

Do not send the address query.

Owner:
FindStep / ConstraintsPanel / FeasibilityInspector boundary, or a shared address-search callback.

### 3. parcel_lookup_completed

Business meaning:
A parcel lookup attempt finished.

Fire:
Exactly once per search attempt after the lookup settles.

Parameters:
- result: success | fallback | error
- parcel_mode
- parcel_source
- auth_state
- state_code when known
- latency_ms or a bounded latency bucket

Owner:
lib/parcel-context.tsx is the preferred single instrumentation point.

### 4. feasibility_result_viewed

Business meaning:
The user reviewed a usable feasibility result.

Fire:
Once per Studio session for the first meaningful result review, and again only when a new parcel is loaded.

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
- roof_style as a bounded enum
- finish as a bounded enum
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
When reportOpen changes from false to true due to user action.

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
- report_format: print | text | csv | share
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

### 11. purchase

Business meaning:
A certificate purchase grant has been reconciled successfully.

GA4 standard event:
Use the GA4 recommended purchase event in addition to the existing Google Ads conversion event.

Parameters:
- transaction_id
- value
- currency
- item_category: certificate
- purchase_channel

Rules:
- fire once
- preserve existing Google Ads conversion dedupe behavior
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
- purchase_channel: web_stripe

Owner:
builder unlock slip / lead unlock checkout boundary.

### 16. builder_lead_unlocked

Business meaning:
The client reconciled a granted lead unlock.

Fire:
Once when access changes to unlocked.

Parameters:
- purchase_type: lead_unlock
- unlock_mode: paid | credit | demo when useful
- triage_status

Business reporting:
Use Firestore unlock grants as authoritative counts and revenue.

Owner:
builder lead access reconciliation boundary.

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

Do not break or rename current event behavior without a separate migration:

- ADU landing CTA events generated by aduCtaEvent
- Cesium photoreal diagnostic event
- Google Ads certificate purchase conversion

Where possible, document existing names in the analytics event map so future engineers can see both the legacy and core-funnel contract.

## Recommended implementation shape

### A. Keep the current GA4 helper

Continue using lib/analytics/gtag.ts.

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

Do not register raw transaction_id as a custom dimension.
Do not register high-cardinality property or user identifiers.

## Dashboard specification

### View 1 — Product funnel

Sequence:

studio_opened
→ address_search_submitted
→ parcel_lookup_completed with success or fallback
→ feasibility_result_viewed
→ report_opened
→ certificate_checkout_started or builder_connection_submitted

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
- latency
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
- revenue per activated feasibility project
- certificate paywall → checkout conversion
- builder preview → unlock conversion

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
- purchase is deduped
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

- parcel lookup success/fallback/error emits once
- failed scenario save does not emit scenario_saved
- failed builder submission does not emit builder_connection_submitted
- certificate checkout click emits checkout-start once
- reconciled purchase emits purchase once
- report export emits the correct format

### Consent behavior

Preserve the existing contract:

- without measurement ID, no tag and no banner
- before consent, product event calls are harmless no-ops
- after consent, events can send
- after withdrawal, analytics cookies are removed and no new events send

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

### P0 — Analytics contract

- [ ] Add lib/analytics/events.ts
- [ ] Add event helper tests
- [ ] Document existing legacy event names
- [ ] Add safe bucket helpers

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
- [ ] preserve existing Google Ads conversion

### P0 — Marketplace

- [ ] builder_matches_viewed
- [ ] builder_connection_submitted
- [ ] builder_lead_preview_viewed
- [ ] builder_unlock_checkout_started
- [ ] builder_lead_unlocked

### P0 — Privacy and QA

- [ ] tests prove no address/coordinate/contact fields are sent
- [ ] update analytics documentation with the no-PII contract
- [ ] verify consent behavior remains unchanged
- [ ] verify GA4 parameter cardinality is bounded

### P1 — Reporting setup

- [ ] register GA4 custom dimensions
- [ ] build Product Funnel view
- [ ] build Parcel Health view
- [ ] build Monetization view
- [ ] build Marketplace Liquidity view
- [ ] reconcile revenue against first-party grants

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
5. Revenue and lead-unlock reporting reconciles to first-party purchase/grant records.
6. LotFoundry can produce a weekly KPI readout covering activation, high intent, revenue, parcel health, and marketplace liquidity.
