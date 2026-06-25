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

const aiFnOpts = {
  ...fnOpts,
  // Style-matched ADU concepts make a vision call, then an image-generation
  // call. Keep the platform timeout above the route's 90s provider timeout.
  timeoutSeconds: 120,
};

// One Next request handler backs all four exports. firebase.json routes
// /api/ai/** to `apiAi`, /api/stripe/** to `apiStripe`, the rest of /api/** to
// `api`, and everything else to `app`; all resolve to the same handler and
// differ only in which secrets are bound to the process.
exports.app = onRequest(fnOpts, async (req, res) => {
  await ready();
  return handle(req, res);
});

exports.apiAi = onRequest(aiFnOpts, async (req, res) => {
  await ready();
  return handle(req, res);
});

// Non-payment API routes (parcel/geocode/suggest/aerial). No Stripe secrets in
// this process.
exports.api = onRequest(fnOpts, async (req, res) => {
  await ready();
  return handle(req, res);
});

// Stripe checkout + webhook only. firebase.json routes /api/stripe/** here so
// the payment secrets are bound to this function alone (least privilege) and
// never reach the other API handlers.
exports.apiStripe = onRequest(
  { ...fnOpts, secrets: [stripeSecretKey, stripeWebhookSecret] },
  async (req, res) => {
    await ready();
    return handle(req, res);
  },
);
