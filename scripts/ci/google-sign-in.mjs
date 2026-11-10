import { lookup } from "node:dns/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Same fallbacks as lib/firebase.ts; google-sign-in.checks.mjs fails if they drift.
export const productionAuthDomain = "auth.lotfoundry.net";
export const productionProjectId = "yardup-2026";
// Web OAuth client behind Firebase Auth's Google provider. Public identifier,
// not a credential: every Google sign-in redirect carries it.
export const productionWebClientId =
  "166268911022-rpe2h5uinifalummuhnorgs3kc3e81k2.apps.googleusercontent.com";

const attemptsPerCheck = 3;
const retryDelayMs = 5_000;
const requestTimeoutMs = 15_000;

export function signInConfig(env = process.env) {
  // Every check below depends on the certificate being valid, so a run that
  // switched TLS verification off would prove nothing.
  if (env.NODE_TLS_REJECT_UNAUTHORIZED === "0") {
    throw new Error("NODE_TLS_REJECT_UNAUTHORIZED=0 disables TLS verification; unset it.");
  }
  return {
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() || productionAuthDomain,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || productionProjectId,
    clientId: productionWebClientId,
  };
}

export async function checkDns(host, { resolveHost = (name) => lookup(name, { all: true }) } = {}) {
  let addresses;
  try {
    addresses = await resolveHost(host);
  } catch (error) {
    const reason = error?.code === "ENOTFOUND" ? "NXDOMAIN" : error?.code || error?.message;
    throw new Error(`${host} does not resolve (${reason})`);
  }
  if (!addresses?.length) throw new Error(`${host} resolved to no addresses`);
  return `${host} resolves to ${addresses.map(({ address }) => address).join(", ")}`;
}

async function get(url, fetchImpl) {
  try {
    // redirect: "manual" so a host that 301s to the apex can't pass as a 200.
    return await fetchImpl(url, { redirect: "manual", signal: AbortSignal.timeout(requestTimeoutMs) });
  } catch (error) {
    // fetch reports DNS, connection and certificate failures (e.g.
    // CERT_HAS_EXPIRED, ERR_TLS_CERT_ALTNAME_INVALID) on error.cause.
    const reason = error?.cause?.code || error?.cause?.message || error?.name || error?.message;
    throw new Error(`GET ${url.split("?")[0]} failed: ${reason}`);
  }
}

export async function checkAuthHandler(authDomain, { fetchImpl = fetch } = {}) {
  const url = `https://${authDomain}/__/auth/handler`;
  const response = await get(url, fetchImpl);
  if (response.status !== 200) throw new Error(`${url} answered ${response.status}, expected 200`);
  return `${url} answered 200`;
}

export async function checkFirebaseInit(authDomain, projectId, { fetchImpl = fetch } = {}) {
  const url = `https://${authDomain}/__/firebase/init.json`;
  const response = await get(url, fetchImpl);
  if (response.status !== 200) throw new Error(`${url} answered ${response.status}, expected 200`);
  // The auth handler page configures itself from this file.
  const body = await response.json().catch(() => null);
  if (!body?.apiKey || body.projectId !== projectId) {
    throw new Error(`${url} is not the ${projectId} Firebase config (projectId: ${body?.projectId ?? "none"})`);
  }
  return `${url} answered 200 for ${projectId}`;
}

export async function checkAuthIframe(authDomain, { fetchImpl = fetch } = {}) {
  const url = `https://${authDomain}/__/auth/iframe`;
  const response = await get(url, fetchImpl);
  if (response.status !== 200) throw new Error(`${url} answered ${response.status}, expected 200`);
  // The app loads this page in a hidden frame for every Google sign-in, so a
  // framing header here breaks sign-in while the handler still answers 200.
  const frameOptions = response.headers.get("x-frame-options");
  if (frameOptions) throw new Error(`${url} sends X-Frame-Options: ${frameOptions}, so the app cannot frame it`);
  const frameAncestors = response.headers.get("content-security-policy")?.match(/frame-ancestors[^;]*/)?.[0];
  if (frameAncestors) throw new Error(`${url} sends ${frameAncestors}, so the app may not be able to frame it`);
  return `${url} answered 200 and can be framed`;
}

// Google's authError is a base64 protobuf whose first field is the OAuth error
// code, e.g. "redirect_uri_mismatch".
export function decodeAuthError(value) {
  const bytes = Buffer.from(value.replace(/ /g, "+"), "base64");
  if (bytes[0] === 0x0a && bytes[1] < 0x80) {
    const code = bytes.subarray(2, 2 + bytes[1]).toString("utf8");
    if (/^[a-z_]+$/.test(code)) return code;
  }
  return bytes.toString("latin1").match(/[a-z]+(?:_[a-z]+)+/)?.[0] ?? "unrecognized error";
}

export function oauthProbeUrl(authDomain, clientId) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", `https://${authDomain}/__/auth/handler`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  return url.href;
}

export async function checkOAuthRedirect(authDomain, clientId, { fetchImpl = fetch } = {}) {
  const redirectUri = `https://${authDomain}/__/auth/handler`;
  const response = await get(oauthProbeUrl(authDomain, clientId), fetchImpl);
  const location = response.headers.get("location");
  if (response.status < 300 || response.status >= 400 || !location) {
    throw new Error(`Google OAuth answered ${response.status} without a redirect`);
  }
  const target = new URL(location, "https://accounts.google.com");
  const authError = target.searchParams.get("authError");
  if (authError !== null) {
    throw new Error(`Google rejects ${redirectUri} for client ${clientId}: ${decodeAuthError(authError)}`);
  }
  if (target.pathname.includes("/oauth/error")) {
    throw new Error(`Google OAuth redirected to its error page: ${target.origin}${target.pathname}`);
  }
  return `Google accepts ${redirectUri} (redirects to ${target.host}${target.pathname})`;
}

// One transient answer (a 5xx, a dropped connection, a lagging DNS resolver)
// must not fail the canary; a broken setup fails every attempt.
export async function withRetries(check, {
  attempts = attemptsPerCheck,
  delayMs = retryDelayMs,
  sleep = (ms) => new Promise((done) => setTimeout(done, ms)),
} = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await check();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(delayMs);
    }
  }
  throw new Error(`${lastError?.message ?? lastError} (failed ${attempts} of ${attempts} attempts)`);
}

export async function verifyGoogleSignIn(config, { resolveHost, fetchImpl, retry = {} } = {}) {
  const checks = [
    () => checkDns(config.authDomain, { resolveHost }),
    () => checkAuthHandler(config.authDomain, { fetchImpl }),
    () => checkFirebaseInit(config.authDomain, config.projectId, { fetchImpl }),
    () => checkOAuthRedirect(config.authDomain, config.clientId, { fetchImpl }),
    () => checkAuthIframe(config.authDomain, { fetchImpl }),
  ];
  const results = [];
  for (const check of checks) {
    try {
      results.push({ ok: true, message: await withRetries(check, retry) });
    } catch (error) {
      results.push({ ok: false, message: error.message });
    }
  }
  return results;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const results = await verifyGoogleSignIn(signInConfig());
    for (const { ok, message } of results) (ok ? console.log : console.error)(`${ok ? "ok  " : "FAIL"} ${message}`);
    if (results.some(({ ok }) => !ok)) {
      console.error("Google sign-in is broken in production. See docs/cloudflare-dns.md (auth.lotfoundry.net).");
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
