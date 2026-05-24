# ADU Advisor

ADU Advisor is an Expo React Native MVP for California homeowners exploring accessory dwelling unit feasibility. The app prioritizes offline estimating and local project state, then layers in optional Firebase/Cloud Function services for sync, regulation refreshes, property history, and AI design concepts.

## Stack

- Expo SDK 54, React Native, TypeScript, Expo Router
- Zustand for app state
- React Hook Form and Zod for estimate validation
- `expo-sqlite` for local project, inspiration, concept, regulation, property-record, and sync-queue tables
- Firebase client SDK for optional Auth, Firestore, and callable Cloud Functions
- OpenAI integration is expected to run server-side through Cloud Functions, not directly from the mobile client

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
```

## Firebase Configuration

The app runs without Firebase, but this checkout is wired to the Firebase project `adu-advisor` for native builds. The registered native identifiers are:

- iOS bundle ID: `com.aduadvisor.app`
- Android package: `com.aduadvisor.app`

Native Firebase build config files live in `firebase/GoogleService-Info.plist` and `firebase/google-services.json`, and `app.config.ts` points Expo SDK 54 at those files with `ios.googleServicesFile` and `android.googleServicesFile`. The mobile client only calls configured Firebase callable functions; OpenAI API keys should remain in the backend environment.

Firebase client config defaults are checked into `app.config.ts` because they are public Firebase app identifiers. To override them for another project or EAS environment, set the variables shown in `.env.example`.

Expected callable functions:

- `getRegulationGuide({ jurisdiction })`
- `generateDesignConcept({ project, inspiration })`
- `searchPropertyHistory({ address, projectId })`
- `submitQuoteRequest({ projectId, contractorId, packetItems })`

## Backend Development

The Firebase backend lives in `functions/` and is intentionally self-contained from the mobile app. It provides callable Functions for regulation guidance, design concepts, property-history search, and quote requests. Functions validate payloads with Zod, use Firebase Admin for server-side Firestore writes, and log service calls without storing raw addresses.

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

For deployment, set the real Firebase project in `.firebaserc`, populate the Expo Firebase config, and keep `OPENAI_API_KEY` as a backend environment secret. If no OpenAI key or municipal property-data provider is configured, backend functions return deterministic, source-cited fallback responses so the app remains usable.

## Builds

```bash
npx eas build --profile preview --platform ios
npx eas build --profile preview --platform android
npx eas build --profile production --platform all
```

## Privacy Defaults

Exact addresses stay in local SQLite unless the user initiates a cloud-backed action such as geocoding, sync, regulation refresh, or property history search. AI design generation should receive project constraints and lot facts through backend mediation, with unnecessary personal identifiers removed.

## Release Environment

Production builds require these EAS environment variables:

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_FIREBASE_IOS_APP_ID`
- `EXPO_PUBLIC_FIREBASE_ANDROID_APP_ID`
- `OPENAI_API_KEY` in Firebase Functions runtime config or Secret Manager, never in Expo client config

The app still runs offline when Firebase values are absent, but store review builds must use the production Firebase project so callable features can be reviewed.

## Store Review Materials

- Privacy policy draft: `docs/legal/privacy-policy.md`
- Support draft: `docs/legal/support.md`
- Review notes: `docs/release/store-review-notes.md`
