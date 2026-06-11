import { expect, test } from "@playwright/test";

test.describe("Landing poster hero", () => {
  test("shows the asset headline, address instrument, and a stable full-bleed video", async ({ page }) => {
    await page.goto("/");

    // Scope to the hero section — other sections repeat CTAs; we assert on
    // the poster hero specifically.
    const hero = page
      .locator("section")
      .filter({ hasText: /your backyard is an asset/i });

    await expect(
      hero.getByRole("heading", { name: /your backyard is an asset/i }),
    ).toBeVisible();

    // Survey-instrument address search.
    await expect(hero.getByLabel(/property address/i)).toBeVisible();
    await expect(hero.getByRole("button", { name: /run feasibility/i })).toBeVisible();

    // Bottom-docked instrument rail with engine-derived proof points.
    await expect(hero.getByText(/rent potential/i)).toBeVisible();
    await expect(hero.getByText(/payback estimate/i)).toBeVisible();

    const video = hero.locator("video");
    await expect(video).toHaveAttribute("poster", "/hero/hero-poster.jpg");
    const box = await video.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThan(540); // explicit min-height → no collapse
  });

  test("routes the typed address to the studio", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel(/property address/i).fill("456 Pine St, Denver, CO");
    await page.getByRole("button", { name: /run feasibility/i }).click();
    await expect(page).toHaveURL(/\/studio/);
  });

  test("poster asset is served", async ({ page }) => {
    const resp = await page.request.get("/hero/hero-poster.jpg");
    expect(resp.status()).toBe(200);
  });

  test("does not autoplay under reduced motion", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");
    const paused = await page.locator("video").first().evaluate((v: HTMLVideoElement) => v.paused);
    expect(paused).toBe(true);
    await context.close();
  });
});
