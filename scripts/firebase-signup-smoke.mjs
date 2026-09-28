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
const appCheckDebugToken = process.env.FIREBASE_SMOKE_APPCHECK_DEBUG_TOKEN;

if (!appCheckDebugToken) {
  console.error(
    "Missing FIREBASE_SMOKE_APPCHECK_DEBUG_TOKEN. The signup canary is intentionally opt-in.",
  );
  process.exit(1);
}

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const email = `lotfoundry-signup-smoke+${suffix}@example.com`;
const password = `LfSmoke!${Date.now()}xQ`;
const displayName = "LotFoundry Signup Smoke";
let appCheckToken = null;
let session = null;
let profileCreated = false;

async function exchangeAppCheckDebugToken() {
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

async function requestJson(url, init = {}) {
  const headers = new Headers(init.headers);
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

async function createAccount() {
  const body = await requestJson(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  if (!body.idToken || !body.localId) {
    throw new Error("Firebase Auth signup did not return an ID token and uid.");
  }
  return { idToken: body.idToken, uid: body.localId };
}

async function createProfile({ idToken, uid }) {
  const documentName =
    `projects/${projectId}/databases/(default)/documents/users/${uid}`;
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
              fields: {
                displayName: { stringValue: displayName },
                email: { stringValue: email },
                role: { stringValue: "user" },
                legalConsent: {
                  mapValue: {
                    fields: {
                      termsVersion: { stringValue: "2026-08-26" },
                      privacyVersion: { stringValue: "2026-08-26" },
                      adultConfirmed: { booleanValue: true },
                    },
                  },
                },
              },
            },
            updateTransforms: [
              {
                fieldPath: "legalConsent.acceptedAt",
                setToServerValue: "REQUEST_TIME",
              },
              { fieldPath: "createdAt", setToServerValue: "REQUEST_TIME" },
              { fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" },
            ],
            currentDocument: { exists: false },
          },
        ],
      }),
    },
  );
  return documentName;
}

async function verifyProfile({ idToken, uid }) {
  const doc = await requestJson(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`,
    { headers: { Authorization: `Bearer ${idToken}` } },
  );
  if (doc.fields?.email?.stringValue !== email) {
    throw new Error("Signup smoke profile email did not match the created account.");
  }
  if (doc.fields?.role?.stringValue !== "user") {
    throw new Error("Signup smoke profile role was not persisted.");
  }
  if (
    doc.fields?.legalConsent?.mapValue?.fields?.adultConfirmed?.booleanValue !== true ||
    !doc.fields?.legalConsent?.mapValue?.fields?.acceptedAt?.timestampValue
  ) {
    throw new Error("Signup smoke legal consent receipt was not persisted.");
  }
}

async function deleteProfile({ idToken, uid }) {
  await requestJson(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${idToken}` },
    },
  );
}

async function deleteAccount(idToken) {
  await requestJson(
    `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    },
  );
}

try {
  appCheckToken = await exchangeAppCheckDebugToken();
  console.log("[signup-smoke] App Check token acquired.");
  session = await createAccount();
  console.log("[signup-smoke] Disposable Firebase Auth user created.");
  await createProfile(session);
  profileCreated = true;
  console.log("[signup-smoke] Firestore profile and legal consent created.");
  await verifyProfile(session);
  console.log("[signup-smoke] Signup profile verified.");
  await deleteProfile(session);
  profileCreated = false;
  await deleteAccount(session.idToken);
  session = null;
  console.log("[signup-smoke] Disposable account cleaned up.");
  console.log("[signup-smoke] Firebase signup + profile persistence passed.");
} catch (error) {
  console.error(
    `[signup-smoke] ${error instanceof Error ? error.message : String(error)}`,
  );
  if (session) {
    try {
      if (profileCreated) await deleteProfile(session);
      await deleteAccount(session.idToken);
      console.error("[signup-smoke] Cleaned up disposable account after failure.");
    } catch (cleanupError) {
      console.error(
        `[signup-smoke] Cleanup failed: ${
          cleanupError instanceof Error ? cleanupError.message : String(cleanupError)
        }`,
      );
    }
  }
  process.exit(1);
}
