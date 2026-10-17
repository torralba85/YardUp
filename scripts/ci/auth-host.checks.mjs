import assert from "node:assert/strict";
import test from "node:test";
import { verifyAuthHost } from "./verify-auth-host.mjs";

const host = "auth.lotfoundry.net";
const helper = (path) => `<script src="${path.split("/").pop()}.js"></script>`;

test("checks both Firebase helpers over HTTPS without following redirects", async () => {
  const paths = [];
  await verifyAuthHost(host, async (url, options) => {
    assert.equal(url.origin, `https://${host}`);
    assert.equal(options.redirect, "manual");
    assert.ok(options.signal instanceof AbortSignal);
    paths.push(url.pathname);
    return new Response(helper(url.pathname), { headers: { "content-type": "text/html" } });
  });
  assert.deepEqual(paths, ["/__/auth/handler", "/__/auth/iframe"]);
});

test("rejects a missing host, redirects, errors, and app-shell responses", async () => {
  await assert.rejects(verifyAuthHost(host, async () => { throw new Error("private network details"); }), /Could not reach/);
  for (const status of [301, 302, 307, 308, 404, 500]) {
    await assert.rejects(verifyAuthHost(host, async () => new Response("", { status })), new RegExp(`HTTP ${status}`));
  }
  await assert.rejects(verifyAuthHost(host, async () => new Response("<h1>LotFoundry</h1>", {
    headers: { "content-type": "text/html" },
  })), /Firebase auth helper/);
  await assert.rejects(verifyAuthHost(host, async () => new Response(helper("handler"), {
    headers: { "content-type": "text/plain" },
  })), /Firebase auth helper/);
});

test("a working handler cannot vouch for a broken iframe", async () => {
  await assert.rejects(verifyAuthHost(host, async (url) => new Response(
    url.pathname.endsWith("handler") ? helper(url.pathname) : "<h1>Not found</h1>",
    { headers: { "content-type": "text/html" } },
  )), /iframe.*Firebase auth helper/);
});

test("refuses URLs and credentials instead of interpreting them as hosts", async () => {
  for (const invalid of ["", "https://auth.lotfoundry.net", "user@auth.lotfoundry.net", "auth.lotfoundry.net/path"]) {
    await assert.rejects(verifyAuthHost(invalid, async () => assert.fail("must not fetch")), /hostname/);
  }
});
