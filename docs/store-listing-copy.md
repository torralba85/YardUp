# Store Listing Copy — App Store + Google Play

**Date:** 2026-06-28
**App:** LotFoundry — ADU Feasibility Studio · package `com.lotfoundry.app`
**Status:** DRAFT for review. Privacy answers are grounded in the current codebase (no analytics/tracking SDKs; Firebase Auth incl. Google sign-in; Regrid/Google/OpenAI/Stripe as processors). The two earlier open items (photo retention, in-app deletion path) are now resolved — see section A.

---

## A. Data-collection reality (source of truth for both forms)

| Data | Collected? | Where | Linked to user | Purpose |
|---|---|---|---|---|
| Email address | Yes | Firebase Auth (email + Google sign-in) | Yes | Account, App Functionality |
| Name | Yes | Google sign-in `displayName` | Yes | Account |
| Profile photo (avatar) | Yes | Google sign-in `photoURL` | Yes | Account |
| Property address | Yes | Entered → Regrid + Google Geocoding/Places | Yes | App Functionality (feasibility) |
| Photos (uploaded home photo) | Yes | Style-match flow → OpenAI | Yes | App Functionality (AI concept) |
| Saved scenarios (lot/ADU inputs + outputs) | Yes | Firestore per user | Yes | App Functionality |
| Purchase / lead-unlock history | Yes | Stripe + Firestore ledger (builders) | Yes | App Functionality, Purchases |
| Payment info (card) | By Stripe only | Stripe Checkout (hosted) — never touches the app | — | Payments (processor) |
| User ID (Firebase UID) | Yes | Firebase Auth | Yes | App Functionality |
| Crash/diagnostic logs | Yes | Firebase Hosting / Cloud Functions server logs | Linked (server-side) | App Functionality, diagnostics |
| Advertising / tracking identifiers | **No** | — | — | — |

**Used to track you (cross-app/3rd-party ads): NONE.** No analytics SDK, no ad SDK, no cross-site tracking.

**Third parties data is shared with (as processors, not for their own ads):** Google (Maps/Geocoding/Places, Firebase), Regrid (parcel lookup by address), OpenAI (address context + uploaded photo for AI concepts), Stripe (payments).

✅ **Resolved (2026-06-28):**
1. **Photo retention — NOT persisted.** `app/api/ai/adu-concept/route.ts` reads the upload into memory, base64-encodes it inline to OpenAI, and returns the result — no Firestore/Storage/disk write. The client (`lib/style-match-photo.ts`) also strips EXIF before upload. So the photo is transient; OpenAI is the only third party that receives it (as an API processor). Declare Photos as *collected → App Functionality*, **not stored** by LotFoundry.
2. **In-app data-deletion path — built.** `POST /api/account/delete` (Admin SDK) deletes the user's saved scenarios, builder profile, `users/{uid}` profile doc, and the Firebase Auth identity. Reachable in-app from the studio account block (desktop sidebar + mobile account menu) via "Delete account" with a two-step confirm. Individual scenarios are also deletable. Use this as the Play "data deletion" answer (in-app route). **Note:** marketplace `connectionRequests` (homeowner leads a builder may have paid to unlock) are intentionally retained as shared business records — decide their PII retention policy separately before launch.

---

## B. Apple App Store — App Privacy ("nutrition labels")

In App Store Connect → App Privacy. For every type below: **Linked to You = Yes**, **Used for Tracking = No**.

**Contact Info**
- Email Address — App Functionality, Account Management
- Name — App Functionality, Account Management

**User Content**
- Photos or Videos — App Functionality *(the uploaded home photo)*
- Other User Content — App Functionality *(property address, saved scenarios)*

**Identifiers**
- User ID — App Functionality

**Purchases**
- Purchase History — App Functionality *(builder lead unlocks)*

**Financial Info**
- Payment Info — App Functionality *(declare only if you consider Stripe-collected card data in scope; the app itself never receives card numbers — Stripe Checkout does. Most teams declare Payment Info here because the purchase happens in-context.)*

**Diagnostics**
- Crash Data / Performance Data — App Functionality *(server logs)*

> Everything is **Linked to the user** (tied to the account). **Nothing is used to track.** No "Data Not Linked to You" categories and no Tracking section.

---

## C. Google Play — Data Safety form

**Does your app collect or share user data?** Yes.
**Is all data encrypted in transit?** Yes (HTTPS).
**Do you provide a way to request data deletion?** Yes — in-app account deletion ("Delete account" in the studio account menu → `POST /api/account/delete`). See section A-2.

