# Store Listing Copy — App Store + Google Play

**Updated:** 2026-11-19

**App:** LotFoundry — ADU Feasibility Studio (`com.lotfoundry.app`)

**Status:** Draft for product, privacy, and counsel review. This file describes
current code paths; console declarations must be checked against the final
native build, provider contracts, and store guidance before submission.

## A. Data-processing inventory

| Data | Current code path | Purpose | Notes for review |
|---|---|---|---|
| Email, name, avatar, Firebase UID | Firebase Auth, including email/password, Google, and Apple sign-in | Account management | Confirm final provider scopes and account-linking behavior |
| Property address or coordinates | User input sent to Regrid, Google Maps/Geocoding/Places, ATTOM (signed-in street address, city, state and ZIP only), the US Census geocoder, public county/state parcel GIS services, and USA Structures | Feasibility, parcel lookup, address verification, market geography, and existing-building footprint estimates | Required only to use address-based estimates; public providers vary by parcel coverage |
| Paid certificate property records | The server sends Realie the street address, state and optional unit for the purchased certificate. A request for comparable sales also sends the matched property coordinates. | Display county property records and nearby sales | Per-property paid grant required. Provider requests exclude buyer and payment identifiers. |
| Rental and map context | RentCast receives parcel coordinates when live rent estimates are enabled. Browser tile requests identify the area in view to the selected map host. | Estimate rent and render the neighborhood | HUD rent tables are bundled data. |
| Home photo | Client removes EXIF/GPS, then sends an in-memory upload to OpenAI for style matching | AI concept generation | The app does not persist the original upload to Firestore or Storage; confirm processor terms and disclosure wording |
| Saved scenarios | Firestore under the authenticated user | Save, share, and restore estimates | Account deletion removes account-associated scenario data |
| Purchase and lead-unlock history | Stripe and Firestore ledger on the web; platform purchase proof for native stores | Purchases and entitlement grants | The application never accepts raw card numbers |
| Feedback | `/api/feedback` intake | Support and product feedback | Confirm support retention and access policy |
| Server diagnostics | Firebase Hosting and Cloud Functions logs | Reliability and security operations | Confirm platform retention settings |

There are no advertising SDKs in the current codebase, and no analytics SDK in
the native bundles. The web app runs Google Analytics 4 behind an opt-in cookie
banner (`components/analytics/GoogleAnalytics.tsx`): no tag loads and no cookie
is set until the visitor accepts, and advertising/personalization signals are
disabled. Since the store shells render the same web surface, treat GA as in
scope for App Privacy and Play Data Safety — see `docs/play-declarations.md`.
This is also not a claim that no processor collects operational logs; verify
each processor's current policy before completing either form.

### Third-party processors

- Google: Firebase Auth/Firestore, Maps, Geocoding, Places, and Analytics 4
  (web, opt-in only).
- Realie (Realie.ai) supplies paid certificate property history and on-demand comparable sales.
- RentCast supplies optional live rent estimates.
- Cesium serves 3D viewer assets and, when configured, Cesium ion tiles. OpenStreetMap
  (Nominatim and map tiles), Esri World Imagery, USGS 3DEP, and CAL FIRE supply map context.
- Google Fonts serves certificate fonts. Google Ads conversion measurement and GA4
  follow the web consent choice. Cloudflare Web Analytics measures aggregate traffic.
- Resend delivers requested Studio links. TypeSafe helps select address candidates and
  classify zoning designations when those integrations are enabled.
- Regrid: parcel lookup.
- ATTOM: supplemental property-address verification for signed-in searches;
  requests contain the searched address, not account identifiers.
- US Census Bureau and public county/state GIS publishers: free geography and
  parcel-boundary lookup when a paid parcel record is unavailable.
- FEMA/ORNL USA Structures: existing-building footprint estimates for parcels
  with a known boundary.
- OpenAI: address context and optional style-match photo generation.
- Stripe: web Checkout and payment processing.
- Apple and Google: native digital purchases only when a store build uses
  StoreKit or Play Billing.

## B. Account, support, and deletion resources

- Support URL: `/help`
- Privacy URL: `/privacy`
- Terms URL: `/terms`
- Web deletion URL: `/delete-account`
- Authenticated account settings, data export, and deletion: `/settings`

