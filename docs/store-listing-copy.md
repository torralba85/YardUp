# Store Listing Copy - App Store and Google Play

**Updated:** 2026-07-17
**App:** LotFoundry - ADU Feasibility Studio (`com.lotfoundry.app`)
**Status:** Draft for product, privacy, and counsel review. This file describes
current code paths; console declarations must be checked against the final
native build, provider contracts, and store guidance before submission.

## A. Data-processing inventory

| Data | Current code path | Purpose | Notes for review |
|---|---|---|---|
| Email, name, avatar, Firebase UID | Firebase Auth, including email/password, Google, and Apple sign-in | Account management | Confirm final provider scopes and account-linking behavior |
| Property address | User input sent to Regrid and Google Maps/Geocoding/Places | Feasibility and parcel lookup | Required only to use address-based estimates |
| Home photo | Client removes EXIF/GPS, then sends an in-memory upload to OpenAI for style matching | AI concept generation | The app does not persist the original upload to Firestore or Storage; confirm processor terms and disclosure wording |
| Saved scenarios | Firestore under the authenticated user | Save, share, and restore estimates | Account deletion removes account-associated scenario data |
| Purchase and lead-unlock history | Stripe and Firestore ledger on the web; platform purchase proof for native stores | Purchases and entitlement grants | The application never accepts raw card numbers |
| Feedback | `/api/feedback` intake | Support and product feedback | Confirm support retention and access policy |
| Server diagnostics | Firebase Hosting and Cloud Functions logs | Reliability and security operations | Confirm platform retention settings |

There are no advertising or analytics SDKs in the current codebase. This is not
a claim that no processor collects operational logs; verify each processor's
current policy before completing App Privacy or Play Data Safety.

### Third-party processors

- Google: Firebase Auth/Firestore, Maps, Geocoding, and Places.
- Regrid: parcel lookup.
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
- **Category:** Finance
- **Suggested tags:** Finance, Real Estate, Productivity

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
- Replace `REPLACE_WITH_PLAY_SIGNING_SHA256_FINGERPRINT` in
  `public/.well-known/assetlinks.json` only after Play App Signing provides the
  final SHA-256.
- Use `/help`, `/privacy`, and `/delete-account` in store-console metadata.
- Complete a counsel review, live/sandbox purchase validation, and real-device
  account-deletion test before submitting.
