# App Store Readiness Implementation Plan

> Historical plan snapshot. Current release configuration is defined by `README.md`, `app.config.ts`, and `.firebaserc`; the production Firebase project is `yardup-2026` and the backend AI secret is `GEMINI_API_KEY`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move ADU Advisor from a local-first Expo/Firebase MVP to an App Store Connect and Google Play-ready release candidate.

**Architecture:** Keep the app offline-first with SQLite as the core state layer, then make cloud features explicitly optional, authenticated where writes occur, rate-limited, and accurately described in privacy/store metadata. Use Expo SDK 54 app config, EAS Build, EAS Submit, Firebase Functions, Firebase Auth, Firestore rules, and deterministic fallback behavior for provider outages.

**Tech Stack:** Expo SDK 54, React Native, Expo Router, EAS Build/Submit, Firebase Auth, Firebase Functions v2, Firestore, TypeScript, Vitest, expo-sqlite, Zod.

---

## Current Readiness Snapshot

**Repo evidence gathered on 2026-05-21:**
- `npm run backend:typecheck` passed.
- `npm run backend:test` passed: 4 files, 8 tests.
- `npm run backend:build` passed.
- `npx expo config --json` resolves SDK `54.0.0` and platforms `ios`, `android`, `web`.
- `npx expo-doctor` failed 2 checks:
  - Missing peer dependencies: `expo-font`, `expo-linking`.
  - Duplicate native module: `expo-font@55.0.7` at root and `expo-font@14.0.11` under `expo`.
- `app.json` has no `ios.bundleIdentifier`, no `ios.buildNumber`, no `android.package`, no `android.versionCode`, and empty Firebase config values.
- `eas.json` already has `development`, `preview`, `production`, and `submit.production` profiles.
- Firebase Functions exist for `getRegulationGuide`, `generateDesignConcept`, `searchPropertyHistory`, and `submitQuoteRequest`.
- Firestore rules protect user-scoped documents, public-read regulation/contractor collections, service request logs, and default deny.
- Client Firebase initialization returns `null` when config is missing, so the app currently works as an offline-first demo without cloud config.

**Release posture: not ready for store submission yet.**

Smallest viable App Store/Play Store path: ship as a local-first ADU feasibility planner with optional cloud concept/record/quote acceleration, clear disclaimers, no live municipal-result claims, no ads, no payments, and no account requirement unless cloud sync is enabled.

Estimated completion:
- **MVP store candidate:** 8-12 focused engineering days plus store account review/test waiting time.
- **Production backend with real property/municipal providers:** 4-8 additional weeks, because source contracts, provider reliability, address matching, compliance wording, and operational support become the main work.

---

## File Structure

**Release configuration**
- Modify `package.json`: add missing Expo peer dependencies with `npx expo install expo-font expo-linking`.
- Modify `app.json` or create `app.config.ts`: add native identifiers, version codes, release URLs, and environment-driven Firebase config.
- Modify `eas.json`: define production env names and submit profiles.
- Modify `README.md`: document release commands and backend deployment requirements.

**Client cloud/auth boundary**
- Modify `src/services/firebase.ts`: initialize Firebase only with complete config and expose auth helper.
- Create `src/services/session.ts`: sign in anonymously before cloud write/callable actions that require auth.
- Modify `src/services/advisorServices.ts`: call `ensureFirebaseSession()` before quote request and any future user-scoped cloud write.
- Modify `src/state/appStore.ts`: surface cloud failures as local fallback state without claiming live submission.
- Test `src/services/firebase.test.ts` and `src/state/appStore.test.ts`.

**Backend production safety**
- Create `functions/src/lib/rateLimit.ts`: Firestore-backed rate limit keyed by user ID or hashed IP-like caller key.
- Modify `functions/src/index.ts`: require auth for `submitQuoteRequest`; rate-limit AI/property/quote callables; keep read-only guide fallback open.
- Modify `functions/src/lib/quoteRequests.ts`: reject unauthenticated writes at function level instead of silently returning an unsaved quote.
- Modify `firestore.rules`: keep client writes scoped and deny `serviceRequests`.
- Test `functions/src/lib/rateLimit.test.ts`, `functions/src/lib/quoteRequests.test.ts`, and `functions/src/schemas.test.ts`.

