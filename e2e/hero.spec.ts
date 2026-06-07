import { expect, test } from "@playwright/test";

test.describe("Landing hero video", () => {
  test("shows the headline, CTA, and a stable full-bleed video", async ({ page }) => {
    await page.goto("/");

    // Scope to the hero section — the page has several "Estimate my lot" CTAs
    // (header, hero, closing section); we assert on the hero's specifically.
    const hero = page
      .locator("section")
      .filter({ hasText: /estimate the adu income your lot could support/i });

    await expect(
      hero.getByRole("heading", { name: /estimate the adu income your lot could support/i }),
    ).toBeVisible();

    await expect(hero.getByRole("link", { name: /check my address/i })).toHaveAttribute(
      "href",
      "/studio",
    );

    const video = hero.locator("video");
    await expect(video).toHaveAttribute("poster", "/hero/hero-poster.jpg");
    const box = await video.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThan(540); // explicit min-height → no collapse
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
