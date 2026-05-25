# YardUp

YardUp is the customer-facing brand for ADU Advisor, an Expo React Native app that helps homeowners understand the money, feasibility, and builder path for an accessory dwelling unit before they spend on professional work. The first surface answers how much an ADU could earn, what it would cost, how fast it could pay back, and which builders can act on it. Design, permit checks, model fit, and photo context are proof paths under the revenue story, not the headline.

Local-first by default: project studies live in on-device SQLite. Cloud services (Firebase Auth, Firestore, callable Cloud Functions) layer in on top for sync, regulation refreshes, public-record lookups, AI concept generation, builder quote requests, and product feedback.

The product is not California-only. Use "supported markets", "local rules", and "jurisdiction" framing. See [DESIGN.md](./DESIGN.md) for the Quiet Ascent design system and copy posture.

## Stack

- Expo SDK 54, React Native 0.81, React 19, TypeScript, Expo Router 6
- Zustand for app state, React Hook Form + Zod for estimate validation
- `expo-sqlite` for local project, inspiration, concept, regulation, property-record, and sync-queue tables
- Self-hosted brand fonts via `@expo-google-fonts/fraunces`, `@expo-google-fonts/hanken-grotesk`, and `@expo-google-fonts/ibm-plex-mono`
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

Native bundle IDs intentionally keep the `aduadvisor` reverse-DNS to preserve store listing continuity; the user-visible product name is `YardUp`.

Native Firebase build config files live in `firebase/GoogleService-Info.plist` and `firebase/google-services.json`, and `app.config.ts` points Expo SDK 54 at those files with `ios.googleServicesFile` and `android.googleServicesFile`. The mobile client only calls configured Firebase callable functions; Gemini API keys remain in the backend environment.

Firebase client config defaults are checked into `app.config.ts` because they are public Firebase app identifiers. To override them for another project or EAS environment, set the variables shown in `.env.example`.

Callable functions exposed by the backend:

- `getRegulationGuide({ jurisdiction })`
- `generateDesignConcept({ project, inspiration, preferences? })`
- `searchPropertyHistory({ address, projectId })`
- `submitQuoteRequest({ projectId, contractorId, packetItems })`
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

For deployment, set the real Firebase project in `.firebaserc`, populate the Expo Firebase config, and keep `GEMINI_API_KEY` as a backend environment secret. If no Gemini key or municipal property-data provider is configured, backend functions return deterministic, source-cited fallback responses so the app remains usable.

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

Production builds require these EAS environment variables:

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID` (currently `yardup-2026`)
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_FIREBASE_IOS_APP_ID`
- `EXPO_PUBLIC_FIREBASE_ANDROID_APP_ID`
- `GEMINI_API_KEY` in Firebase Functions runtime config or Secret Manager, never in Expo client config

The app still runs offline when Firebase values are absent, but store review builds must use the production Firebase project so callable features can be reviewed.

## Store Review Materials

- Privacy policy: [docs/legal/privacy-policy.md](./docs/legal/privacy-policy.md)
- Support: [docs/legal/support.md](./docs/legal/support.md)
- Review notes: [docs/release/store-review-notes.md](./docs/release/store-review-notes.md)

## Marketing And Web

Brand and marketing asset briefs that follow the Quiet Ascent identity:

- [docs/marketing/marketing-kit.md](./docs/marketing/marketing-kit.md)
- [docs/marketing/web-assets.md](./docs/marketing/web-assets.md)

## Related Repositories

- `github.com/torralba85/YardUp` — Next.js web prototype that experiments with property-photo + address upload backed by Gemini Vision for ADU mockup generation. Outputs from that prototype feed the mobile product's Studio surface only after backend mediation and the privacy rules above.

## Documentation Index

- [DESIGN.md](./DESIGN.md) — Quiet Ascent design system, tokens, and copy rules
- [AGENTS.md](./AGENTS.md) — Working agreement for agent-driven changes
- [docs/api/api-design.md](./docs/api/api-design.md) — Resource model and callable contract
- [docs/hyperframes/design-studio-demo.md](./docs/hyperframes/design-studio-demo.md) — Demo composition brief
- [docs/superpowers/plans/](./docs/superpowers/plans/) — Historical implementation plans
