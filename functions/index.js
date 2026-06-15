const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const path = require("path");

// Stripe keys live in Secret Manager and are injected as process.env.* only in
// the function they are bound to. Without this binding `process.env.STRIPE_*` is
// undefined at runtime — even when functions/.env works locally — so checkout
// and the webhook silently 503. Set them with:
//   firebase functions:secrets:set STRIPE_SECRET_KEY
//   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");
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

// The /api/** rewrite (firebase.json) sends the Stripe checkout + webhook
// routes here, so the Stripe secrets are bound to this function only.
exports.api = onRequest(
  { ...fnOpts, secrets: [stripeSecretKey, stripeWebhookSecret] },
  async (req, res) => {
    await ready();
    return handle(req, res);
  },
);
