import { expect, test } from "@playwright/test";

test("cost stack pins for motion-allowed desktop and unpins for reduced motion or short screens", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  // The maquette section stays unpinned so the 3D cost stack owns the pinned choreography.
  await expect(page.locator("#the-model")).not.toHaveAttribute("data-pinned");
  const stack = page.locator("#numbers [data-layer]");
  await expect(stack).toHaveAttribute("data-pinned", "true");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(stack).not.toHaveAttribute("data-pinned");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(stack).toHaveAttribute("data-pinned", "true");
  await page.setViewportSize({ width: 390, height: 664 });
  await expect(stack).not.toHaveAttribute("data-pinned");
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
