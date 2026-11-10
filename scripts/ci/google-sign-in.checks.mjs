import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  checkAuthHandler, checkAuthIframe, checkDns, checkFirebaseInit, checkOAuthRedirect, decodeAuthError,
  oauthProbeUrl, productionAuthDomain, productionProjectId, productionWebClientId,
  signInConfig, verifyGoogleSignIn, withRetries,
} from "./google-sign-in.mjs";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
// The first 152 characters of the authError Google returned for an unregistered
// redirect URI on 2026-10-16.
const redirectMismatch =
  "ChVyZWRpcmVjdF91cmlfbWlzbWF0Y2gSsAEKWW91IGNhbid0IHNpZ24gaW4gdG8gdGhpcyBhcHAgYmVjYXVzZSBp" +
  "dCBkb2Vzbid0IGNvbXBseSB3aXRoIEdvb2dsZSdzIE9BdXRoIDIuMCBwb2xpY3ku";
const signInPage = "https://accounts.google.com/v3/signin/identifier?client_id=x&o2v=2";
const errorPage = `https://accounts.google.com/signin/oauth/error?authError=${redirectMismatch}&flowName=GeneralOAuthFlow`;

function fakeFetch(routes) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    const route = routes(url, calls.length);
    if (route instanceof Error) throw route;
    const { status = 200, body = null, location, headers = {} } = route;
    return new Response(body, { status, headers: location ? { ...headers, location } : headers });
  };
  return { calls, fetchImpl };
}

const initJson = JSON.stringify({ apiKey: "AIza-test", projectId: productionProjectId });
const healthy = (url) => {
  if (url.startsWith("https://accounts.google.com/")) return { status: 302, location: signInPage };
  if (url.endsWith("/__/firebase/init.json")) return { body: initJson };
  return { body: "<!doctype html>" };
};

test("defaults follow the app's authDomain and the production build env", () => {
  const firebase = read("lib/firebase.ts");
  assert.equal(firebase.match(/authDomain:\s*process\.env\.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN\?\.trim\(\)\s*\|\|\s*"([^"]+)"/)?.[1], productionAuthDomain);
  assert.equal(firebase.match(/projectId:\s*process\.env\.NEXT_PUBLIC_FIREBASE_PROJECT_ID\?\.trim\(\)\s*\|\|\s*"([^"]+)"/)?.[1], productionProjectId);
  assert.equal(read(".github/workflows/ci.yml").match(/NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="([^"]+)"/)?.[1], productionAuthDomain);
  assert.match(read(".github/workflows/signup-canary.yml"), /run: npm run smoke:google-sign-in/);
  assert.equal(JSON.parse(read("package.json")).scripts["smoke:google-sign-in"], "node scripts/ci/google-sign-in.mjs");

  assert.deepEqual(signInConfig({}), {
    authDomain: productionAuthDomain, projectId: productionProjectId, clientId: productionWebClientId,
  });
  assert.equal(signInConfig({ NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: " auth.example.test \n" }).authDomain, "auth.example.test");
  assert.throws(() => signInConfig({ NODE_TLS_REJECT_UNAUTHORIZED: "0" }), /disables TLS verification/);
});

test("DNS check fails on NXDOMAIN and empty answers", async () => {
  assert.match(
    await checkDns("auth.example.test", { resolveHost: async () => [{ address: "199.36.158.100" }] }),
    /resolves to 199\.36\.158\.100/,
  );
  const nxdomain = Object.assign(new Error("getaddrinfo ENOTFOUND"), { code: "ENOTFOUND" });
  await assert.rejects(checkDns("auth.example.test", { resolveHost: async () => { throw nxdomain; } }),
    /auth\.example\.test does not resolve \(NXDOMAIN\)/);
  await assert.rejects(checkDns("auth.example.test", { resolveHost: async () => [] }), /no addresses/);
});

