# Campaign attribution without property data

GA4 page paths, locations and referrers continue to omit all query strings and
fragments. After measurement consent, `lib/analytics/campaign.ts` maps approved
public UTM labels to GA4's `campaign_source`, `campaign_medium`, `campaign_name`
and optional `campaign_content`. GA4 receives these in configuration before held
events flush, and on events while the tagged URL is active.

No campaign data is stored before consent, and no new local/session storage is
used. A visitor who leaves the tagged landing URL before opting in may remain
unattributed. This preserves the consent boundary instead of collecting a
pre-consent journey. Normal GA4 session attribution handles later navigation.

## Publishing a campaign link

1. Add the exact public source, medium, campaign and optional content labels to
   the allowlists. Do not use addresses, emails, property/account identifiers,
   arbitrary free text or click IDs as campaign labels.
2. Include source, medium and campaign together. Unknown/incomplete combinations
   and duplicated campaign parameters are ignored; unknown content is dropped.
3. Verify a consented visit in the browser, a declined visit, and an internal QA
   visit. Keep local browser tests intercepted so they do not reach production GA4.
4. After a separately authorized release, verify the processed campaign in GA4
   Traffic acquisition. A local payload test does not prove production collection.

Example: `/adu-cost-calculator?utm_source=facebook&utm_medium=organic_social&utm_campaign=adu_size_comparison_20261111&utm_content=size_demo`.

Google's documented configuration fields:
https://support.google.com/analytics/answer/11259997?hl=en

Keep Stripe return referrals separate from new acquisition. Existing GA4 Admin
filter definitions and unwanted-referral settings are not changed by this code.
