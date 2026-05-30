const { onRequest } = require("firebase-functions/v2/https");
const next = require("next");
const path = require("path");

// Next.js standalone output lives in functions/.next/ (copied by prepare-firebase.js)
process.env.NEXT_DIST_DIR = path.resolve(__dirname, ".next");

const app = next({
  dev: false,
  conf: {
    distDir: process.env.NEXT_DIST_DIR,
  },
});

const handle = app.getRequestHandler();

// Full Next.js app (SSR pages, static assets) — serves all routes except /api/**
exports.app = onRequest(
  {
    memory: "1GiB",
    timeoutSeconds: 60,
    region: "us-central1",
  },
  async (req, res) => {
    await app.prepare();
    return handle(req, res);
  },
);

// API-only function for routes that proxy to external services
exports.api = onRequest(
  {
    memory: "1GiB",
    timeoutSeconds: 60,
    region: "us-central1",
  },
  async (req, res) => {
    await app.prepare();
    return handle(req, res);
  },
);
