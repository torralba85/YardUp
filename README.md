# Lot/Foundry

Lot/Foundry (always rendered with the slash) is the customer-facing brand, operated under the legal name ADU Advisor. It is an Expo React Native app that helps homeowners understand the money, feasibility, and builder path for an accessory dwelling unit before they spend on professional work. The first surface answers how much an ADU could earn, what it would cost, how fast it could pay back, and which builders can act on it. Design, permit checks, model fit, and photo context are proof paths under the revenue story, not the headline.

> The repository, GitHub remote (`github.com/torralba85/YardUp`), local folder name (`ADU Advisor`), and native bundle IDs (`com.aduadvisor.app`) were previously branded YardUp and keep those identifiers for store-listing and link continuity. The brand, copy, and visual system have moved to Lot/Foundry (Direction 05); YardUp / Quiet Ascent is retired.

Local-first by default: project studies live in on-device SQLite. Cloud services (Firebase Auth, Firestore, callable Cloud Functions) layer in on top for sync, regulation refreshes, public-record lookups, AI concept generation, builder quote requests, and product feedback.

The product is not California-only. Use "supported markets", "local rules", and "jurisdiction" framing. See [DESIGN.md](./DESIGN.md) for the Foundry System design system and copy posture.

## Stack

- Expo SDK 54, React Native 0.81, React 19, TypeScript, Expo Router 6
- Zustand for app state, React Hook Form + Zod for estimate validation
- `expo-sqlite` for local project, inspiration, concept, regulation, property-record, and sync-queue tables
- Self-hosted brand fonts via `@expo-google-fonts/fraunces`, `@expo-google-fonts/inter-tight`, and `@expo-google-fonts/ibm-plex-mono`
- Firebase client SDK for optional Auth, Firestore, and callable Cloud Functions
- Gemini integration runs server-side through Cloud Functions, not directly from the mobile client

## App Surfaces

The tab bar follows DESIGN.md's revenue-first hierarchy. Labels are short on mobile; on web the side rail uses the same routes.

| Route | Tab label | Purpose |
| --- | --- | --- |
| `app/(tabs)/index.tsx` | Value | Home revenue dashboard: monthly rent, net annual income, cost range, payback, builder matches, packet readiness |
| `app/(tabs)/estimate.tsx` | Estimate | Underwriting sheet: gross rent, expenses, cost range, value range, payback, sensitivity assumptions |
| `app/(tabs)/contractors.tsx` | Builders | Builder matches, license/insurance signals, quote packet flow |
| `app/(tabs)/guide.tsx` | Permits | Risk level, blockers, verification steps, source citations |
| `app/(tabs)/ideas.tsx` | Studio | Model fit, backyard placement, style selection, site photo context, generate concept |

A floating Feedback control is available across tabs and writes through the `submitFeedback` callable.

## Local Development

```bash
npm install
npm run web
```

For native device development:

```bash
npm run ios
npm run android
```

## Verification

```bash
npm run typecheck
npm test
npm run release:check
```

## Firebase Configuration

The app runs without Firebase, but this checkout is wired to the Firebase project `yardup-2026` for native builds. The registered native identifiers are:

- iOS bundle ID: `com.aduadvisor.app`
- Android package: `com.aduadvisor.app`

Native bundle IDs intentionally keep the `aduadvisor` reverse-DNS to preserve store listing continuity; the user-visible product name is `Lot/Foundry`.

For local native builds, download the `yardup-2026` SDK config files into the ignored paths `firebase/GoogleService-Info.plist` and `firebase/google-services.json`. For EAS builds, provide those same files as File environment variables named `GOOGLE_SERVICE_INFO_PLIST` and `GOOGLE_SERVICES_JSON`; `app.config.ts` passes the supplied paths to Expo SDK 54 through `ios.googleServicesFile` and `android.googleServicesFile`.

Firebase client config defaults are checked into `app.config.ts` because they are public Firebase app identifiers. `.env.example` records the same `yardup-2026` identifiers and the local native-file fallback paths. `npm run firebase:check`, included in `npm run release:check`, rejects a native build configuration that drifts from the production project or from `com.aduadvisor.app`. The mobile client only calls configured Firebase callable functions; Gemini API keys remain in the backend environment.

Callable functions exposed by the backend:

- `getRegulationGuide({ jurisdiction })`
- `generateDesignConcept({ project, inspiration, preferences? })`
- `searchPropertyHistory({ address, projectId })`
- `submitQuoteRequest({ projectId, contractorId, packetItems, homeownerConsent: true })`
- `submitFeedback({ message, surface, projectId? })` — rate-limited per anonymous user

