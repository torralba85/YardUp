// Builds the A LOT MORE UI kit wrapper that /design-sync converts. YardUp is
// an app, not a published package, so this writes the three things a package
// build would ship into .design-sync/kit/dist/ (gitignored):
//   1. type declarations for components/ui (the converter reads props here);
//   2. the compiled Tailwind stylesheet (kit.css -> dist/styles.css);
//   3. the brand fonts, Space Grotesk and Manrope (SIL OFL), fetched from
//      Google Fonts because the app loads them through next/font at build time.
// The JavaScript itself is bundled by the converter from src/index.ts.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const kitDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(kitDir, "../..");
const dist = join(kitDir, "dist");
const require = createRequire(join(repoRoot, "package.json"));
const posix = (p) => p.split(sep).join("/");

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

// -- 1. Declarations ---------------------------------------------------------
// tsc exits non-zero on any type error in the transitive import graph but still
// emits; the check below is on the files the kit actually needs.
try {
  execFileSync(process.execPath, [require.resolve("typescript/bin/tsc"), "-p", join(kitDir, "tsconfig.json")], {
    cwd: repoRoot,
    stdio: "pipe",
  });
} catch (error) {
  const out = String(error.stdout ?? "") + String(error.stderr ?? "");
  console.warn(`tsc reported errors (declarations still emitted):\n${out.split("\n").slice(0, 10).join("\n")}`);
}

const typesDir = join(dist, "types");
const modules = [...readFileSync(join(kitDir, "src/index.ts"), "utf8").matchAll(/from "\.\.\/\.\.\/\.\.\/(components\/ui\/[\w-]+)"/g)].map(
  (m) => m[1],
);
for (const mod of modules) {
  if (!existsSync(join(typesDir, `${mod}.d.ts`))) throw new Error(`tsc did not emit ${mod}.d.ts`);
}

// Declarations keep the app's "@/..." path aliases; point them at the emitted
// files so the converter's type checker can follow them.
function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
for (const file of walk(typesDir).filter((p) => p.endsWith(".d.ts"))) {
  const text = readFileSync(file, "utf8");
  const next = text.replace(/(from\s+|import\()(["'])@\/([^"']+)\2/g, (_, pre, quote, target) => {
    let rel = posix(relative(dirname(file), join(typesDir, target)));
    if (!rel.startsWith(".")) rel = `./${rel}`;
    return `${pre}${quote}${rel}${quote}`;
  });
  if (next !== text) writeFileSync(file, next);
}
writeFileSync(join(dist, "index.d.ts"), modules.map((mod) => `export * from "./types/${mod}";`).join("\n") + "\n");
console.log(`types: ${modules.length} modules -> dist/index.d.ts`);

// -- 2. Stylesheet ------------------------------------------------------------
const postcss = require("postcss");
const tailwind = require("@tailwindcss/postcss");
const cssFrom = join(kitDir, "kit.css");
const result = await postcss([tailwind({ base: repoRoot, optimize: false })]).process(readFileSync(cssFrom, "utf8"), {
  from: cssFrom,
  to: join(dist, "styles.css"),
});
writeFileSync(join(dist, "styles.css"), result.css);
console.log(`css: dist/styles.css (${(result.css.length / 1024).toFixed(0)} KB)`);

// -- 3. Fonts -----------------------------------------------------------------
// Latin and Latin Extended subsets of the variable fonts, at the weights the
// app requests from next/font.
const FONT_CSS_URL =
  "https://fonts.googleapis.com/css2?family=Manrope:wght@200..800&family=Space+Grotesk:wght@300..700&display=swap";
const KEEP_SUBSETS = new Set(["latin", "latin-ext"]);
const fontsDir = join(dist, "fonts");
mkdirSync(fontsDir, { recursive: true });
const fontCss = await (
  await fetch(FONT_CSS_URL, {
    // Google serves woff2 only to browsers it recognizes.
    headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36" },
  })
).text();
const faces = [];
for (const [, subset, block] of fontCss.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g)) {
  if (!KEEP_SUBSETS.has(subset)) continue;
  const family = /font-family:\s*'([^']+)'/.exec(block)?.[1];
  const url = /url\((https:[^)]+\.woff2)\)/.exec(block)?.[1];
  if (!family || !url) continue;
  const file = `${family.toLowerCase().replace(/\s+/g, "-")}-${subset}.woff2`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`font download failed (${response.status}): ${url}`);
  writeFileSync(join(fontsDir, file), Buffer.from(await response.arrayBuffer()));
  faces.push(`/* ${subset} */\n${block.replace(url, `./${file}`)}`);
}
if (faces.length < 4) throw new Error(`expected 4 font faces (2 families x 2 subsets), got ${faces.length}`);
writeFileSync(join(fontsDir, "fonts.css"), faces.join("\n") + "\n");
console.log(`fonts: ${faces.length} faces -> dist/fonts/fonts.css`);
