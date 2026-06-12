import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const OUT = "preview-shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

// --- Mobile: wizard + bottom-sheet studio (390x844, Pixel-ish) ---
const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const mPage = await mobile.newPage();

await mPage.goto("http://localhost:3000/studio", { waitUntil: "networkidle" });
await mPage.waitForTimeout(800);
await mPage.screenshot({ path: `${OUT}/1-mobile-wizard.png` });

// Skip into the studio — coach marks show on a fresh profile.
await mPage.getByRole("button", { name: /skip — explore the demo lot/i }).click();
await mPage.waitForSelector('[data-testid="studio-sheet"]');
await mPage.waitForTimeout(2500); // let the WebGL scene settle
await mPage.screenshot({ path: `${OUT}/2-mobile-studio-peek-coachmarks.png` });

await mPage.getByRole("button", { name: /got it/i }).click();
await mPage.waitForTimeout(400);
await mPage.screenshot({ path: `${OUT}/3-mobile-studio-peek.png` });

// Expand: peek -> half
await mPage.getByRole("button", { name: /expand panel/i }).click();
await mPage.waitForTimeout(800);
await mPage.screenshot({ path: `${OUT}/4-mobile-studio-half.png` });

// Expand: half -> full
await mPage.getByRole("button", { name: /expand panel/i }).click();
await mPage.waitForTimeout(800);
await mPage.screenshot({ path: `${OUT}/5-mobile-studio-full.png` });

await mobile.close();

// --- Desktop: unchanged dashboard (1440x900) ---
const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const dPage = await desktop.newPage();
await dPage.goto("http://localhost:3000/studio", { waitUntil: "networkidle" });
await dPage.waitForTimeout(2500);
await dPage.screenshot({ path: `${OUT}/6-desktop-studio.png` });
await desktop.close();

await browser.close();
console.log("done");