**Privacy, support, and review content**
- Create `docs/legal/privacy-policy.md`: plain-English privacy policy matching actual app behavior.
- Create `docs/legal/support.md`: support and deletion/contact instructions.
- Create `docs/release/store-review-notes.md`: Apple/Google review notes, demo mode explanation, backend availability checklist.
- Create `store/metadata/en-US/description.txt`, `store/metadata/en-US/keywords.txt`, `store/metadata/en-US/release_notes.txt`: copy that does not overclaim live permitting or contractor services.

**QA and submission**
- Add `scripts/release-check.mjs`: runs typecheck, tests, backend checks, and `expo-doctor`.
- Modify `package.json`: add `release:check`.
- Run EAS preview builds, then production builds and submissions after store metadata is ready.

---

### Task 1: Fix Expo Doctor and Native Identity

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `app.json`

- [ ] **Step 1: Install Expo peer dependencies**

Run:
```powershell
npx expo install expo-font expo-linking
```

Expected: `package.json` includes `expo-font` and `expo-linking` versions compatible with SDK 54.

- [ ] **Step 2: Deduplicate installed native modules**

Run:
```powershell
npm dedupe
npx expo-doctor
```

Expected: `expo-doctor` passes all checks. If duplicate `expo-font` remains, remove `node_modules` and reinstall:

```powershell
Remove-Item -LiteralPath .\node_modules -Recurse -Force
npm install
npx expo-doctor
```

- [ ] **Step 3: Add native app identifiers and versioning**

Modify `app.json`:

```json
{
  "expo": {
    "name": "ADU Advisor",
    "slug": "adu-advisor",
    "scheme": "aduadvisor",
    "version": "1.0.0",
    "runtimeVersion": {
      "policy": "appVersion"
    },
    "ios": {
      "bundleIdentifier": "com.aduadvisor.app",
      "buildNumber": "1",
      "supportsTablet": true,
      "usesNonExemptEncryption": false
    },
    "android": {
      "package": "com.aduadvisor.app",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "edgeToEdgeEnabled": true,
      "predictiveBackGestureEnabled": false
    }
  }
}
```

Preserve existing `plugins`, `extra.firebase`, `web`, `icon`, `splash`, `orientation`, `userInterfaceStyle`, and `newArchEnabled` fields while adding the fields above.

- [ ] **Step 4: Verify resolved Expo config**

Run:
```powershell
npx expo config --json
```

Expected: output includes `"sdkVersion":"54.0.0"`, `"bundleIdentifier":"com.aduadvisor.app"`, `"package":"com.aduadvisor.app"`, `"buildNumber":"1"`, and `"versionCode":1`.

- [ ] **Step 5: Commit**

Run:
```powershell
git add package.json package-lock.json app.json
git commit -m "chore: configure native release identity"
```

---

### Task 2: Move Firebase Config to Release-Safe App Config

**Files:**
- Create: `app.config.ts`
- Modify: `app.json`
- Modify: `README.md`

- [ ] **Step 1: Convert static Firebase config into dynamic config**

Create `app.config.ts`:

```typescript
import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "ADU Advisor",
  slug: "adu-advisor",
  scheme: "aduadvisor",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  runtimeVersion: {
    policy: "appVersion",
  },
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  ios: {
    bundleIdentifier: "com.aduadvisor.app",
    buildNumber: "1",
    supportsTablet: true,
    usesNonExemptEncryption: false,
  },
  android: {
    package: "com.aduadvisor.app",
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  extra: {
    firebase: {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "",
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "",
    },
  },
  plugins: [
    "expo-router",
    "expo-sqlite",
    [
      "expo-image-picker",
      {
        photosPermission: "ADU Advisor lets you choose backyard photos to tailor ADU concepts to your property.",
        cameraPermission: "ADU Advisor lets you take backyard photos to tailor ADU concepts to your property.",
        microphonePermission: false,
      },
    ],
  ],
};

export default config;
```

- [ ] **Step 2: Reduce `app.json` to avoid conflicting config**

Replace `app.json` with:

```json
{
  "expo": {}
}
```

- [ ] **Step 3: Document required release env vars**

Add this section to `README.md`:

```markdown
## Release Environment

Production native builds require these EAS File environment variables:

- `GOOGLE_SERVICES_JSON`
- `GOOGLE_SERVICE_INFO_PLIST`

The public `EXPO_PUBLIC_FIREBASE_*` defaults target `yardup-2026`; override the full set together only when deliberately using another Firebase app configuration.

`GEMINI_API_KEY` belongs in Firebase Functions runtime config or Secret Manager, never in Expo client config.

The app still runs offline when Firebase values are absent, but store review builds must use the production Firebase project so callable features can be reviewed.
```

