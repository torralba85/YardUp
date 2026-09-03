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
| Contact email | `support@lotfoundry.net` |
| Privacy policy URL | `https://lotfoundry.net/privacy` |
| Account deletion URL | `https://lotfoundry.net/delete-account` |
| Developer Program Policies declaration | `Acknowledge` |
| US export laws declaration | `Acknowledge` |

### Contact address — decide which domain is canonical

The two Console contact fields above say `support@lotfoundry.net`, but the legal
pages served at that domain send users elsewhere: `app/privacy/page.tsx` gives
`privacy@lotfoundry.com` and `support@lotfoundry.com`, and
`app/terms/page.tsx` gives `support@lotfoundry.com`.

`lotfoundry.com` does resolve and carries Google MX records, so this is very
likely a live mailbox rather than a dead address — but a reviewer following the
privacy policy lands on a different domain than the one entered in Console, and
a privacy contact is one of the things Play review actually exercises. Pick the
mailbox that is really monitored and make Console, `/privacy`, and `/terms`
agree on it.

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
| Email | `support@lotfoundry.net` |
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
| Precise location | Yes, from a typed address geocoded server-side | No | App functionality | No |
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
| Shares user location with other users | Decide before submitting — see below |
| Purchases digital goods | `Yes` |

`Shares user location with other users` is currently drafted as `No`, and that
answer is hard to defend as written: unlocking a lead reveals the homeowner's
**exact street address** to a builder, and builders are other users of the app.
Two readings are available, and the difference matters enough to settle
deliberately rather than by default.

- `Yes` is the literal reading. A precise address does reach another user.
- `No` is the reading IARC's wording invites, since the question targets
  location-broadcasting features rather than a one-time disclosure the user
  initiates for a specific counterparty.

`Yes` is the safer answer: an IARC questionnaire that understates disclosure can
invalidate the rating after the fact, whereas a conservative answer costs
little for an app already rated `18 and over`. Whichever is chosen, keep it
consistent with the Data safety sharing rows above.

Two smaller items to settle in the same pass:

- **`Precise location` is over-declared.** The app never requests a device
  location permission; the value is a user-typed address, already disclosed
  under `Address`. Declaring `Precise location` invites a reviewer question
  about a permission the app does not hold. Consider `Not collected`.
- **The release note names the domain.** `First LotFoundry Android release on
  lotfoundry.net…` reads as wrapper-ish to a human reviewer, and store copy is
  not the place for a hostname. Describing the capabilities instead costs
  nothing.

## Release upload

| Field | Value |
|---|---|
| Artifact | `app-release.aab` from the GitHub Actions artifact `lotfoundry-android-release-aab` |
| Version name | `1.0.6` |
| Version code | `7` |
| Release notes | `First LotFoundry Android release on lotfoundry.net, with the feasibility studio, saved studies, builder connections, and Google Play Billing.` |

Before upload, confirm in Play Console that the highest accepted version code is
less than `7`; Play rejects a duplicate or lower code. After upload, test on a
physical device that the app opens full-screen without Chrome browser controls.