See [docs/api/api-design.md](./docs/api/api-design.md) for the full callable contract, payload shapes, and the future REST surface.

## Backend Development

The Firebase backend lives in `functions/` and is intentionally self-contained from the mobile app. It provides callable Functions for regulation guidance, design concepts, property-history search, quote requests, and feedback submission. Functions validate payloads with Zod, use Firebase Admin for server-side Firestore writes, and log service calls without storing raw addresses.

```bash
npm install --prefix functions
npm run backend:typecheck
npm run backend:test
npm run backend:build
```

For local Firebase emulators:

```bash
npx firebase emulators:start
```

For deployment, confirm `.firebaserc` targets `yardup-2026`, provide the native SDK files through the local or EAS File-variable paths described above, and keep `GEMINI_API_KEY` as a backend environment secret. If no Gemini key or municipal property-data provider is configured, backend functions return deterministic, source-cited fallback responses so the app remains usable.

## Builds

```bash
npx eas build --profile preview --platform ios
npx eas build --profile preview --platform android
npx eas build --profile production --platform all
```

## Privacy Defaults

Exact addresses stay in local SQLite unless the user initiates a cloud-backed action such as geocoding, sync, regulation refresh, property history search, or quote request. AI design generation receives project constraints and lot facts through backend mediation, with unnecessary personal identifiers removed. Site photos remain on-device in the React Native client; the backend receives only whether a site photo exists.

See [docs/legal/privacy-policy.md](./docs/legal/privacy-policy.md) and [docs/legal/support.md](./docs/legal/support.md).

## Release Environment

Production and preview native builds require these EAS **File** environment variables:

- `GOOGLE_SERVICES_JSON`: the Android `yardup-2026` config registered to `com.aduadvisor.app`
- `GOOGLE_SERVICE_INFO_PLIST`: the iOS `yardup-2026` config registered to `com.aduadvisor.app`

`eas.json` selects the corresponding `development`, `preview`, or `production` EAS environment for each build profile. The public JavaScript Firebase defaults in `app.config.ts` already target `yardup-2026`; if an environment deliberately overrides them, supply the full `EXPO_PUBLIC_FIREBASE_*` set shown in `.env.example` together so the runtime app IDs stay aligned with the native files.

`GEMINI_API_KEY` belongs in Firebase Functions runtime config or Secret Manager, never in Expo client config.

The app still runs offline when Firebase values are absent, but store review builds must use the production Firebase project so callable features can be reviewed.

Addresses outside sourced jurisdiction coverage enter a `local-review` state: earning potential remains available, while parcel facts, permit guidance, and builder matches require local verification. A recorded builder outreach submission is not delivery; a packet is commercially eligible only after the homeowner consents and a future verified delivery event is recorded. Local retries and pending submissions are not chargeable events.

## Store Review Materials

- Privacy policy: [docs/legal/privacy-policy.md](./docs/legal/privacy-policy.md)
- Support: [docs/legal/support.md](./docs/legal/support.md)
- Review notes: [docs/release/store-review-notes.md](./docs/release/store-review-notes.md)

## Marketing And Web

Brand and marketing asset briefs that follow the Lot/Foundry (Foundry System) identity:

- [docs/marketing/marketing-kit.md](./docs/marketing/marketing-kit.md)
- [docs/marketing/web-assets.md](./docs/marketing/web-assets.md)

## Repository Identity

This checkout is the canonical Lot/Foundry mobile product repository: `https://github.com/torralba85/YardUp.git`. The GitHub repo name, the local directory name `ADU Advisor`, and the native bundle identifier `com.aduadvisor.app` preserve legal and store-listing continuity; they do not refer to a separate app repository. The repository was previously branded YardUp; the brand has since moved to Lot/Foundry while these identifiers stayed put.

Use this checkout and `origin/main` (the default branch) as the source of truth for product, design, release, and backend work. Treat a prototype as a separate system only when it is supplied with a distinct path or remote, and do not transfer its privacy or deployment assumptions into the mobile app without verification.

## Documentation Index

- [DESIGN.md](./DESIGN.md) — Foundry System design system, tokens, and copy rules
- [docs/brand/lotfoundry-direction-05.html](./docs/brand/lotfoundry-direction-05.html) — Canonical Lot/Foundry brand identity reference (Direction 05)
- [AGENTS.md](./AGENTS.md) — Working agreement for agent-driven changes
- [docs/api/api-design.md](./docs/api/api-design.md) — Resource model and callable contract
- [docs/hyperframes/design-studio-demo.md](./docs/hyperframes/design-studio-demo.md) — Demo composition brief
- [docs/superpowers/plans/](./docs/superpowers/plans/) — Historical implementation plans
