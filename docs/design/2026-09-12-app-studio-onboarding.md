# Native app Studio onboarding

Inside the native apps (the Android TWA and the iOS shell), `/studio` opens with
up to three short screens before the 3D Studio. The website, including a phone
browser, is unchanged: guests still open the demo Studio directly and signed-in
owners still land on the address-first workspace.

## Flow

| Path | Screens | Account |
|---|---|---|
| Explore my property | Welcome → Sign in → Quick guide → address workspace | Required |
| Try a demo city (Seattle, Portland, Austin) | Welcome → Quick guide → Studio on that lot | Not required |
| Returning member who has read the guide | Straight to the address workspace | Already signed in |

- **Welcome** introduces LotFoundry with labelled concept artwork. The primary
  action is *Explore my property*; the three demo cities sit below it.
- **Sign in** explains why an account is needed and opens the existing
  authentication dialog. Dismissing it keeps the visitor on this screen; a
  completed sign-in replaces it with the guide.
- **Quick guide** gives three steps tailored to the chosen path, then opens the
  Studio. A demo lot starts the mobile journey at the Earn reveal, since the
  lot was already chosen.

A signed-out visitor can never reach the private workspace. Builders still go
to their dashboard.

## Decisions

- **Detection is the native shell, not screen width.** `isNativeAppShell()` in
  `lib/commerce/purchase-channel.ts` reuses the purchase-channel signals: the
  Play TWA's `android-app://com.lotfoundry.app` launch referrer (remembered for
  the tab session), and the `LotFoundryNative` bridge flag or StoreKit handler
  in iOS. The Digital Goods API is not a signal; browsers expose it outside the
  app.
- **Each screen writes a history entry**, keyed `lfAppOnboardingStep` with the
  step name only. The Android back gesture steps back through onboarding instead
  of leaving the app. Addresses never enter the URL or history.
- **The guide shows once per device for members** (`lf:app-guide-seen` in local
  storage). Guests see Welcome on every launch, because they must choose sign-in
  or a demo each time.

## Verification

- Unit: `components/studio/AppStudioOnboarding.test.tsx`,
  `app/(firebase)/studio/page.test.tsx`, `lib/commerce/purchase-channel.test.ts`.
- Browser: `e2e/app-studio-onboarding.spec.ts` (mobile project) sets the
  Android bridge flag and covers the demo path, required sign-in, back
  navigation, and 320px/390px layout. The sign-in fixture intercepts Firebase
  locally and creates no production account.

## Release boundary

This is a hosted-web change. The installed apps load `lotfoundry.net`, so it
reaches Android and iOS after merge and a successful `master` deployment, with
no new app bundle required.
