// Reports when a Regrid API token expires, without ever printing the token.
//
//   firebase functions:secrets:access REGRID_API_KEY_SECRET --project yardup-2026 | node scripts/check-regrid-token.mjs
//   REGRID_API_KEY=... node scripts/check-regrid-token.mjs
//
// Regrid tokens are HS256 JWTs; only the `exp` time claim is read. Exit codes:
// 0 valid (a warning is printed under 14 days), 1 expired, 2 no readable expiry.
// lib/server/regrid-token.ts does the same decode inside the server, where it
// logs the failure and the expiry warning.
import { readFileSync } from "node:fs";

const WARN_DAYS = 14;
const DAY_MS = 86_400_000;

function readToken() {
  const fromEnv = process.env.REGRID_API_KEY?.trim();
  if (fromEnv) return fromEnv;
  if (process.stdin.isTTY) return "";
  try {
    return readFileSync(0, "utf8").trim();
  } catch {
    return "";
  }
}

const token = readToken();
const parts = token.split(".");
if (parts.length !== 3) {
  console.error(
    token
      ? "The value is not a three-part JWT, so its expiry cannot be read."
      : "No token: pipe it in on stdin or set REGRID_API_KEY.",
  );
  process.exit(2);
}

let exp;
try {
  exp = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")).exp;
} catch {
  exp = undefined;
}
if (typeof exp !== "number" || !Number.isFinite(exp)) {
  console.error("The token has no readable exp claim.");
  process.exit(2);
}

const expiresMs = exp * 1000;
const daysLeft = Math.floor((expiresMs - Date.now()) / DAY_MS);
const when = new Date(expiresMs).toISOString();
if (expiresMs <= Date.now()) {
  console.error(`EXPIRED: the Regrid token expired ${when} (${-daysLeft} days ago).`);
  process.exit(1);
}
if (daysLeft <= WARN_DAYS) {
  console.warn(`WARNING: the Regrid token expires ${when} (${daysLeft} days left).`);
} else {
  console.log(`OK: the Regrid token expires ${when} (${daysLeft} days left).`);
}