| Play category → type | Collected | Shared | Processing | Purpose |
|---|---|---|---|---|
| Personal info → Email address | Yes | Yes (Firebase) | Required* | Account management, App functionality |
| Personal info → Name | Yes | Yes (Firebase) | Optional | Account management |
| Personal info → Address (property) | Yes | Yes (Regrid, Google) | Required* | App functionality |
| Photos and videos → Photos | Yes | Yes (OpenAI) | Optional | App functionality |
| Financial info → Purchase history | Yes | Yes (Stripe) | Optional | App functionality |
| App activity → Saved scenarios (other user-generated content) | Yes | No | Optional | App functionality |
| App info & performance → Crash logs / Diagnostics | Yes | No | Optional | App functionality |
| Device or other IDs → User ID | Yes | Yes (Firebase) | Required* | App functionality |

\* "Required" = needed to use the feature (e.g. address is required to run a feasibility estimate).
**Payment info (card):** handled entirely by Stripe Checkout; declare per Play guidance for payment processors (collected by the processor, not stored by the app).

---

## D. Metadata copy

### App Store
- **App Name (30):** `LotFoundry: ADU Feasibility`
- **Subtitle (30):** `Your lot's ADU income, fast`
- **Primary Category:** Finance · **Secondary:** Business
- **Promotional Text (170):**
  `Type your address and see whether a backyard ADU pencils out — projected rent, build range, payback, and lot fit — before you spend a dollar on plans.`
- **Keywords (100):**
  `ADU,accessory dwelling,backyard,feasibility,rent,zoning,setback,property,real estate,granny flat,income,lot`
- **Description:**
```
LotFoundry turns your property address into a clear, honest read on whether a backyard ADU (accessory dwelling unit) is worth pursuing — before you hire anyone.

Start with your real address and LotFoundry pulls your lot's dimensions, setbacks, and zoning, then shows what fits and what doesn't in an interactive 3D view of your parcel. In seconds you see the numbers that matter:

• Projected monthly rent for your market
• Build cost range
• Net operating income and payback estimate
• Zoning coverage and setback fit

WHY OWNERS USE IT
• Address-first — grounded in your actual parcel, not a generic catalog example
• Estimate-honest — clear assumptions and caveats, never a false promise
• Builder-ready — a shareable concept report for your next conversation

A complete owner path, not a rendering that leaves you guessing. Save scenarios, compare options, and share a report with your family, planner, lender, or builder when you're ready.

LotFoundry is a feasibility and estimation tool. Outputs are early estimates only — confirm zoning, build costs, financing, and rents with local professionals before design, permitting, or investment decisions. It is not a permit approval, appraisal, or investment guarantee.
```

### Google Play
- **App title (30):** `LotFoundry: ADU Feasibility`
- **Short description (80):**
  `See if a backyard ADU pencils out — rent, build cost, payback, and lot fit.`
- **Full description (≤4000):** *(reuse the App Store description above; Play allows the same copy.)*
- **Category:** Finance · **Tags:** Finance, Real Estate, Productivity
- **Content rating:** Everyone (questionnaire: no objectionable content; app handles financial estimates + user accounts).

### Shared assets still needed (P1/P2)
- Screenshots: iPhone 6.7" + 6.5", iPad 12.9", Android phone + 7"/10" tablet. *(Capture from a real device — the WebGL studio canvas stalls automated capture.)*
- App Store: 1024×1024 icon (use `icon-512.png` master upscaled / re-exported at 1024). Play: 512×512 icon + 1024×500 feature graphic.
- Support URL, marketing URL, and the privacy policy URL → `/privacy` (already live).

---

## E. Pre-submission checklist
- [ ] Add `NEXT_PUBLIC_GOOGLE_PLACES_KEY` + set `NEXT_PUBLIC_APP_URL` (see store-deployment-readiness.md).
- [x] Confirm photo retention (A-1 — not persisted) and wire a data-deletion path (A-2 — `POST /api/account/delete` + in-app UI).
- [ ] Decide retention policy for marketplace `connectionRequests` PII (shared lead records).
- [ ] Generate packages in PWABuilder; paste Play signing SHA-256 into `public/.well-known/assetlinks.json`.
- [ ] Capture device screenshots; export 1024² / 512² icons + feature graphic.
- [ ] Fill App Privacy (B) and Data Safety (C) exactly as above.
- [ ] Submit.
