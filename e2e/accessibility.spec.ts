import { expect, test } from "@playwright/test";

test.describe("Accessibility smoke", () => {
  test("tab order reaches the primary controls without trapping", async ({ page }) => {
    await page.goto("/");

    let activeTag: string | null = null;
    const tags: string[] = [];

    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      activeTag = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        return `${el.tagName}:${el.getAttribute("aria-label") ?? el.textContent?.trim().slice(0, 24) ?? ""}`;
      });
      if (activeTag) tags.push(activeTag);
    }

    expect(tags.length).toBeGreaterThan(0);
    const unique = new Set(tags);
    expect(unique.size).toBeGreaterThan(1);
  });

  test("does not produce horizontal overflow at 320px width", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 320, height: 568 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.goto("/");

    const widths = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      win: window.innerWidth,
    }));

    expect(widths.doc).toBeLessThanOrEqual(widths.win + 1);
    await context.close();
  });

  test("primary landing actions are keyboard reachable", async ({ page }) => {
    await page.goto("/");

    const focusLabels: string[] = [];
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press("Tab");
      const activeText = await page.evaluate(
        () => (document.activeElement as HTMLElement | null)?.textContent?.trim() ?? "",
      );
      if (activeText) focusLabels.push(activeText);
    }

    expect(focusLabels.some((label) => /^Check my lot$/i.test(label))).toBe(true);
  });
});
