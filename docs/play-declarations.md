# Google Play Declarations and Closed Testing Pack

**Updated:** 2026-07-18
**App:** LotFoundry (`com.lotfoundry.app`), TWA wrapping `https://yardup-2026.web.app`
**Artifact:** `app-release.aab` v1.0.2 (versionCode 3), signed with the upload key;
Play App Signing certificate (`03:12:00:71…`) is trusted in
`public/.well-known/assetlinks.json` and `native/android/twa-manifest.json`.

Everything below is drafted from repo evidence so the Play Console forms can be
filled in verbatim. Console entry itself requires the account owner.

## 1. Data safety form

Answers reflect what the product actually does: Firebase Auth + Firestore,
Stripe Checkout on the open web, Play Billing in the TWA
(`lib/commerce/purchase-channel.ts`), reCAPTCHA Enterprise on auth, no ads,
no analytics SDK.

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | Yes |
| Is all of the user data collected by your app encrypted in transit? | Yes (HTTPS everywhere) |
| Do you provide a way for users to request that their data is deleted? | Yes — in-app via Settings, and `https://yardup-2026.web.app/delete-account` |

Data types to declare (all **collected**, none **shared**, none used for ads):

| Data type | Collected | Purpose | Optional? |
|---|---|---|---|
| Personal info → Email address | Yes | Account management | No (required for accounts) |
| Personal info → Name | Yes | Account management, personalization | Yes (display name) |
| Personal info → Address | Yes | App functionality (property feasibility lookup) | Yes (demo lots work without) |
| Financial info → Purchase history | Yes | App functionality (certificate/lead unlock grants) | Yes |
| App activity → Other user-generated content | Yes | App functionality (saved studies/scenarios) | Yes |
| Device or other IDs | Yes | Fraud prevention/security (reCAPTCHA Enterprise) | No |

Notes for the form:
- Firebase and Stripe act as service providers (processing on the developer's
  behalf), which Play does not count as "sharing."
- No location permission is requested; addresses are typed by the user, so
  declare them under Personal info → Address, not Location.
- No crash/analytics SDK ships in the app bundle; do not declare App info and
  performance.

## 2. Content rating questionnaire (IARC)

- Category: **Utility / Productivity / Communication / Other**
- Violence, sexuality, language, controlled substances: **No** to all
- Gambling (real or simulated): **No**
- Users can interact or exchange content: **No** (builder leads are mediated
  through the platform; there is no open chat or public UGC)
- Shares user location with other users: **No**
- Purchases digital goods: **Yes** (feasibility certificate, lead unlocks)
- Expected rating: **Everyone / PEGI 3**

## 3. Other console declarations

| Declaration | Answer |
|---|---|
| Privacy policy URL | `https://yardup-2026.web.app/privacy` |
| App access | Full access requires a free account. Provide a review account **and** note the no-login path: open the app, choose a demo lot (Seattle/Portland/Austin), and run the full journey. |
| Ads | No ads |
| Target audience | 18 and over (financial planning tool) |
| News app | No |
| COVID-19 contact tracing/status | No |
| Data safety | As per section 1 |
| Government app | No |
| Financial features | None of the above (estimates only; no loans, banking, or payments products) |
| Health apps | No |

## 4. Closed testing setup

1. Play Console → Testing → **Closed testing** → create track `closed-beta`.
2. Upload `native/android/app/build/outputs/bundle/release/app-release.aab`
   (v1.0.2, versionCode 3). Play re-signs with the Play App Signing key already
   trusted in Digital Asset Links, so the TWA opens full-screen.
3. Create an email-list tester group; add at least the owner account plus test
   devices. Personal (non-organization) Play accounts created after Nov 2023
   need **12 testers opted in for 14 days** before production access can be
   requested — start the clock early.
4. Release notes for v1.0.2 (versionCode 3):
   > Store-ready release: trusted Play signing, in-app checkout returns,
   > accessible sign-in, and a smoother five-step mobile journey.
5. Roll out, then share the opt-in URL with testers.

### Tester validation checklist (real devices)

- [ ] App opens full-screen with no Chrome URL bar (Digital Asset Links OK)
- [ ] `/studio` journey: address → estimate → certificate on a phone
- [ ] Play Billing purchase, restore after reinstall, and refund/revocation
- [ ] Sign-in autofill offers saved credentials (autocomplete fix)
- [ ] Account deletion via Settings and `/delete-account`
- [ ] App shortcuts (New Study, Builder Dashboard) launch correctly

## 5. Console-side items nobody can pre-draft

- Play App Signing enrollment already produced the signing certificate; no
  further integrity action needed beyond keeping both fingerprints served.
- License testers for Play Billing sandbox (Console → Setup → License testing).
- In-app products must exist under Monetize → Products before billing tests.
- Tax, banking, and merchant profile for paid digital goods.
