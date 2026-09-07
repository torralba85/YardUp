# LotFoundry

LotFoundry is an AI-assisted ADU feasibility studio for homeowners. Enter an
address—or use a built-in demo parcel—to explore what may fit, what it may cost,
what it may earn, and which questions still need a local professional.

[Try the live app](https://lotfoundry.net) ·
[Read the documentation](docs/README.md) ·
[Review the Build Week submission notes](docs/devpost-submission.md)

## Preview

<p>
  <img src="public/screenshots/phone-home.png" width="240" alt="LotFoundry home screen on mobile" />
  <img src="public/screenshots/phone-studio.png" width="240" alt="LotFoundry feasibility studio on mobile" />
  <img src="public/screenshots/tablet-studio.png" width="400" alt="LotFoundry feasibility studio on tablet" />
</p>

Home and feasibility studio on phone, and the studio on tablet.

## What it does

- Searches real residential parcels through Regrid, public parcel GIS services,
  the US Census geocoder, and Google Maps integrations.
- Visualizes the lot, existing home, setbacks, and a movable ADU concept in 3D.
- Estimates build cost, rent, annual NOI, payback, and basic zoning fit.
- Uses authenticated OpenAI Responses API workflows for a parcel-and-permit
  brief and style-matched ADU concepts.
- Produces a shareable, printable Certificate of Feasibility.
- Saves scenarios with Firebase Auth and Firestore, while guest scenarios stay
  local to the browser.
- Supports homeowner-to-builder handoff and verified web/native purchase
  channels.
- Resolves real lots without a paid parcel API wherever the public GIS registry
  has coverage, then falls back to the Seattle, Portland, and Austin demo parcels.

LotFoundry is an early planning instrument, not a permit decision, appraisal,
construction document, or substitute for professional advice.

## OpenAI Build Week 2026

LotFoundry is entered in the **Apps for Your Life** track. The project existed
before Build Week, so the submission evidence clearly separates the baseline
from the work completed during the July 13–21 event window.

During Build Week, Codex was used as a hands-on engineering collaborator to:

- complete account, support, consent, recovery, and deletion trust flows;
- add mobile-store purchase routing and server-side receipt verification;
- prepare Android TWA and iOS shell configuration;
- improve responsive studio behavior and accessibility;
- add release, repository-health, and public-submission checks; and
- migrate the authenticated OpenAI workflows to GPT-5.6 Sol defaults.

The authenticated AI workflows themselves run on GPT-5.6 Sol through the OpenAI
Responses API, using structured outputs and a bounded tool loop. A parcel/permit
tool joins jurisdiction context to the project brief, and the style-matched ADU
concept path adds image understanding and image generation, used only after
explicit user consent.

Human decisions remained explicit: product scope, legal language, visual
direction, architecture, release boundaries, and every external submission or
deployment decision were reviewed by the project owner. See
[docs/devpost-submission.md](docs/devpost-submission.md) for the evidence map,
remaining assets, and final submission checklist.

### Reviewer access

The core feasibility journey (Seattle, Portland, Austin) needs no login. To try
the authenticated paths — saved scenarios, the AI project brief, style-match
concepts, and the builder dashboard — sign in at
[lotfoundry.net/login](https://lotfoundry.net/login).

Reviewer credentials are time-limited and issued directly by the project owner.
They are never stored in this repository.

Request access through the support route before testing saved scenarios, AI
features, or the builder dashboard.

## Run locally

Prerequisite: Node.js 22.12 or newer, matching CI and the Firebase Functions runtime.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. The built-in demo parcels work without API keys.

For live parcel data, authenticated saves, AI generation, and payments:

```bash
cp .env.example .env.local
```

Fill only the services you intend to test. Never commit `.env.local`,
`functions/.env`, signing keys, or store-service credentials.

Analytics stays off locally unless you opt in. `NEXT_PUBLIC_GA_MEASUREMENT_ID`
is empty in `.env.example`, and with no measurement ID the Google Analytics tag
never loads and the cookie banner never renders. Set it to a `G-XXXXXXXXXX` ID
only if you are deliberately testing the consent flow, and use a separate GA4
property so local traffic never lands in production reporting.

## Verify

```bash
npm run repo:public-check
npm run check
npm run test:e2e
```

The public-repository check catches common secret formats, generated release
binaries, accidental local-agent state, and large tracked files. The core check
runs lint, unit tests, TypeScript, and the production build.

## Android release status

`native/android/` contains the generated Trusted Web Activity project and its
source-of-truth configuration for package `com.lotfoundry.app`, including
Digital Asset Links for both the upload key and Play App Signing certificate,
Play Billing bridge dependencies, and manifest screenshots.

```bash
npm run android:validate
npm run android:validate:release
```

The normal validator checks committed configuration. The strict release
validator must be run from the prepared release workspace after the signed AAB
exists. A clean checkout is expected to fail the final AAB-presence check because
release binaries and signing material are intentionally excluded from Git.

## Architecture

| Area | Technology |
|---|---|
| Web app | Next.js 16, React 19, TypeScript 5, Tailwind CSS 4 |
| Spatial UI | Three.js, React Three Fiber, Google Maps |
| Data and auth | Firebase Hosting, Functions, Auth, Firestore |
| AI | OpenAI Responses API with GPT-5.6 Sol; Firebase AI Logic for parcel insights |
| Commerce | Stripe plus App Store / Google Play receipt-verification paths |
| Mobile | PWA, Android TWA configuration, iOS Capacitor shell scaffold |
| Quality | ESLint, Vitest, Playwright, TypeScript, GitHub Actions |

The repository map and deeper architecture links are maintained in
[docs/README.md](docs/README.md).

## Security and privacy

- Server secrets stay server-side and must never use a `NEXT_PUBLIC_*` name.
- AI photo upload requires explicit consent.
- Google Analytics is opt-in: no tag loads and no analytics cookie is set until
  the visitor accepts the cookie banner, and declining also clears any GA cookie
  left from an earlier grant. Advertising and personalization signals are
  disabled, and no address, email, or feasibility result is sent to Google.
- Account export and deletion are available from Settings.
- Security reports should follow [SECURITY.md](SECURITY.md), not a public issue.

## License

Copyright © 2026 Andrew Torralba. This repository is source-available for
OpenAI Build Week evaluation under the [LotFoundry Evaluation License](LICENSE);
it is not an open-source license and does not grant redistribution or commercial
use.