- [ ] **Step 4: Verify config still resolves**

Run:
```powershell
npx expo config --json
npm run typecheck
```

Expected: both commands pass and resolved `extra.firebase` reads from environment variables when present.

- [ ] **Step 5: Commit**

Run:
```powershell
git add app.config.ts app.json README.md
git commit -m "chore: move release config to app config"
```

---

### Task 3: Add Anonymous Firebase Session for Cloud Writes

**Files:**
- Create: `src/services/session.ts`
- Modify: `src/services/firebase.ts`
- Modify: `src/services/advisorServices.ts`
- Create: `src/services/session.test.ts`

- [ ] **Step 1: Write session unit test**

Create `src/services/session.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";

const signInAnonymously = vi.fn();
const getFirebaseClients = vi.fn();

vi.mock("firebase/auth", () => ({ signInAnonymously }));
vi.mock("./firebase", () => ({ getFirebaseClients }));

describe("ensureFirebaseSession", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns false when Firebase is not configured", async () => {
    getFirebaseClients.mockReturnValue(null);
    const { ensureFirebaseSession } = await import("./session");

    await expect(ensureFirebaseSession()).resolves.toBe(false);
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it("signs in anonymously when Firebase is configured and no user exists", async () => {
    const auth = { currentUser: null };
    getFirebaseClients.mockReturnValue({ auth });
    signInAnonymously.mockResolvedValue({ user: { uid: "anon-1" } });
    const { ensureFirebaseSession } = await import("./session");

    await expect(ensureFirebaseSession()).resolves.toBe(true);
    expect(signInAnonymously).toHaveBeenCalledWith(auth);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
npx vitest run src/services/session.test.ts
```

Expected: FAIL because `src/services/session.ts` does not exist.

- [ ] **Step 3: Implement session helper**

Create `src/services/session.ts`:

```typescript
import { signInAnonymously } from "firebase/auth";

import { getFirebaseClients } from "./firebase";

export async function ensureFirebaseSession(): Promise<boolean> {
  const clients = getFirebaseClients();
  if (!clients) {
    return false;
  }

  if (clients.auth.currentUser) {
    return true;
  }

  await signInAnonymously(clients.auth);
  return true;
}
```

- [ ] **Step 4: Require session before quote requests**

Modify `src/services/advisorServices.ts`:

```typescript
import { ensureFirebaseSession } from "./session";
```

Replace `submitQuoteRequest` with:

```typescript
export async function submitQuoteRequest(
  projectId: string,
  contractorId: string,
  packetItems: string[],
): Promise<QuoteRequest | null> {
  const hasSession = await ensureFirebaseSession();
  if (!hasSession) {
    return null;
  }

  return callCloudFunction<{ projectId: string; contractorId: string; packetItems: string[] }, QuoteRequest>(
    "submitQuoteRequest",
    {
      projectId,
      contractorId,
      packetItems,
    },
  ).catch(() => null);
}
```

- [ ] **Step 5: Verify tests**

Run:
```powershell
npx vitest run src/services/session.test.ts src/services/contracts.test.ts src/state/appStore.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:
```powershell
git add src/services/session.ts src/services/session.test.ts src/services/advisorServices.ts
git commit -m "feat: add anonymous session for cloud writes"
```

---

### Task 4: Enforce Auth and Rate Limits in Functions

**Files:**
- Create: `functions/src/lib/rateLimit.ts`
- Create: `functions/src/lib/rateLimit.test.ts`
- Modify: `functions/src/index.ts`
- Modify: `functions/src/lib/quoteRequests.ts`

- [ ] **Step 1: Write rate limit tests**

Create `functions/src/lib/rateLimit.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { buildRateLimitKey, isRateLimitExceeded } from "./rateLimit";

