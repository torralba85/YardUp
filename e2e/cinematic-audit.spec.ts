import { expect, test } from "@playwright/test";

test("cinematic model responds to motion and viewport changes", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const story = page.locator("#the-model");
  await expect(story).toHaveAttribute("data-pinned", "true");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(story).not.toHaveAttribute("data-pinned");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(story).toHaveAttribute("data-pinned", "true");
  await page.setViewportSize({ width: 390, height: 664 });
  await expect(story).not.toHaveAttribute("data-pinned");
});

test("decorative motion stops within five seconds", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const motion = await page.locator("#start img").evaluate((image) => {
    const style = getComputedStyle(image);
    return { duration: parseFloat(style.animationDuration), delay: parseFloat(style.animationDelay), count: style.animationIterationCount };
  });
  expect(motion.duration + motion.delay).toBeLessThanOrEqual(5);
  expect(motion.count).toBe("1");
});