test("hosted auth files must answer 200 themselves, not redirect", async () => {
  const { calls, fetchImpl } = fakeFetch(healthy);
  assert.match(await checkAuthHandler("auth.example.test", { fetchImpl }), /handler answered 200/);
  assert.match(await checkFirebaseInit("auth.example.test", productionProjectId, { fetchImpl }), /init\.json answered 200/);
  assert.deepEqual(calls.map(({ url }) => url), [
    "https://auth.example.test/__/auth/handler",
    "https://auth.example.test/__/firebase/init.json",
  ]);
  assert.ok(calls.every(({ init }) => init.redirect === "manual" && init.signal));

  // proxy.ts 301s unknown paths on the auth host to the apex.
  const redirected = fakeFetch(() => ({ status: 301, location: "https://lotfoundry.net/" }));
  await assert.rejects(checkAuthHandler("auth.example.test", redirected), /answered 301, expected 200/);
  await assert.rejects(checkFirebaseInit("auth.example.test", productionProjectId, redirected), /answered 301/);
  const missing = fakeFetch(() => ({ status: 404 }));
  await assert.rejects(checkAuthHandler("auth.example.test", missing), /answered 404/);
});

test("the auth helper iframe must answer 200 without a framing rule", async () => {
  const { calls, fetchImpl } = fakeFetch(healthy);
  assert.match(await checkAuthIframe("auth.example.test", { fetchImpl }), /iframe answered 200 and can be framed/);
  assert.equal(calls[0].url, "https://auth.example.test/__/auth/iframe");

  await assert.rejects(
    checkAuthIframe("auth.example.test", fakeFetch(() => ({ headers: { "x-frame-options": "DENY" } }))),
    /sends X-Frame-Options: DENY/,
  );
  await assert.rejects(
    checkAuthIframe("auth.example.test",
      fakeFetch(() => ({ headers: { "content-security-policy": "default-src 'self'; frame-ancestors 'none'" } }))),
    /sends frame-ancestors 'none'/,
  );
  await assert.rejects(checkAuthIframe("auth.example.test", fakeFetch(() => ({ status: 404 }))), /answered 404/);
});

test("init.json must be this project's Firebase config", async () => {
  const html = fakeFetch(() => ({ body: "<!doctype html>" }));
  await assert.rejects(checkFirebaseInit("auth.example.test", productionProjectId, html), /projectId: none/);
  const other = fakeFetch(() => ({ body: JSON.stringify({ apiKey: "AIza-test", projectId: "other" }) }));
  await assert.rejects(checkFirebaseInit("auth.example.test", productionProjectId, other), /projectId: other/);
});

test("connection and certificate failures name the URL and cause", async () => {
  const tls = new TypeError("fetch failed", { cause: Object.assign(new Error("certificate has expired"), { code: "CERT_HAS_EXPIRED" }) });
  const { fetchImpl } = fakeFetch(() => tls);
  await assert.rejects(checkAuthHandler("auth.example.test", { fetchImpl }),
    /GET https:\/\/auth\.example\.test\/__\/auth\/handler failed: CERT_HAS_EXPIRED/);
  await assert.rejects(checkOAuthRedirect("auth.example.test", "client.test", { fetchImpl }),
    /GET https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth failed: CERT_HAS_EXPIRED/);
});

test("authError decodes to Google's OAuth error code", () => {
  assert.equal(decodeAuthError(redirectMismatch), "redirect_uri_mismatch");
  // "+" in an unescaped query value comes back from URLSearchParams as a space.
  const encoded = "Cg5pbnZhbGlkX2NsaWVudBID++++";
  assert.equal(decodeAuthError(encoded), "invalid_client");
  assert.equal(decodeAuthError(encoded.replaceAll("+", " ")), "invalid_client");
  assert.equal(decodeAuthError(Buffer.from("xx deleted_client xx").toString("base64")), "deleted_client");
  assert.equal(decodeAuthError(""), "unrecognized error");
});

