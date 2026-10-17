# Mobile discovery measurement

Updated October 3, 2026.

## Event contract

All consented custom events and explicit page views carry `app_platform`: `web`,
`android`, or `ios`. The existing native bridge / purchase-channel detection is
the source; a narrow phone browser remains web. No address, account identifier,
free text or query string is added. Events remain off without configured analytics
and current consent. This is prospective measurement, not a correction to history.

`play_store_clicked` records outbound intent with `link_placement`: `hero`,
`footer`, `calculator`, or `city_guide`. Hero/footer URLs pass fixed Play referrer
UTMs for `android_discovery`. Existing city guide referrers retain their city slug
and `adu_guide` campaign. These links do not collect an address.

`study_feedback_clicked` has `feedback_destination`: `feedback_form` or
`google_play`. The invitation appears after a successful saved study, is dismissible,
and offers both destinations on Android without ratings screening or incentives.
The Google Play link records a click, never an assumed review submission.

## GA4 setup and reporting

In yardup-2026 (property 545273141), register event-scoped custom dimensions:

| Display name | Event parameter |
| --- | --- |
| App platform | `app_platform` |
| Play link placement | `link_placement` |
| Feedback destination | `feedback_destination` |

Build a consented Studio funnel filtered by App platform = android:
`studio_opened` → `address_search_submitted` → `parcel_lookup_completed`
(result success) → `scenario_saved`. Report fallback and error lookups separately.
Use user counts consistently and disclose that users declining consent are excluded.
`studio_opened` is an app session entry, not Android's first-install event. Play
device first opens remain the authority for first opens; do not fabricate a web
`first_open` equivalent or promise a user-level join across the two systems.

Read acquisition independently in Play Store listings: visitors, install-button
clicks, source and UTM breakdowns where available. Completed acquisitions and
device first opens are separate Console measures. Do not label install clicks
as completed installs or divide metrics from different windows/populations.

Validation: test ordinary web versus native bridge values, decline/revoke/no-ID
suppression, and tagged outbound URLs. Verify a consented event in GA4 after the
production deploy. Custom dimension processing may lag; historical events will
not acquire a new dimension retroactively.

## Acquisition test

No additional ad spend. Existing LotFoundry social channels use separate fixed
referrers for `android_discovery_202610`. Partner outreach is prepared for review,
not sent to unapproved recipients. Website content links lead with California ADU
cost/rent planning and maintain estimate/source disclosures.

Baseline: Play Aug 30–Sep 26: 14 visitors, 9 install clicks (64% displayed CTR),
Explore 10, ads/referrals 4. GSC Sep 2–29: 255 impressions and 3 clicks. GA4
Sep 5–Oct 2: 300 sessions and 161 active users; Direct 221, Organic Search 15.
These are different windows and units, not a single funnel.

Review on October 17, then again after approximately 100 qualified listing
visitors. First assess qualified visitor volume and Android successful lookups;
then compare install-click and save behavior. This sample target is a learning
checkpoint, not proof of statistical significance. Record unknown results as
blank, not zero. Continue only channels producing relevant visitors and useful
product feedback; change one major listing message at a time.
