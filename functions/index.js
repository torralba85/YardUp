const { onRequest } = require("firebase-functions/v2/https");
const next = require("next");
const path = require("path");

// Point Next.js at the standalone output built by `next build`
process.env.NEXT_DIST_DIR = path.resolve(__dirname, "../.next");

const app = next({
  dev: false,
  conf: {
    distDir: process.env.NEXT_DIST_DIR,
  },
});

const handle = app.getRequestHandler();

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
