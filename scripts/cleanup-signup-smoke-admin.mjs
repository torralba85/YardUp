import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) {
  console.error("Missing FIREBASE_SERVICE_ACCOUNT.");
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(raw);
} catch {
  console.error("FIREBASE_SERVICE_ACCOUNT is not valid JSON.");
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}

const auth = getAuth();
const db = getFirestore();
const cutoff = Date.parse("2026-09-28T21:30:00Z");
const matches = [];
let pageToken;

do {
  const page = await auth.listUsers(1000, pageToken);
  for (const user of page.users) {
    const created = Date.parse(user.metadata.creationTime || "");
    if (
      /^lotfoundry-signup-smoke\+.+@example\.com$/i.test(user.email || "") &&
      user.displayName === "LotFoundry Signup Smoke" &&
      Number.isFinite(created) &&
      created >= cutoff
    ) {
      matches.push(user);
    }
  }
  pageToken = page.pageToken;
} while (pageToken);

if (matches.length === 0) {
  console.log("[signup-smoke-cleanup] No matching disposable users found.");
  process.exit(0);
}

if (matches.length > 5) {
  throw new Error(
    `Refusing to delete ${matches.length} users; expected at most 5 disposable canary accounts.`,
  );
}

for (const user of matches) {
  await db.collection("users").doc(user.uid).delete().catch((error) => {
    if (error?.code !== 5) throw error;
  });
  await auth.deleteUser(user.uid);
}

console.log(
  `[signup-smoke-cleanup] Deleted ${matches.length} disposable signup canary account(s) and profile(s).`,
);
