import { expect, test } from "@playwright/test";

const breakpoints = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "tablet-portrait-768", width: 768, height: 1024 },
  { name: "tablet-landscape-1024", width: 1024, height: 768 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-320", width: 320, height: 568 },
];

test.describe("Visual breakpoint coverage", () => {
  test.setTimeout(60_000);
  // Bound the compositor surface itself, not just the resulting PNG dimensions.
  test.use({ deviceScaleFactor: 1 });

  for (const bp of breakpoints) {
    test(`renders without clipped primary UI at ${bp.name}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/");

      await expect(page.getByRole("heading", { level: 1, name: "Explore an ADU on your lot in 3D." })).toBeVisible();
      // Always-rendered closing CTA heading — stable across hero variants.
      const heading = page.getByRole("heading", { name: /It starts with your address/i });
      await expect(heading).toBeVisible();
      await expect(page.getByRole("heading", { name: /Good questions.*Straight answers/i })).toBeVisible();

      // The certificate specimen (steps 04–05) must survive every breakpoint.
      await expect(
        page.getByRole("article", { name: "Sample feasibility report" }),
      ).toBeVisible();

      const widths = await page.evaluate(() => ({
        doc: document.documentElement.scrollWidth,
        win: window.innerWidth,
      }));
      expect(widths.doc).toBeLessThanOrEqual(widths.win + 1);

      // Hero search instrument is the primary CTA at every breakpoint
      // (the header link collapses to "Start" on small screens).
      await expect(page.getByRole("button", { name: /Explore my lot/i }).first()).toBeVisible();

      await page.screenshot({
        path: testInfo.outputPath(`${bp.name}.png`),
        fullPage: true,
        // Keep full-page captures bounded even with the phone project's 2.75 DPR.
        scale: "css",
      });
    });
  }
});
