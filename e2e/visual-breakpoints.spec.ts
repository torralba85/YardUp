import { expect, test } from "@playwright/test";

const breakpoints = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "tablet-portrait-768", width: 768, height: 1024 },
  { name: "tablet-landscape-1024", width: 1024, height: 768 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-320", width: 320, height: 568 },
];

test.describe("Visual breakpoint coverage", () => {
  for (const bp of breakpoints) {
    test(`renders without clipped primary UI at ${bp.name}`, async ({ browser }, testInfo) => {
      const context = await browser.newContext({
        viewport: { width: bp.width, height: bp.height },
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      await page.goto("/");

      // Always-rendered closing CTA heading — stable across hero variants.
      const heading = page.getByRole("heading", { name: /Find the ADU income potential/i });
      await expect(heading).toBeVisible();

      const widths = await page.evaluate(() => ({
        doc: document.documentElement.scrollWidth,
        win: window.innerWidth,
      }));
      expect(widths.doc).toBeLessThanOrEqual(widths.win + 1);

      await expect(page.getByRole("link", { name: /Estimate my lot/i }).first()).toBeVisible();

      await page.screenshot({
        path: testInfo.snapshotPath(`${bp.name}.png`),
        fullPage: true,
      });

      await context.close();
    });
  }
});
