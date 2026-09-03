# Google Play Console inputs — LotFoundry Android TWA

Use these values for the Android app only. Do not enter signing passwords, a
keystore, or a service-account key in Play Console or this repository.

## Create app

| Play Console field | Value |
|---|---|
| App name | `LotFoundry` |
| Default language | `English (United States)` |
| App or game | `App` |
| Free or paid | `Free` |
| Package name | `com.lotfoundry.app` |
| App category | `House & Home` |
| Contact email | `support@lotfoundry.com` |
| Privacy policy URL | `https://lotfoundry.net/privacy` |
| Account deletion URL | `https://lotfoundry.net/delete-account` |
| Developer Program Policies declaration | `Acknowledge` |
| US export laws declaration | `Acknowledge` |

### Contact address

Use `support@lotfoundry.com`. It is the canonical support address on the
implemented help, privacy, terms, and account-deletion surfaces. The Console
listing must stay aligned with those user-facing routes.

## App integrity

Enroll in **Play App Signing**. Upload the AAB built by the `Android release
bundle` GitHub Actions workflow. The upload certificate must be:

`E7:B3:6E:54:38:69:D5:AF:1D:D1:2B:3B:A6:8B:58:E4:29:D4:9E:AB:57:6F:38:69:50:A5:40:3B:DD:92:F6:90`

The Play App Signing certificate that Console displays must remain in the live
Digital Asset Links statement. The currently served value is:

`03:12:00:71:08:87:DD:21:17:EA:42:D1:E2:25:76:B8:BF:C4:DD:94:56:08:C8:BE:2F:DD:AB:9B:EA:AD:5A:CE`

## Store listing

| Field | Value |
|---|---|
| App name | `LotFoundry` |
| Short description | `See what your backyard can earn.` |
| Full description | `Check your address for ADU rent, build cost, and payback estimates before you spend money on plans. Explore lot fit, compare assumptions, and save or share an early feasibility study. Estimates only; local review is still required before design, permitting, financing, or investment decisions.` |
| Category | `House & Home` |
| Email | `support@lotfoundry.com` |
| Privacy policy | `https://lotfoundry.net/privacy` |

Upload current phone and tablet screenshots from the release candidate. Do not
reuse the web-manifest screenshots as store-listing assets without reviewing
them in Play Console's required dimensions.

## App content

| Play Console question | Answer |
|---|---|
| Ads | `No` |
| Target age | `18 and over` |
| App access | `Some or all functionality is restricted` — provide an active, non-personal reviewer account in the Console form. The demo-lot path works without sign-in. |
| Account creation | `Yes` |
| Account deletion | `Users can request deletion in-app and at https://lotfoundry.net/delete-account` |
| Financial features | `None of the above` |
| Health apps | `No` |
| Government app | `No` |
| News app | `No` |
| COVID-19 contact tracing/status | `No` |

## Data safety

| Data type | Collected | Shared | Purpose | Required |
|---|---|---|---|---|
| Name | Yes | Yes, after a homeowner submits a builder connection request | Account management, app functionality | No |
| Email address | Yes | Yes, after a homeowner submits a builder connection request | Account management, app functionality | No |
| Phone number | Yes | Yes, after a homeowner submits a builder connection request | App functionality | No |
| Address | Yes | Yes, after a homeowner submits a builder connection request | App functionality | No |
| Precise location | Yes, from a user-entered property address geocoded server-side | No | App functionality | No |
| Photos | Yes, only when the user submits an optional style-match photo | No | App functionality | No |
| Purchase history | Yes | No | App functionality | No |
| Other user-generated content (saved studies and feedback) | Yes | No | App functionality | No |
| Device or other IDs | Yes | No | Security and fraud prevention | Yes |

The homeowner's name is shared on the same trigger as the email, phone, and
address: `OwnerContact` in `lib/marketplace-types.ts` carries `name` alongside
them, and the whole record is revealed to a builder when a lead is unlocked.
This row previously read `Shared: No`, which the code does not support — and a
Data safety form that disagrees with the shipped app is among the most common
causes of Play enforcement.

For every collected data type: `Encrypted in transit: Yes`. Do not declare ads
or third-party advertising. Firebase, Google Maps/Places/Geocoding, Regrid,
OpenAI, Stripe, and store billing process data for LotFoundry; the builder
marketplace disclosure above is the only third-party sharing claim.

## Content rating

| IARC question | Answer |
|---|---|
| Violence, sexual content, language, controlled substances, gambling | `No` to each |
| Users interact or exchange content | `No` |
| Shares user location with other users | `No` — the app does not transmit the user's current device location to other people |
| Purchases digital goods | `Yes` |

The IARC answer is `No`: the app does not transmit a user's current device
location to other people. A homeowner can voluntarily share a property address
with a builder through a connection request; Data safety separately discloses
that address and conservatively declares precise location because an address can
identify a physical place below the precise-location threshold. The app does not
request a device-location permission. Keep these answers aligned with the
marketplace-sharing rows above.

## Release upload

| Field | Value |
|---|---|
| Artifact | `app-release.aab` from the GitHub Actions artifact `lotfoundry-android-release-aab` |
| Version name | `1.0.6` |
| Version code | `7` |
| Release notes | `First LotFoundry Android release with the feasibility studio, saved studies, builder connections, and Google Play Billing.` |

Before upload, confirm in Play Console that the highest accepted version code is
less than `7`; Play rejects a duplicate or lower code. After upload, test on a
physical device that the app opens full-screen without Chrome browser controls.
