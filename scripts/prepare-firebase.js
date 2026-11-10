/**
 * prepare-firebase.js
 *
 * After `next build`, this script:
 * 1. Copies the standalone output + static assets into `dist/`
 *    (the `public` dir Firebase Hosting serves from).
 * 2. Copies `.next/standalone` into `functions/.next/standalone`
 *    so the Cloud Function can serve API routes.
 *
 * Usage: node scripts/prepare-firebase.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.resolve(ROOT, "dist");
const STANDALONE = path.resolve(ROOT, ".next", "standalone");
const STATIC = path.resolve(ROOT, ".next", "static");
const PUBLIC = path.resolve(ROOT, "public");
const FUNC_NEXT = path.resolve(ROOT, "functions", ".next");
const FUNCTIONS_PACKAGE = path.resolve(ROOT, "functions", "package.json");

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    throw new Error(`Source directory not found: ${src}`);
  }
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true, dereference: true });
}

function findFirebaseAdminAliases() {
  const chunksDir = path.resolve(STANDALONE, ".next", "server", "chunks");
  if (!fs.existsSync(chunksDir)) return [];

  const aliases = new Set();
  for (const entry of fs.readdirSync(chunksDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".js")) continue;
    const source = fs.readFileSync(path.resolve(chunksDir, entry.name), "utf8");
    for (const match of source.matchAll(/firebase-admin-[a-z0-9]+/g)) {
      aliases.add(match[0]);
    }
  }
  return Array.from(aliases).sort();
}

function assertFunctionsDependencies() {
  const functionsPackage = JSON.parse(
    fs.readFileSync(FUNCTIONS_PACKAGE, "utf8"),
  );
  const dependencies = functionsPackage.dependencies ?? {};
  const missingAliases = findFirebaseAdminAliases().filter(
    (alias) => !dependencies[alias],
  );

  if (missingAliases.length > 0) {
    throw new Error(
      `functions/package.json is missing Next standalone external dependencies: ${missingAliases.join(", ")}`,
    );
  }
}

// 1. Build dist/ for Firebase Hosting.
console.log("[firebase] Building dist/ for Hosting...");
copyDir(STANDALONE, DIST);

// 2. Copy .next/static into BOTH locations under dist/. They serve different
//    consumers and neither one is redundant:
//
//    a) dist/.next/static  - keeps the standalone layout copied in step 1
//       intact, which is where `dist/server.js` looks when it is run directly
//       (local checks, emulator). firebase.json ignores `.next/**` and
//       `server.js`, so none of this reaches Hosting.
//    b) dist/_next/static  - the URL path browsers actually request. Firebase
//       Hosting serves a matching static file before it applies a rewrite, so
//       this is what keeps /_next/static/* on the CDN. This is the copy
//       production depends on.
//
//    Without (b) every hashed chunk fell through the `**` rewrite to the `app`
//    Cloud Function, which meant gzip instead of Hosting's brotli, a
//    `Vary: cookie` that fragmented the CDN cache per signed-in user, and a
//    billable function invocation per asset miss. The `max-age=31536000,
//    immutable` rule firebase.json declares for /_next/static/** also never
//    fired, because Hosting had no such files to apply it to.
//
//    Do not "simplify" this to a single copy. firebase.json's hosting `ignore`
//    list contains `.next/**`, so (a) is excluded from the Hosting upload by
//    design and cannot stand in for (b); and (b) is not where the standalone
//    server looks, so it cannot stand in for (a).
console.log("[firebase] Copying static assets...");
const distNext = path.resolve(DIST, ".next");
fs.mkdirSync(distNext, { recursive: true });
copyDir(STATIC, path.resolve(distNext, "static"));

const distUnderscoreNext = path.resolve(DIST, "_next");
fs.mkdirSync(distUnderscoreNext, { recursive: true });
copyDir(STATIC, path.resolve(distUnderscoreNext, "static"));

// 3. Copy public files into dist/ (root-level assets).
//    Exclude font sources (already bundled), internal directory docs, and
//    Remotion-only Kickstarter render assets (~158 MB) so they are not uploaded
//    to the Hosting CDN.
const EXCLUDED_PUBLIC_ENTRIES = new Set([
  "fonts",
  "README.md",
  "kickstarter",
  "kickstarter-assets",
]);
console.log("[firebase] Copying public/ files...");
fs.cpSync(PUBLIC, DIST, {
  recursive: true,
  dereference: true,
  filter: (src) => {
    const rel = path.relative(PUBLIC, src);
    if (!rel) return true;
    const topSegment = rel.split(path.sep)[0];
    if (EXCLUDED_PUBLIC_ENTRIES.has(topSegment)) return false;
    return true;
  },
});

// 3b. Materialize /robots.txt as a static file in dist/.
//
// Firebase Hosting does not route /robots.txt through the `**` -> `app`
// function rewrite. It answers with a bare 0-byte 404 before Next.js ever sees
// the request — verified against the Hosting URL, the Cloud Run URL, and the
// lotfoundry.net Host header, while /sitemap.xml and every page route resolve
// normally through the same rewrite. Writing the prerendered body into dist/
// lets Hosting serve it as a static file.
//
// The body is copied from the build output rather than hand-maintained, so
// app/robots.ts stays the single source of truth.
console.log("[firebase] Materializing robots.txt for Hosting...");
const ROBOTS_BODY = path.resolve(ROOT, ".next", "server", "app", "robots.txt.body");
if (!fs.existsSync(ROBOTS_BODY)) {
  throw new Error(
    `Expected prerendered robots body at ${ROBOTS_BODY}. If app/robots.ts was removed or is no longer statically prerendered, update this step — otherwise the deploy silently ships a 404 for /robots.txt.`,
  );
}
fs.copyFileSync(ROBOTS_BODY, path.resolve(DIST, "robots.txt"));

// 4. Prepare functions/.next/standalone for the Cloud Function.
console.log("[firebase] Preparing functions/.next/standalone...");
copyDir(STANDALONE, path.resolve(FUNC_NEXT, "standalone"));

// 5. Copy static assets into standalone/.next/static so the Cloud Function
//    can serve /_next/static/* for any requests it handles directly.
//    Firebase Hosting also serves them for cached/CDN hits.
console.log("[firebase] Copying static assets into standalone/.next/static...");
fs.cpSync(STATIC, path.resolve(FUNC_NEXT, "standalone", ".next", "static"), {
  recursive: true,
  dereference: true,
});

// Firebase strips bundled node_modules during Functions upload, but the
// Turbopack standalone build can reference aliased external packages.
// Ensure functions/package.json declares them before deploying a broken API.
console.log("[firebase] Validating Functions runtime dependencies...");
assertFunctionsDependencies();

console.log("[firebase] Done - dist/ and functions/.next/ are ready for deploy.");
