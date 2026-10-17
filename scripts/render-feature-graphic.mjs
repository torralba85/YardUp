/**
 * Render the Google Play feature graphic from its HTML source.
 *
 * Play requires a 1024x500 PNG or JPEG with no transparency for every store
 * listing; a listing cannot be submitted without one. The HTML source lives
 * beside the output so the graphic stays editable and reproducible rather than
 * being a binary nobody can regenerate.
 *
 * Usage: node scripts/render-feature-graphic.mjs
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const WIDTH = 1024;
const HEIGHT = 500;

const dir = resolve(import.meta.dirname, "../native/android/store-listing");
const source = resolve(dir, "feature-graphic.html");
const output = resolve(dir, "feature-graphic.png");
const { colors } = JSON.parse(readFileSync(resolve(dir, "../../../design/tokens.json"), "utf8"));
const html = readFileSync(source, "utf8");
for (const token of ["lot-chalk", "lot-ink", "lot-line", "lot-stone"]) {
  if (!html.includes(`--color-${token}: ${colors[token]}`)) {
    throw new Error(`Feature graphic token drift: ${token}`);
  }
}

/**
 * Playwright's bundled Chromium is not always downloaded (`npx playwright
 * install`). Fall back to a system Chrome so a fresh clone can still render.
 */
async function launch() {
  try {
    return await chromium.launch();
  } catch (error) {
    if (!/Executable doesn't exist/.test(String(error))) throw error;
    console.warn("Bundled Chromium missing; falling back to system Chrome.");
    return chromium.launch({ channel: "chrome" });
  }
}

const browser = await launch();
try {
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  });
  // The source pulls webfonts from Google Fonts; without them the wordmark
  // silently falls back to a system font. Do this before screenshotting so a
  // transient font outage can never overwrite the committed Play asset.
  await page.goto(pathToFileURL(source).href, { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    const requiredFonts = [
      { family: "Space Grotesk", weight: "500", text: "backyard" },
      { family: "Manrope", weight: "400", text: "ADU" },
    ];
    const missing = requiredFonts.filter(
      ({ family, weight, text }) =>
        !document.fonts.check(`${weight} 16px "${family}"`, text),
    );
    if (missing.length > 0) {
      throw new Error(
        `Required webfonts did not load: ${missing.map(({ family, weight }) => `${family} ${weight}`).join(", ")}`,
      );
    }
  });
  await page.screenshot({ path: output, type: "png" });
} finally {
  await browser.close();
}

const png = readFileSync(output);
const width = png.readUInt32BE(16);
const height = png.readUInt32BE(20);
if (width !== WIDTH || height !== HEIGHT) {
  throw new Error(`Expected ${WIDTH}x${HEIGHT}, rendered ${width}x${height}.`);
}
console.log(`Rendered ${output} (${width}x${height}).`);
