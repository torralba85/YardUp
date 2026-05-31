const { onRequest } = require("firebase-functions/v2/https");
const path = require("path");
// Resolved from functions/node_modules, which Firebase installs server-side
// from functions/package.json at deploy time. (Firebase strips all bundled
// node_modules on upload — including the standalone build's own copy — so the
// runtime deps must be declared in functions/package.json, not relied upon
// from .next/standalone/node_modules.)
const next = require("next");

// scripts/prepare-firebase.js copies the Next.js standalone build into
// functions/.next/standalone/. The compiled app (BUILD_ID, server/, manifests)
// lives at functions/.next/standalone/.next/, so point Next's `dir` there.
const APP_DIR = path.join(__dirname, ".next", "standalone");

const app = next({ dev: false, dir: APP_DIR });
const handle = app.getRequestHandler();

// Prepare the server once per warm container; reuse across invocations.
let prepared;
function ready() {
  if (!prepared) prepared = app.prepare();
  return prepared;
}

const fnOpts = {
  memory: "1GiB",
  timeoutSeconds: 60,
  region: "us-central1",
};

// One Next request handler backs both exports. firebase.json rewrites /api/**
// to `api` and everything else to `app`; both resolve to the same handler.
exports.app = onRequest(fnOpts, async (req, res) => {
  await ready();
  return handle(req, res);
});

exports.api = onRequest(fnOpts, async (req, res) => {
  await ready();
  return handle(req, res);
});
