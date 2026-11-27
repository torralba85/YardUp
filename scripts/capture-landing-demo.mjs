/** Capture actual, keyless Coyote Brush Court (San Diego) demo UI for the landing's product preview.
 * Run a local server, then: node scripts/capture-landing-demo.mjs http://localhost:4543
 * No user account, lookup, AI request, or synthetic app output is used.
 */
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const baseURL = process.argv[2] ?? "http://localhost:4543";
if (!["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)) {
  throw new Error("Capture requires a local demo server.");
}
const output = path.resolve("public/landing");
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  for (const [name, viewport] of [
    ["desktop", { width: 1440, height: 900 }],
    ["mobile", { width: 390, height: 844 }],
  ]) {
    const page = await browser.newPage({
      viewport,
      deviceScaleFactor: 2,
      reducedMotion: "reduce",
    });
    // Keep all external services off the capture path. The curated demo is local.
    await page.route("**/*", (route) => {
      const url = new URL(route.request().url());
      return url.origin === new URL(baseURL).origin
        ? route.continue()
        : route.abort();
    });
    await page.goto(`${baseURL}/studio?parcel=coyote-brush`);
    if (name === "mobile") {
      const reveal = page.getByRole("button", { name: /See the San Diego example|See a San Diego example|Reveal my backyard/i });
      if (await reveal.isVisible()) await reveal.click();
      await page.getByRole("button", { name: /Shape your backyard home/i }).click();
    } else {
      await page.getByRole("button", { name: /Design/i }).click();
    }
    const scene = page.getByTestId("scene-viewport");
    await scene.locator("canvas").waitFor({ state: "visible" });
    await page.evaluate(() => document.fonts.ready);
    // Let the real WebGL scene settle before capturing the actual controls/model.
    await page.waitForTimeout(2000);
    const buffer = await scene.screenshot();
    const file = path.join(output, `studio-demo-${name}.webp`);
    const meta = await sharp(buffer)
      .resize({
        width: name === "desktop" ? 1200 : 780,
        withoutEnlargement: true,
      })
      .webp({ quality: 88 })
      .toFile(file);
    console.log(
      JSON.stringify({
        name,
        width: meta.width,
        height: meta.height,
        bytes: meta.size,
      }),
    );
    await page.close();
  }
} finally {
  await browser.close();
}
