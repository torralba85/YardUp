# Mobile design and flow audit — 2026-09-10

Authority: `design-system.md`, `product-surfaces.md`, and the mobile-ux-design-system skill.
Baseline: master `4251785`, the hosted Studio, and a USB-connected Pixel 10 Pro XL.

## Findings addressed

| Finding | Evidence | Correction |
|---|---|---|
| Progress controls too narrow and unlabeled on small phones | Hosted 390px Studio measured each step at 20 x 44px; labels were hidden below 440px | Five equal columns with minimum 44 x 44px controls, visible labels, and check icons for completed steps. Verified at 320, 390, 440, and 768px. |
| New screens inherit the previous screen's scroll position | After Shape → Check, the hosted main region retained scrollTop 272, hiding the opening verdict | Reset scroll and focus the named main region only when the active step changes. Updating figures on the same step preserves scroll. |
| Android shell still uses retired beige colors | TWA manifest and Gradle resources used #F2E5D5 and #332613 | Match the web manifest's chalk #F5F5F0 ground and drafting divider #DADAD3, including shortcut background. |

## Coverage and limits

- Hosted guest journey: Find → Earn → Shape (size and finish changes) → Check → Act/certificate completed at 390px. Certificate remains gated by sign-in and purchase. At 320px the certificate page had no document overflow or undersized main buttons.
- Sign-in dialog: email/password inputs render at 16px; consent remains unchecked; social buttons remain disabled until consent; dismiss returns focus to Sign in.
- Local production browser checks: account/support/deletion, shared design tokens and fonts, consent, dialog focus, complete mobile journey, optional fine-tune drawer, backward navigation, shared scenarios, and 320–768px progress targets.
- Pixel: existing Play-installed version 1.0.5/code 6 opens the hosted journey without a Chrome URL bar. The Store offers Open, not Update, on the current early-access account. This does not validate the new code-10 installation or a Play Billing sandbox purchase.
- Review was scoped to design and navigation. No claim of complete WCAG conformance, real-address provider accuracy, authenticated save completion, payment entitlement, or physical-device performance is made.

## Remaining design work

- Native launcher/splash PNG artwork still carries the older LF identity. The color correction does not regenerate those assets or alter the external Play listing.
- Mobile flow and manifest still emphasize income (Earn, "max rent", "most popular") more than the approved family/income/what's-next framing. A copy and journey pass remains appropriate; no calculations or legal copy were changed in this release.
- Find's demo-lot button group lacks arrow-key selection. Shape size and finish radio groups already implement arrow keys.

## Android artifact and release boundary

- Version 1.0.9/code 10, package `com.lotfoundry.app`, target SDK 36; signed using the existing trusted upload key.
- AAB: 1,742,101 bytes; SHA-256 `FA06D00B99DCFCC8A1D65F59A6A4448570FBBD8AC37A6D36622467CC94F192D1`.
- Play accepted and saved code 10. On resumption, Publishing overview lists Production `10 (1.0.9)` / `Start full rollout` under **Changes not yet submitted for review**; production remains inactive. Managed publishing is off. Saving/uploading is separate from review submission and publication.
- Navigation changes are hosted web code and require the normal web CI/deployment. Building a TWA bundle does not deploy them.
- Before public rollout: install a Play-delivered current test build, complete sandbox purchase and entitlement validation, and resolve production country availability in Console.

## Resumption verification

- The retained release artifact matches the SHA-256 above. `jarsigner -verify` exits 0 and reports `jar verified`; its certificate fingerprint matches the trusted upload fingerprint in the TWA manifest and Digital Asset Links. JDK 21 also reports self-signed/no-timestamp and ZIP streaming warnings; Play has accepted this exact artifact.
- Fresh checks: lint and TypeScript passed; `MobileJourney.test.tsx` passed 2 tests; the mobile Playwright suite passed 6 tests with 1 desktop-only test skipped, against the retained production build. `android:validate:live` passed.
- The earlier session reported a successful production web build and 33 focused browser tests. Those broader checks were not rerun during recovery; no result is claimed for its interrupted full unit run.
- ADB still sees the authorized Pixel with version 1.0.5/code 6. This is not code-10 device or purchase evidence.
- Commit `b2af652` records the code-10 source. Subsequent metadata reserves version 1.0.10/code 11 and raises the uploaded-code ceiling to 10. No code-11 artifact was built; the retained AAB is still code 10.

## Authorized publication follow-up

- Following explicit publication authorization, submitted code 10 and United States production availability. Play submission 14 was submitted September 10 at 9:37 AM and **published at 9:55 AM**. Managed publishing is off.
- Enabled the Android Publisher API in the production cloud project and verified the existing service account can list the four configured one-time products. This validates API access, not a purchase or entitlement.
- Restored the four existing native-store secret bindings on the live `apiStore` function and verified it returned ACTIVE. Its legacy native-verification flag was already enabled; no new feature flag was enabled.
- Diagnosed why deployment dropped these bindings: Firebase CLI 15.26.0 does not pass user `.env` variables during function discovery, so the conditional secret declarations are omitted. Pinned CI to verified CLI 15.29.0, which includes these variables, and added a live binding check before Hosting publication.
- The original mobile PR head `0f8bd02` passed full CI, including lint, unit tests, Firestore rules, TypeScript, build, and browser tests. The deployment safeguard receives a separate CI run before merge.
- Physical-device code-10 installation and a sandbox purchase/entitlement remain unverified.
