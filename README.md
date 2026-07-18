# LotFoundry

LotFoundry is an AI-assisted ADU feasibility studio for homeowners. Enter an
address—or use a built-in demo parcel—to explore what may fit, what it may cost,
what it may earn, and which questions still need a local professional.

[Try the live app](https://yardup-2026.web.app) ·
[Read the documentation](docs/README.md) ·
[Review the Build Week submission notes](docs/devpost-submission.md)

## What it does

- Searches real residential parcels through Regrid and Google Maps integrations.
- Visualizes the lot, existing home, setbacks, and a movable ADU concept in 3D.
- Estimates build cost, rent, annual NOI, payback, and basic zoning fit.
- Uses authenticated OpenAI Responses API workflows for a parcel-and-permit
  brief and style-matched ADU concepts.
- Produces a shareable, printable Certificate of Feasibility.
- Saves scenarios with Firebase Auth and Firestore, while guest scenarios stay
  local to the browser.
- Supports homeowner-to-builder handoff and verified web/native purchase
  channels.
- Runs without paid API keys using Seattle, Portland, and Austin demo parcels.

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

Human decisions remained explicit: product scope, legal language, visual
direction, architecture, release boundaries, and every external submission or
deployment decision were reviewed by the project owner. See
[docs/devpost-submission.md](docs/devpost-submission.md) for the evidence map,
remaining assets, and final submission checklist.

## Run locally

Prerequisite: Node.js 20 or newer.

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

`native/android/` contains the source-of-truth Trusted Web Activity
configuration for package `com.lotfoundry.app`, including Digital Asset Links
for the current upload key and Play Billing bridge dependencies.

```bash
npm run android:validate
npm run android:validate:release
```

The normal validator checks the committed configuration. The strict release
validator intentionally stays red until the generated Bubblewrap project,
Google Play App Signing fingerprint, required store screenshots, and signed AAB
are present. Build artifacts and signing material are ignored by Git.

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
- Account export and deletion are available from Settings.
- Security reports should follow [SECURITY.md](SECURITY.md), not a public issue.

## License

Copyright © 2026 Andrew Torralba. This repository is source-available for
OpenAI Build Week evaluation under the [LotFoundry Evaluation License](LICENSE);
it is not an open-source license and does not grant redistribution or commercial
use.