test("OAuth probe asks Google about the auth handler redirect without following it", async () => {
  const { calls, fetchImpl } = fakeFetch(healthy);
  assert.match(await checkOAuthRedirect("auth.example.test", "client.test", { fetchImpl }),
    /Google accepts https:\/\/auth\.example\.test\/__\/auth\/handler \(redirects to accounts\.google\.com\/v3\/signin\/identifier\)/);
  assert.equal(calls[0].url, oauthProbeUrl("auth.example.test", "client.test"));
  assert.equal(calls[0].init.redirect, "manual");
  const params = new URL(calls[0].url).searchParams;
  assert.equal(params.get("client_id"), "client.test");
  assert.equal(params.get("redirect_uri"), "https://auth.example.test/__/auth/handler");
  assert.equal(params.get("response_type"), "code");
  assert.equal(params.get("scope"), "openid email profile");
});

test("OAuth probe fails on authError, error pages, and non-redirects", async () => {
  await assert.rejects(
    checkOAuthRedirect("auth.example.test", "client.test", fakeFetch(() => ({ status: 302, location: errorPage }))),
    /Google rejects https:\/\/auth\.example\.test\/__\/auth\/handler for client client\.test: redirect_uri_mismatch/,
  );
  await assert.rejects(
    checkOAuthRedirect("auth.example.test", "client.test",
      fakeFetch(() => ({ status: 302, location: "/signin/oauth/error/v2?flowName=x" }))),
    /redirected to its error page: https:\/\/accounts\.google\.com\/signin\/oauth\/error\/v2/,
  );
  await assert.rejects(
    checkOAuthRedirect("auth.example.test", "client.test", fakeFetch(() => ({ status: 400, body: "Error 400" }))),
    /answered 400 without a redirect/,
  );
});

test("retries absorb one transient answer but not a broken setup", async () => {
  const sleeps = [];
  const sleep = async (ms) => { sleeps.push(ms); };
  let calls = 0;
  const flaky = async () => {
    calls += 1;
    if (calls === 1) throw new Error("Google OAuth answered 503 without a redirect");
    return "ok";
  };
  assert.equal(await withRetries(flaky, { attempts: 3, delayMs: 7, sleep }), "ok");
  assert.equal(calls, 2);
  assert.deepEqual(sleeps, [7]);

  sleeps.length = 0;
  calls = 0;
  const broken = async () => { calls += 1; throw new Error("redirect_uri_mismatch"); };
  await assert.rejects(withRetries(broken, { attempts: 3, delayMs: 7, sleep }),
    /redirect_uri_mismatch \(failed 3 of 3 attempts\)/);
  assert.equal(calls, 3);
  assert.deepEqual(sleeps, [7, 7]);
});

test("every check runs and reports, even after one fails", async () => {
  const config = { authDomain: "auth.example.test", projectId: productionProjectId, clientId: "client.test" };
  const retry = { attempts: 2, sleep: async () => {} };
  const nxdomain = Object.assign(new Error("ENOTFOUND"), { code: "ENOTFOUND" });

  const passing = await verifyGoogleSignIn(config, {
    resolveHost: async () => [{ address: "199.36.158.100" }], fetchImpl: fakeFetch(healthy).fetchImpl, retry,
  });
  assert.deepEqual(passing.map(({ ok }) => ok), [true, true, true, true, true]);

  // The 2026-10-15 outage: no DNS record, so the hosted files are unreachable,
  // and the redirect URI was never registered with Google.
  const outage = await verifyGoogleSignIn(config, {
    resolveHost: async () => { throw nxdomain; },
    fetchImpl: fakeFetch((url) => url.startsWith("https://accounts.google.com/")
      ? { status: 302, location: errorPage }
      : new TypeError("fetch failed", { cause: nxdomain })).fetchImpl,
    retry,
  });
  assert.deepEqual(outage.map(({ ok }) => ok), [false, false, false, false, false]);
  assert.match(outage[0].message, /NXDOMAIN/);
  assert.match(outage[1].message, /handler failed: ENOTFOUND/);
  assert.match(outage[3].message, /redirect_uri_mismatch \(failed 2 of 2 attempts\)/);
});