The deletion flow removes account-associated PII while retaining intentional
redacted roots and ledger records. The marketplace `connectionRequests` retention
policy is a business and counsel decision that must be finalized before store
submission. Do not describe retained records as deleted or anonymous unless the
approved policy and implementation say so.

## C. Purchase wording

**2026-09-19 product update:** builder signup, dashboards and new lead-credit purchases
are web-only. Store apps retain certificate purchases. Historical builder product
IDs and receipt verification are preserved. See [the homeowner Play listing draft](play-store-homeowner-listing.md)
for proposed metadata, screenshot replacements and outstanding Console checks.

LotFoundry uses the purchase channel available to the user:

- Open web: Stripe Checkout.
- iOS store build: StoreKit.
- Android store build: Play Billing through the Digital Goods API.

Native receipts are sent to `POST /api/store/purchases/verify` and must be
verified server-side before a certificate or builder entitlement is granted. Do
not use web Stripe test results as proof that native purchases, restore,
refund, or revocation behavior works.

## D. App Store privacy and Play Data Safety preparation

Use this as a review checklist, not a submission answer key:

- Confirm which data categories are collected, shared, linked to the user, and
  used for tracking from the final release build and current provider terms.
- Evaluate email/name/avatar, property address, optional photos, saved
  scenarios, purchase history, user ID, feedback, and operational diagnostics.
- Explain that payment credentials are handled by the chosen payment processor;
  do not claim the app stores card data.
- Verify data deletion is available both in-app and at `/delete-account` after
  uninstall.
- Confirm Apple's privacy labels and Google's Data Safety form with counsel,
  especially for photo processing, purchase history, server logs, and retained
  shared marketplace records.

## E. Metadata copy

### App Store

- **App Name (30):** `LotFoundry: ADU Feasibility`
- **Subtitle (30):** `Your lot's ADU income, fast`
- **Primary Category:** Finance
- **Secondary Category:** Business
- **Promotional Text (170):**
  `Type your address and see whether a backyard ADU pencils out: projected rent, build range, payback, and lot fit before you spend on plans.`
- **Keywords (100):**
  `ADU,accessory dwelling,backyard,feasibility,rent,zoning,setback,property,real estate,granny flat,income,lot`

### Google Play

- **App title (30):** `LotFoundry: ADU Feasibility`
- **Short description (80):**
  `See if a backyard ADU pencils out: rent, build cost, payback, and lot fit.`
- **Category:** House & Home
- **Suggested tags:** Real Estate, Productivity

`docs/play-declarations.md` is the authority for Console entry and specifies
`House & Home`; this file previously said `Finance` and the two would have
disagreed at the point someone typed a value into the form. `Finance` is also
the more expensive answer: it makes Play enforce the Financial Features
declaration and applies financial-services vetting to an app that offers no
financial service, only estimates.

### Long description

```text
LotFoundry turns your property address into a clear, early read on whether a
backyard ADU (accessory dwelling unit) is worth pursuing before you hire anyone.

Start with your address and LotFoundry brings together parcel dimensions,
setbacks, zoning context, a configurable ADU concept, and the numbers that
matter: projected monthly rent, build cost range, net operating income, payback,
and lot fit. Save scenarios and share a concept report with your family,
planner, lender, or builder when you are ready.

LotFoundry is a feasibility and estimation tool. Outputs are early estimates,
not permit approvals, appraisals, construction documents, or investment
guarantees. Confirm zoning, build costs, financing, and rents with qualified
local professionals before design, permitting, or investment decisions.
```

## F. Assets and pre-submission gates

- Capture current iPhone, iPad, Android phone, and Android tablet screenshots
  from release candidates; check the selected assets into `public/` and then
  add exact `manifest.json` screenshot references.
- Export the required App Store and Play icons and the Play feature graphic from
  final source assets.
- Add the Play App Signing SHA-256 alongside the upload-key fingerprint in both
  `public/.well-known/assetlinks.json` and `native/android/twa-manifest.json`.
- Use `/help`, `/privacy`, and `/delete-account` in store-console metadata.
- Complete a counsel review, live/sandbox purchase validation, and real-device
  account-deletion test before submitting.