describe("rateLimit", () => {
  it("builds a user-scoped key when auth is available", () => {
    expect(buildRateLimitKey("generateDesignConcept", "user-123")).toBe("generateDesignConcept:user:user-123");
  });

  it("builds an anonymous key when auth is absent", () => {
    expect(buildRateLimitKey("getRegulationGuide")).toBe("getRegulationGuide:anonymous");
  });

  it("allows requests below the limit", () => {
    expect(isRateLimitExceeded(2, 5)).toBe(false);
  });

  it("blocks requests at the limit", () => {
    expect(isRateLimitExceeded(5, 5)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
npm --prefix functions test -- src/lib/rateLimit.test.ts
```

Expected: FAIL because `rateLimit.ts` does not exist.

- [ ] **Step 3: Implement rate limit primitives**

Create `functions/src/lib/rateLimit.ts`:

```typescript
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

export type LimitedService = "getRegulationGuide" | "generateDesignConcept" | "searchPropertyHistory" | "submitQuoteRequest";

export function buildRateLimitKey(service: LimitedService, uid?: string): string {
  return uid ? `${service}:user:${uid}` : `${service}:anonymous`;
}

export function isRateLimitExceeded(count: number, limit: number): boolean {
  return count >= limit;
}

export async function enforceRateLimit(service: LimitedService, uid: string | undefined, limit: number): Promise<void> {
  const key = buildRateLimitKey(service, uid);
  const db = getFirestore();
  const ref = db.collection("rateLimits").doc(key);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const now = Timestamp.now();
    const windowStartedAt = snapshot.get("windowStartedAt") as Timestamp | undefined;
    const count = (snapshot.get("count") as number | undefined) ?? 0;
    const expired = !windowStartedAt || now.seconds - windowStartedAt.seconds >= 3600;

    if (expired) {
      transaction.set(ref, { count: 1, windowStartedAt: now, updatedAt: now }, { merge: true });
      return;
    }

    if (isRateLimitExceeded(count, limit)) {
      throw new HttpsError("resource-exhausted", "Too many requests. Try again later.");
    }

    transaction.set(ref, { count: count + 1, updatedAt: now }, { merge: true });
  });
}
```

- [ ] **Step 4: Require auth for quote requests**

Modify `functions/src/index.ts` in `submitQuoteRequest`:

```typescript
export const submitQuoteRequest = onCall(callableOptions, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Firebase authentication is required.");
  }

  await enforceRateLimit("submitQuoteRequest", request.auth.uid, 20);
  const input = parseOrThrow(submitQuoteRequestInputSchema, request.data);
  const saved = await saveQuoteRequest({
    ...input,
    userId: request.auth.uid,
  });
  await writeServiceLog({
    service: "submitQuoteRequest",
    status: "ok",
    projectId: input.projectId,
  });
  return saved;
});
```

Add import:

```typescript
import { enforceRateLimit } from "./lib/rateLimit";
```

- [ ] **Step 5: Rate-limit expensive or abuseable calls**

Modify `functions/src/index.ts`:

```typescript
export const getRegulationGuide = onCall(callableOptions, async (request) => {
  await enforceRateLimit("getRegulationGuide", request.auth?.uid, 120);
  const input = parseOrThrow(getRegulationGuideInputSchema, request.data);
  const guide = getSeededRegulationGuide(input.jurisdiction);
  await writeServiceLog({ service: "getRegulationGuide", status: "ok", jurisdiction: input.jurisdiction });
  return guide;
});

export const generateDesignConcept = onCall(callableOptions, async (request) => {
  await enforceRateLimit("generateDesignConcept", request.auth?.uid, 20);
  const input = parseOrThrow(generateDesignConceptInputSchema, request.data);
  const concept = await buildDesignConcept(input.project, input.inspiration, input.preferences);
  await writeServiceLog({
    service: "generateDesignConcept",
    status: process.env.GEMINI_API_KEY ? "ok" : "fallback",
    projectId: input.project.id,
    jurisdiction: input.project.jurisdiction,
    address: input.project.address,
  });
  return concept;
});

export const searchPropertyHistory = onCall(callableOptions, async (request) => {
  await enforceRateLimit("searchPropertyHistory", request.auth?.uid, 20);
  const input = parseOrThrow(searchPropertyHistoryInputSchema, request.data);
  const records = buildStarterPropertyHistory(input.address, input.projectId);
  await writeServiceLog({
    service: "searchPropertyHistory",
    status: "fallback",
    projectId: input.projectId,
    address: input.address,
  });
  return {
    records,
    unavailableSources: ["Live municipal permit provider", "County assessor provider"],
    confidence: "low",
  };
});
```

- [ ] **Step 6: Verify backend**

Run:
```powershell
npm run backend:typecheck
npm run backend:test
npm run backend:build
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:
```powershell
git add functions/src/index.ts functions/src/lib/rateLimit.ts functions/src/lib/rateLimit.test.ts functions/src/lib/quoteRequests.ts
git commit -m "feat: harden callable backend for release"
```

---

### Task 5: Add Release Legal and Review Documentation

**Files:**
- Create: `docs/legal/privacy-policy.md`
- Create: `docs/legal/support.md`
- Create: `docs/release/store-review-notes.md`
- Modify: `README.md`

- [ ] **Step 1: Create privacy policy draft**

Create `docs/legal/privacy-policy.md`:

```markdown
# ADU Advisor Privacy Policy

Effective date: 2026-05-21

ADU Advisor helps homeowners estimate accessory dwelling unit feasibility. The app stores project studies locally on the device by default.

## Data stored on device

The app may store property addresses, project names, ADU estimate assumptions, selected ADU models, design preferences, saved references, site photo references, property record notes, generated concept text, and quote packet status in local SQLite storage on the device.

## Data sent to backend services

When a user starts a cloud-backed action, ADU Advisor may send the minimum data needed for that action to Firebase Cloud Functions. Examples include jurisdiction IDs for regulation guidance, project constraints for design concept generation, property addresses for property history lookup, and contractor IDs for quote requests.

## AI processing

Design concept generation can use a server-side OpenAI integration. Exact address text and site photo binaries are not included in AI prompts. Prompts focus on project constraints, selected model information, style preferences, and fit signals.

## Site photos

Site photos selected or captured by the user remain on the device in the current release. The backend receives only whether a site photo exists.

## Service logs

Backend service logs may record service name, project ID, jurisdiction, status, and a one-way hash of an address for abuse prevention and reliability. Raw addresses are not stored in service logs.

## Sharing

ADU Advisor does not sell user data. Backend providers are used only to operate the app features described in this policy.

## Contact and deletion

For support or deletion requests, contact support@aduadvisor.app.
```

- [ ] **Step 2: Create support document**

Create `docs/legal/support.md`:

```markdown
# ADU Advisor Support

Contact: support@aduadvisor.app

Users can request help, report bugs, or ask for deletion of cloud-backed records associated with their Firebase anonymous account. Local-only project data can be deleted by removing the app from the device.

ADU Advisor is a planning aid. It does not provide stamped plans, legal advice, financial advice, or guaranteed permit approval.
```

- [ ] **Step 3: Create review notes**

Create `docs/release/store-review-notes.md`:

```markdown
# Store Review Notes

ADU Advisor is an offline-first ADU feasibility planning app. The app can be reviewed without creating a traditional account. Firebase anonymous authentication is used only to protect cloud-backed quote request writes.

Backend services are live during review:

- Firebase Functions region: us-central1
- Regulation guide: source-cited seeded guide
- Design concept: deterministic fallback if OpenAI is unavailable
- Property history: fallback verification records until a municipal provider is connected
- Quote request: authenticated Firebase anonymous write

Reviewers should verify:

1. Start a property study from Home.
2. Open Studio and move or rotate the ADU footprint.
3. Generate a concept.
4. Save an estimate.
5. Request a quote from Build.

Important limitation: the current release is a planning aid and does not claim official permit approval, official assessor records, or contractor availability guarantees.
```

- [ ] **Step 4: Link docs from README**

Add:

```markdown
## Store Review Materials

- Privacy policy draft: `docs/legal/privacy-policy.md`
- Support draft: `docs/legal/support.md`
- Review notes: `docs/release/store-review-notes.md`
```

- [ ] **Step 5: Commit**

Run:
```powershell
git add docs/legal/privacy-policy.md docs/legal/support.md docs/release/store-review-notes.md README.md
git commit -m "docs: add store privacy and review materials"
```

---

### Task 6: Create Store Metadata Without Overclaiming

**Files:**
- Create: `store/metadata/en-US/description.txt`
- Create: `store/metadata/en-US/keywords.txt`
- Create: `store/metadata/en-US/release_notes.txt`
- Create: `store/metadata/en-US/review_notes.txt`

- [ ] **Step 1: Create metadata directory**

Run:
```powershell
New-Item -ItemType Directory -Force -Path store\metadata\en-US
```

- [ ] **Step 2: Create description**

Create `store/metadata/en-US/description.txt`:

```text
ADU Advisor helps California homeowners explore accessory dwelling unit feasibility before they call a builder.

Start a local property study, compare ADU model sizes, sketch backyard placement, estimate cost and rental value assumptions, review starter permit considerations, save design references, and prepare a quote-ready planning packet.

The app is local-first. Project studies and estimate assumptions are stored on your device by default. Cloud-backed actions are optional and used only when you request guidance, concept generation, property-record lookup, or quote packet actions.

ADU Advisor is a planning aid. It does not replace a licensed architect, contractor, attorney, financial advisor, surveyor, or local permitting authority. Always verify zoning, overlays, setbacks, utilities, fire access, and permit requirements with the city or county before making design or construction decisions.
```

- [ ] **Step 3: Create keywords**

Create `store/metadata/en-US/keywords.txt`:

```text
ADU,accessory dwelling unit,backyard home,garage conversion,California housing,permit planning,homeowner,feasibility,estimate
```

- [ ] **Step 4: Create release notes**

Create `store/metadata/en-US/release_notes.txt`:

```text
Initial release with local-first ADU project studies, backyard model planning, estimate assumptions, starter permit guidance, design references, and quote packet preparation.
```

- [ ] **Step 5: Create review notes from release docs**

Create `store/metadata/en-US/review_notes.txt`:

```text
ADU Advisor can be reviewed without a traditional login. Firebase anonymous authentication is used only for protected cloud-backed quote request writes. The current release is a planning aid with deterministic fallback behavior for cloud features. It does not claim official permit approval, official assessor records, or guaranteed contractor availability.
```

- [ ] **Step 6: Commit**

Run:
```powershell
git add store/metadata/en-US
git commit -m "docs: add initial store metadata"
```

---

### Task 7: Add Release Check Script

**Files:**
- Create: `scripts/release-check.mjs`
- Modify: `package.json`

- [ ] **Step 1: Create release check script**

Create `scripts/release-check.mjs`:

```javascript
import { spawnSync } from "node:child_process";

const commands = [
  ["npm", ["run", "typecheck"]],
  ["npm", ["test"]],
  ["npm", ["run", "backend:typecheck"]],
  ["npm", ["run", "backend:test"]],
  ["npm", ["run", "backend:build"]],
  ["npx", ["expo-doctor"]],
  ["npx", ["expo", "config", "--json"]],
];

for (const [cmd, args] of commands) {
  const result = spawnSync(cmd, args, { stdio: "inherit", shell: true });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
```

- [ ] **Step 2: Add package script**

Modify `package.json`:

```json
{
  "scripts": {
    "release:check": "node scripts/release-check.mjs"
  }
}
```

Preserve existing scripts.

- [ ] **Step 3: Run release check**

Run:
```powershell
npm run release:check
```

Expected: PASS after Task 1 dependency work is complete.

- [ ] **Step 4: Commit**

Run:
```powershell
git add scripts/release-check.mjs package.json
git commit -m "chore: add release readiness check"
```

---

### Task 8: Deploy Backend Release Candidate

**Files:**
- Modify: `README.md`
- Verify: `firebase.json`
- Verify: `.firebaserc`

- [ ] **Step 1: Confirm Firebase project**

Run:
```powershell
firebase projects:list
firebase use yardup-2026
```

Expected: active Firebase project is `yardup-2026`.

- [ ] **Step 2: Configure backend secret**

Run:
```powershell
firebase functions:secrets:set GEMINI_API_KEY
```

Expected: Firebase CLI prompts for the secret value and stores it outside the repository.

- [ ] **Step 3: Deploy Firestore rules and Functions**

Run:
```powershell
firebase deploy --only firestore:rules,functions
```

Expected: deployment succeeds and lists callable functions in `us-central1`.

- [ ] **Step 4: Smoke test callable endpoint through app UI**

Run the app:
```powershell
npm run web
```

In the app:
1. Start a property study.
2. Open Studio.
3. Generate a concept.
4. Open Build.
5. Request a quote.

Expected: app remains usable, quote request records locally, and Function logs show no uncaught errors.

- [ ] **Step 5: Commit README backend deployment instructions**

Add:

```markdown
## Backend Release Deployment

1. `firebase use yardup-2026`
2. `firebase functions:secrets:set GEMINI_API_KEY`
3. `firebase deploy --only firestore:rules,functions`
4. Verify callable logs for `generateDesignConcept`, `searchPropertyHistory`, and `submitQuoteRequest`.
```

Run:
```powershell
git add README.md
git commit -m "docs: document backend release deployment"
```

---

### Task 9: Build Preview and Production Binaries

**Files:**
- Verify: `eas.json`
- Verify: `app.config.ts`
- Verify: `store/metadata/en-US/*`

- [ ] **Step 1: Log in and validate EAS project**

Run:
```powershell
npx eas-cli whoami
npx eas-cli project:info
```

Expected: command reports the intended Expo account and ADU Advisor project.

- [ ] **Step 2: Create preview builds**

Run:
```powershell
npx eas-cli build --profile preview --platform ios
npx eas-cli build --profile preview --platform android
```

Expected: iOS internal build and Android internal build complete.

- [ ] **Step 3: Test preview builds on devices**

Manual checks:
1. App launches from cold start.
2. Home creates a property study.
3. Studio planner controls update placement.
4. Estimate saves assumptions.
5. Permit guide renders citations.
6. Build sends or locally records a quote request.
7. Camera and photo-library permission prompts show the configured copy.
8. Offline mode works after disabling network.

Expected: no crashes, no blocked first-run flow, and no clipped text on small phones.

- [ ] **Step 4: Build production binaries**

Run:
```powershell
npx eas-cli build --profile production --platform all
```

Expected: `.ipa` and `.aab` artifacts are available in EAS.

- [ ] **Step 5: Commit release notes update**

Run:
```powershell
git add store/metadata/en-US/release_notes.txt
git commit -m "docs: finalize initial release notes"
```

---

### Task 10: Submit to TestFlight and Google Play Testing

**Files:**
- Verify: `eas.json`
- Verify: `store/metadata/en-US/review_notes.txt`
- Verify: `docs/release/store-review-notes.md`

- [ ] **Step 1: Submit iOS build to App Store Connect**

Run:
```powershell
npx eas-cli submit --platform ios --latest
```

Expected: build appears in App Store Connect TestFlight after processing.

- [ ] **Step 2: Submit Android build to Play Console**

For first Google Play upload, use Play Console manually if API submission is not enabled. After first upload, run:

```powershell
npx eas-cli submit --platform android --latest
```

Expected: build appears on the selected Play testing track.

- [ ] **Step 3: Complete Apple App Store Connect requirements**

Complete in App Store Connect:
1. Privacy Policy URL: `https://aduadvisor.app/privacy`
2. Support URL: `https://aduadvisor.app/support`
3. App privacy answers matching `docs/legal/privacy-policy.md`
4. Screenshots for iPhone and iPad
5. Category: Productivity or Utilities
6. Review notes from `docs/release/store-review-notes.md`

- [ ] **Step 4: Complete Google Play Console requirements**

Complete in Play Console:
1. Privacy Policy URL: `https://aduadvisor.app/privacy`
2. App access instructions from `store/metadata/en-US/review_notes.txt`
3. Data safety form matching `docs/legal/privacy-policy.md`
4. Ads declaration: No
5. Target audience: adults/homeowners
6. Content rating questionnaire
7. Permissions declaration for camera/photos if requested
8. Closed testing if the account is a new personal developer account

- [ ] **Step 5: Run closed/beta testing**

Minimum test matrix:
1. iPhone small screen
2. iPhone large screen
3. iPad
4. Android small screen
5. Android large screen
6. Offline mode
7. Fresh install
8. Upgrade install
9. Firebase-configured build
10. Firebase-unavailable fallback

Expected: no critical crashes, no false claims about official permit results, and backend live during review.

---

## Gaps After This Plan

This plan produces a realistic MVP store candidate. It does not implement a full production municipal data platform.

Separate future plans should cover:
- Live municipal permit provider integration.
- Real assessor/property-history provider integration.
- User account management beyond Firebase anonymous auth.
- Cloud sync across devices.
- Hosted legal/support site implementation.
- In-app account/data deletion flow.
- Observability dashboards and alerting.
- Full accessibility audit on native devices.

---

## Self-Review

**Spec coverage:** The plan covers backend structure, release configuration, privacy/compliance, EAS builds/submission, and testing scope needed to reach app-store readiness.

**Placeholder scan:** The plan uses concrete paths, commands, package names, identifiers, URLs, and copy. No placeholder strings are required for implementation.

**Type consistency:** Client session helper returns `Promise<boolean>`, matching `advisorServices.ts`. Backend rate limit service union matches callable names in `functions/src/index.ts`.
