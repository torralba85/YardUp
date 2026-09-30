import { cert, deleteApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

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
const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!appCheckDebugToken) {
  console.error(
    "Missing FIREBASE_SMOKE_APPCHECK_DEBUG_TOKEN. The signup canary is intentionally opt-in.",
  );
  process.exit(1);
}

if (!serviceAccountRaw) {
  console.error(
    "Missing FIREBASE_SERVICE_ACCOUNT. Admin cleanup is required for the signup canary.",
  );
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountRaw);
} catch {
  console.error("FIREBASE_SERVICE_ACCOUNT is not valid JSON.");
  process.exit(1);
}

const adminApp = initializeApp(
  {
    credential: cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key,
    }),
    projectId,
  },
  "signup-smoke-cleanup",
);
const adminAuth = getAuth(adminApp);
const adminDb = getFirestore(adminApp);

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const email = `lotfoundry-signup-smoke+${suffix}@example.com`;
const password = `LfSmoke!${Date.now()}xQ`;
const displayName = "LotFoundry Signup Smoke";
let appCheckToken = null;
let session = null;

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

async function signInAccount() {
  const body = await requestJson(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  if (!body.idToken || !body.localId) {
    throw new Error("Firebase Auth login did not return an ID token and uid.");
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

async function cleanupAccount(uid) {
  await adminDb.collection("users").doc(uid).delete();
  await adminAuth.deleteUser(uid);
}

try {
  appCheckToken = await exchangeAppCheckDebugToken();
  console.log("[signup-smoke] App Check token acquired.");
  session = await createAccount();
  console.log("[signup-smoke] Disposable Firebase Auth user created.");
  await createProfile(session);
  console.log("[signup-smoke] Firestore profile and legal consent created.");
  await verifyProfile(session);
  console.log("[signup-smoke] Signup profile verified.");

  const loginSession = await signInAccount();
  if (loginSession.uid !== session.uid) {
    throw new Error("Firebase Auth login returned a different uid.");
  }
  console.log("[signup-smoke] Disposable account signed back in.");
  await verifyProfile(loginSession);
  console.log("[signup-smoke] Login token verified persisted profile and consent.");

  await cleanupAccount(session.uid);
  session = null;
  console.log("[signup-smoke] Disposable account cleaned up with Firebase Admin.");
  console.log("[signup-smoke] Firebase signup + login + profile persistence passed.");
} catch (error) {
  console.error(
    `[signup-smoke] ${error instanceof Error ? error.message : String(error)}`,
  );

  if (session) {
    try {
      await cleanupAccount(session.uid);
      console.error("[signup-smoke] Cleaned up disposable account after failure.");
    } catch (cleanupError) {
      console.error(
        `[signup-smoke] Cleanup failed: ${
          cleanupError instanceof Error ? cleanupError.message : String(cleanupError)
        }`,
      );
    }
  }

  process.exitCode = 1;
} finally {
  await deleteApp(adminApp);
}
