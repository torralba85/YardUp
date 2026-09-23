# Google Play homeowner listing

Prepared 2026-09-19 for `com.lotfoundry.app`. **Draft; not saved or published in Play Console.**

The installed app focuses on homeowner exploration and an optional Certificate of Feasibility. Builder registration, dashboard access and new lead-credit purchases are web-only, including mobile browsers. Existing store product IDs and receipt verification remain available for historical purchases.

## Proposed listing copy

### App title

```text
LotFoundry: ADU Calculator
```

### Short description

```text
Explore ADU potential: estimated build cost, rent, payback and 3D lot fit.
```

### Full description

```text
Could an ADU fit in your backyard? LotFoundry helps homeowners explore an accessory dwelling unit with a 3D lot model and estimates for build cost, rental income and payback.

Start with a demo property, or sign in to explore your own address. Compare a backyard home for family, rental income or future plans before committing to design work.

EXPLORE YOUR LOT
Review available parcel information, estimated setbacks and building placement. Property data and coverage vary by location. The model is a starting point for planning, not a boundary survey.

COMPARE YOUR OPTIONS
Adjust your ADU concept and compare estimated construction costs, monthly rent and payback. Use the numbers to prepare questions for local professionals, rather than treating them as quotes or guaranteed returns.

SEE A CONCEPT IN 3D
Explore size, roof and finish options on a lot model. Check placement warnings as you compare possibilities for a small backyard home, granny flat or accessory dwelling unit.

KEEP YOUR PLANNING TOGETHER
Save scenarios to your account. An optional in-app purchase unlocks a Certificate of Feasibility, an early planning report you can review and share. Basic exploration does not require a certificate purchase. The purchase price is shown in the app before checkout.

LotFoundry is an estimation and early planning tool. It does not issue permit approvals, appraisals, construction documents or investment guarantees. Confirm local rules, site conditions, costs and rents with qualified professionals before making a building decision.
```

Category: retain **House & Home**. Review available Console tags for the actual homeowner planning use case; Google Play has no App Store-style keyword field. Do not add keyword blocks, invented ratings, guaranteed savings or ranking claims.

The existing title already appears for the observed `ADU feasibility` query. The proposed title targets calculator language; this is a hypothesis to measure, not a ranking guarantee. Retain feasibility language in the description and compare acquisition reports after the update.

## Screenshots to replace

The public listing's icon uses the current mark, but its five screenshot controls expose retired brown/yellow Studio and landing designs. Refresh screenshots from the release being published:

1. Current homeowner welcome/demo selection on a phone.
2. Current 3D Studio, with estimate and parcel-source labels readable.
3. Cost/rent/payback comparison with estimate caveats intact.
4. Placement and setback review with visible warnings.
5. An unlocked certificate from a test/demo property, with private addresses and account data excluded.

Use actual app captures. Lead with the outcome, keep text readable on phones, and exclude builder prices and dashboard screens. The native-shell simulations used in browser tests are QA evidence, not real-device billing proof. Capture final listing assets on the published Android release before upload.

## Console verification still required

- Confirm the certificate is the only active purchasable product. Inspect all purchase options/offers and countries for the three builder IDs: `com.lotfoundry.builder.credit1`, `com.lotfoundry.builder.credits5`, `com.lotfoundry.builder.credits10`.
- Check Publishing overview for pending catalog/listing changes. The public US HTML still carried `$28.99 - $299.99 per item` on September 19; this does not prove the removed products remain purchasable. The range was not visible in the captured initial browser viewport.
- Recheck the public listing and the installed Play app after propagation. Do not claim the price range is corrected from a Console save alone.
- Verify production country/device eligibility, category, tags, and store-listing acquisition metrics in Console.
- Save approved metadata and screenshots, reload to confirm persistence, then distinguish review submission from public publication.

## Sources

- [Public listing](https://play.google.com/store/apps/details?id=com.lotfoundry.app)
- [Google: discovery and ranking](https://support.google.com/googleplay/android-developer/answer/9958766?hl=en)
- [Google: visibility and discovery issues](https://support.google.com/googleplay/android-developer/answer/9042516?hl=en)
- [Google: optimize Play search](https://support.google.com/googleplay/android-developer/answer/4448378?hl=en)
- [Google: listing fields and limits](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en)
