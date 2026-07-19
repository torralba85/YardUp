/**
 * Capture PWA manifest screenshots (phone narrow + tablet wide) from the
 * running dev server. Outputs land in public/screenshots/.
 *
 * Usage: node scripts/capture-store-screenshots.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const baseUrl = process.argv[2] ?? "http://localhost:3000";
const outDir = resolve(import.meta.dirname, "../public/screenshots");
mkdirSync(outDir, { recursive: true });

const shots = [
  // 540 CSS px @2x -> 1080x1920 physical: mobile layout, Play-friendly portrait.
  { name: "phone-studio", url: "/studio", width: 540, height: 960, scale: 2 },
  { name: "phone-home", url: "/", width: 540, height: 960, scale: 2 },
  // 1280 CSS px @1x -> 1280x800: desktop/tablet layout.
  { name: "tablet-studio", url: "/studio", width: 1280, height: 800, scale: 1 },
];

const browser = await chromium.launch();
try {
  for (const shot of shots) {
    const context = await browser.newContext({
      viewport: { width: shot.width, height: shot.height },
      deviceScaleFactor: shot.scale,
      isMobile: shot.scale > 1,
    });
    const page = await context.newPage();
    await page.goto(baseUrl + shot.url, { waitUntil: "networkidle" });
    // Let fonts, the hero, and any entry animation settle before capturing.
    await page.waitForTimeout(2500);
    // Strip the Next.js dev-mode indicator so it never appears in store art.
    await page.evaluate(() => document.querySelector("nextjs-portal")?.remove());
    const path = resolve(outDir, `${shot.name}.png`);
    await page.screenshot({ path });
    console.log(
      `captured ${shot.name}.png (${shot.width * shot.scale}x${shot.height * shot.scale})`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
