const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDqUcyMOM_sS77xVkwFIxqgAjv8hKksrJc",
  projectId: "yardup-2026",
  appId: "1:166268911022:web:08b5493550c6f176305c3f",
};

const apiKey =
  process.env.FIREBASE_SMOKE_API_KEY ||
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
  DEFAULT_FIREBASE_CONFIG.apiKey;
const projectId =
  process.env.FIREBASE_SMOKE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  DEFAULT_FIREBASE_CONFIG.projectId;
const appId =
  process.env.FIREBASE_SMOKE_APP_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
  DEFAULT_FIREBASE_CONFIG.appId;
const email = process.env.FIREBASE_SMOKE_EMAIL;
const password = process.env.FIREBASE_SMOKE_PASSWORD;
const appCheckDebugToken = process.env.FIREBASE_SMOKE_APPCHECK_DEBUG_TOKEN;

if (!email || !password) {
  console.error(
    [
      "Missing Firebase smoke credentials.",
      "Set FIREBASE_SMOKE_EMAIL and FIREBASE_SMOKE_PASSWORD for an existing test user.",
      "Optional overrides: FIREBASE_SMOKE_API_KEY and FIREBASE_SMOKE_PROJECT_ID.",
    ].join("\n"),
  );
  process.exit(1);
}

const scenarioId = `smoke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
let appCheckToken;

async function exchangeAppCheckDebugToken() {
  if (!appCheckDebugToken) return null;

  const response = await fetch(
    `https://firebaseappcheck.googleapis.com/v1/projects/${projectId}/apps/${appId}:exchangeDebugToken?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ debugToken: appCheckDebugToken, limitedUse: false }),
    },
  );
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.token) {
    const message = body?.error?.message || response.statusText;
    throw new Error(`App Check debug token exchange failed: ${response.status} ${message}`);
  }
  return body.token;
}

async function requestJson(url, init) {
  const headers = new Headers(init?.headers);
  if (appCheckToken) headers.set("X-Firebase-AppCheck", appCheckToken);
  const response = await fetch(url, { ...init, headers });
  const text = await response.text();
  let body = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
  }

  if (!response.ok) {
    const message = body?.error?.message || body?.raw || response.statusText;
    throw new Error(`${response.status} ${message}`);
  }

  return body;
}

function firestoreValue(value) {
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value).map(([key, nested]) => [key, firestoreValue(nested)]),
        ),
      },
    };
  }
  throw new Error(`Unsupported Firestore smoke value: ${String(value)}`);
}

function firestoreFields(input) {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, firestoreValue(value)]),
  );
}

async function signIn() {
  const body = await requestJson(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    },
  );

  if (!body.idToken || !body.localId) {
    throw new Error("Firebase Auth sign-in did not return an ID token and uid.");
  }

  return { idToken: body.idToken, uid: body.localId };
}

async function commitScenario({ idToken, uid }) {
  const documentName = `projects/${projectId}/databases/(default)/documents/users/${uid}/savedScenarios/${scenarioId}`;
  const scenario = {
    version: 2,
    heightConvention: "wall",
    pose: {
      x: 0,
      z: 0,
      rotationDeg: 0,
    },
    name: `Smoke scenario ${new Date().toISOString()}`,
    parcelId: "oak-street",
    config: {
      footprint: 600,
      width: 20,
      length: 30,
      height: 12,
      roof: "shed",
      finish: "cedar",
      includeOpenings: true,
    },
    assumptions: {
      costPerSqft: {
        cedar: 340,
        lap: 315,
        stucco: 330,
        board: 355,
      },
      softCostMultiplier: 1.18,
      operatingExpenseRatio: 0.325,
      rentScenario: "conservative",
    },
  };

  await requestJson(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        writes: [
          {
            update: {
              name: documentName,
              fields: firestoreFields(scenario),
            },
            updateMask: {
              fieldPaths: [
                "version",
                "heightConvention",
                "pose",
                "name",
                "parcelId",
                "config",
                "assumptions",
              ],
            },
            updateTransforms: [
              { fieldPath: "createdAt", setToServerValue: "REQUEST_TIME" },
              { fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" },
            ],
            currentDocument: { exists: false },
          },
        ],
      }),
    },
  );

  return { documentName, expectedName: scenario.name };
}

async function loadScenario({ idToken, documentName, expectedName }) {
  const encodedName = documentName
    .replace(`projects/${projectId}/databases/(default)/documents/`, "")
    .split("/")
    .map(encodeURIComponent)
    .join("/");
  const doc = await requestJson(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${encodedName}`,
    {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    },
  );

  if (doc.fields?.name?.stringValue !== expectedName) {
    throw new Error("Loaded smoke scenario did not match the saved payload.");
  }
}

async function deleteScenario({ idToken, documentName }) {
  const encodedName = documentName
    .replace(`projects/${projectId}/databases/(default)/documents/`, "")
    .split("/")
    .map(encodeURIComponent)
    .join("/");
  await requestJson(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${encodedName}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    },
  );
}

let smokeDocument;

try {
  appCheckToken = await exchangeAppCheckDebugToken();
  if (appCheckToken) console.log("[smoke] App Check token acquired.");
  const session = await signIn();
  console.log(`[smoke] Signed in ${email} (${session.uid}).`);
  smokeDocument = await commitScenario(session);
  console.log(`[smoke] Saved scenario ${scenarioId}.`);
  await loadScenario({ ...session, ...smokeDocument });
  console.log("[smoke] Loaded saved scenario successfully.");
  await deleteScenario({ ...session, ...smokeDocument });
  console.log("[smoke] Deleted smoke scenario.");
  console.log("[smoke] Firebase auth + scenario save/load passed.");
} catch (error) {
  console.error(`[smoke] ${error instanceof Error ? error.message : String(error)}`);
  if (smokeDocument) {
    try {
      const session = await signIn();
      await deleteScenario({ ...session, ...smokeDocument });
      console.error("[smoke] Cleaned up smoke scenario after failure.");
    } catch (cleanupError) {
      console.error(
        `[smoke] Cleanup failed: ${
          cleanupError instanceof Error ? cleanupError.message : String(cleanupError)
        }`,
      );
    }
  }
  process.exit(1);
}
