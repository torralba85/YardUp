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

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    throw new Error(`Source directory not found: ${src}`);
  }
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true, dereference: true });
}

// 1. Build dist/ for Firebase Hosting
console.log("[firebase] Building dist/ for Hosting…");
copyDir(STANDALONE, DIST);

// 2. Copy .next/static into dist/_next/static (Next.js standalone expects this)
console.log("[firebase] Copying static assets…");
const distNext = path.resolve(DIST, ".next");
fs.mkdirSync(distNext, { recursive: true });
copyDir(STATIC, path.resolve(distNext, "static"));

// 3. Copy public files into dist/ (root-level assets)
console.log("[firebase] Copying public/ files…");
fs.cpSync(PUBLIC, DIST, {
  recursive: true,
  dereference: true,
  filter: (src) => {
    // Skip font source files — they are already bundled
    const rel = path.relative(PUBLIC, src);
    if (rel.startsWith("fonts")) return false;
    return true;
  },
});

// 4. Prepare functions/.next/standalone for the Cloud Function
console.log("[firebase] Preparing functions/.next/standalone…");
copyDir(STANDALONE, path.resolve(FUNC_NEXT, "standalone"));

// 5. Copy static assets into standalone/.next/static so the Cloud Function
//    can serve /_next/static/* for any requests it handles directly.
//    (Firebase Hosting also serves them for cached/CDN hits.)
console.log("[firebase] Copying static assets into standalone/.next/static…");
fs.cpSync(STATIC, path.resolve(FUNC_NEXT, "standalone", ".next", "static"), {
  recursive: true,
  dereference: true,
});

console.log("[firebase] Done — dist/ and functions/.next/ are ready for deploy.");
