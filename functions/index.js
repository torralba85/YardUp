const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { onInit } = require("firebase-functions/core");
const path = require("path");
const { requestForNext } = require("./request-replay");

// Stripe keys live in Secret Manager and are injected as process.env.* only in
// the function they are bound to. Without this binding `process.env.STRIPE_*` is
// undefined at runtime — even when functions/.env works locally — so checkout
// and the webhook silently 503. Set them with:
//   firebase functions:secrets:set STRIPE_SECRET_KEY
//   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");
// Provider secrets use distinct binding names so Firebase can migrate legacy
// plaintext environment variables without a Cloud Run name collision. The
// handlers copy each value into the variable expected by the Next.js routes.
const googleMapsApiKey = defineSecret("GOOGLE_MAPS_API_KEY_SECRET");
const googlePlacesServerKey = defineSecret("GOOGLE_PLACES_SERVER_KEY_SECRET");
const regridApiKey = defineSecret("REGRID_API_KEY_SECRET");
const openAiApiKey = defineSecret("OPENAI_API_KEY_SECRET");

// Native store verification is optional until the App Store / Play Console
// credentials are provisioned. Platform-specific flags let Android and iOS ship
// independently; the legacy umbrella flag still enables both for compatibility.
// Keeping the bindings behind explicit flags prevents non-interactive CI deploys
// from prompting for secrets that do not exist yet, while still isolating them
// from unrelated API routes when enabled.
const nativeStoreVerificationEnabled =
  process.env.ENABLE_NATIVE_STORE_VERIFICATION === "true";
const appleStoreVerificationEnabled =
  nativeStoreVerificationEnabled ||
  process.env.ENABLE_APPLE_STORE_VERIFICATION === "true";
const googlePlayVerificationEnabled =
  nativeStoreVerificationEnabled ||
  process.env.ENABLE_GOOGLE_PLAY_VERIFICATION === "true";
const appleStoreSecretParams = appleStoreVerificationEnabled
  ? {
      appleBundleId: defineSecret("APPLE_BUNDLE_ID"),
      appleRootCaFingerprint256: defineSecret("APPLE_ROOT_CA_FINGERPRINT256"),
    }
  : null;
const googlePlaySecretParams = googlePlayVerificationEnabled
  ? {
      googlePlayPackageName: defineSecret("GOOGLE_PLAY_PACKAGE_NAME"),
      googlePlayServiceAccountJson: defineSecret("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON"),
    }
  : null;
const nativeStoreSecrets = [
  ...(appleStoreSecretParams ? Object.values(appleStoreSecretParams) : []),
  ...(googlePlaySecretParams ? Object.values(googlePlaySecretParams) : []),
];

// scripts/prepare-firebase.js copies the Next.js standalone build into
// functions/.next/standalone/. The compiled app (BUILD_ID, server/, manifests)
// lives at functions/.next/standalone/.next/, so point Next's `dir` there.
const APP_DIR = path.join(__dirname, ".next", "standalone");

// Loading Next.js takes longer than Firebase's default function-discovery
// timeout on some machines. Defer it with onInit so deploy discovery only has
// to register the function definitions, then prepare once per warm container.
let app;
let requestHandler;
let prepared;
async function ready() {
  if (!prepared) {
    // Resolved from functions/node_modules, which Firebase installs server-side
    // from functions/package.json at deploy time. Firebase strips bundled
    // node_modules on upload, including the standalone build's own copy.
    const next = require("next");
    app = next({ dev: false, dir: APP_DIR });
    requestHandler = app.getRequestHandler();
    prepared = app.prepare();
  }

  await prepared;
  return requestHandler;
}

onInit(ready);

const fnOpts = {
  memory: "1GiB",
  timeoutSeconds: 60,
  region: "us-central1",
  invoker: "public",
};

const aiFnOpts = {
  ...fnOpts,
  // Style-matched ADU concepts make a vision call, then an image-generation
  // call. Keep the platform timeout above the route's 90s provider timeout.
  timeoutSeconds: 120,
};

// One Next request handler backs all five exports. firebase.json routes
// /api/ai/** to `apiAi`, /api/stripe/** to `apiStripe`, /api/store/** to
// `apiStore`, the rest of /api/** to `api`, and everything else to `app`; all
// resolve to the same handler and differ only in which secrets are bound.
exports.app = onRequest(fnOpts, async (req, res) => {
  const handle = await ready();
  return handle(requestForNext(req), res);
});

exports.apiAi = onRequest(
  { ...aiFnOpts, secrets: [openAiApiKey] },
  async (req, res) => {
    process.env.OPENAI_API_KEY = openAiApiKey.value();
    const handle = await ready();
    return handle(requestForNext(req), res);
  },
);

// Non-payment API routes (parcel/geocode/suggest/aerial). Bind only the
// provider credentials used by these routes; no Stripe, OpenAI, or native-store
// secrets enter this process.
exports.api = onRequest(
  { ...fnOpts, secrets: [googleMapsApiKey, googlePlacesServerKey, regridApiKey] },
  async (req, res) => {
    process.env.GOOGLE_MAPS_API_KEY = googleMapsApiKey.value();
    process.env.GOOGLE_PLACES_SERVER_KEY = googlePlacesServerKey.value();
    process.env.REGRID_API_KEY = regridApiKey.value();
    const handle = await ready();
    return handle(requestForNext(req), res);
  },
);

// App Store and Google Play receipt verification. The function still deploys
// while native commerce is disabled; the route then returns the existing
// "not configured" response instead of exposing credentials or blocking CI.
exports.apiStore = onRequest(
  { ...fnOpts, secrets: nativeStoreSecrets },
  async (req, res) => {
    if (appleStoreSecretParams) {
      process.env.APPLE_BUNDLE_ID = appleStoreSecretParams.appleBundleId.value();
      process.env.APPLE_ROOT_CA_FINGERPRINT256 =
        appleStoreSecretParams.appleRootCaFingerprint256.value();
    }
    if (googlePlaySecretParams) {
      process.env.GOOGLE_PLAY_PACKAGE_NAME =
        googlePlaySecretParams.googlePlayPackageName.value();
      process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON =
        googlePlaySecretParams.googlePlayServiceAccountJson.value();
    }
    const handle = await ready();
    return handle(requestForNext(req), res);
  },
);

// Stripe checkout + webhook only. firebase.json routes /api/stripe/** here so
// the payment secrets are bound to this function alone (least privilege) and
// never reach the other API handlers.
exports.apiStripe = onRequest(
  { ...fnOpts, secrets: [stripeSecretKey, stripeWebhookSecret] },
  async (req, res) => {
    const handle = await ready();
    return handle(requestForNext(req), res);
  },
);
