import { expect, test } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, ".auth/user.json");

const breakpoints = [
  { name: "desktop-1440", width: 1440, height: 900, statsVisible: true },
  { name: "tablet-portrait-768", width: 768, height: 1024, statsVisible: true },
  { name: "tablet-landscape-1024", width: 1024, height: 768, statsVisible: true },
  { name: "mobile-390", width: 390, height: 844, statsVisible: false },
  { name: "mobile-320", width: 320, height: 568, statsVisible: false },
];

test.describe("Visual breakpoint coverage", () => {
  for (const bp of breakpoints) {
    test(`renders without clipped primary UI at ${bp.name}`, async ({ browser }, testInfo) => {
      const context = await browser.newContext({
        viewport: { width: bp.width, height: bp.height },
        storageState: authFile,
      });
      const page = await context.newPage();
      await page.goto("/studio");

      const heading = page.getByRole("heading", { name: "Feasibility Studio", level: 2 });
      await expect(heading).toBeVisible();

      const widths = await page.evaluate(() => ({
        doc: document.documentElement.scrollWidth,
        win: window.innerWidth,
      }));
      expect(widths.doc).toBeLessThanOrEqual(widths.win + 1);

      // Income stats grid is hidden on mobile (< sm) and visible on sm+
      const incomeStat = page.getByText("Annual NOI");
      if (bp.statsVisible) {
        await expect(incomeStat).toBeVisible();
      } else {
        await expect(incomeStat).toBeHidden();
      }

      await page.screenshot({
        path: testInfo.snapshotPath(`${bp.name}.png`),
        fullPage: true,
      });

      await context.close();
    });
  }
});
