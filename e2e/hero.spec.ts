import { expect, test } from "@playwright/test";

test.describe("Landing daylight deconstruction hero", () => {
  test("shows the cast headline, address instrument, and daylight scene", async ({ page }) => {
    await page.goto("/");

    const hero = page.locator('section[aria-label="ADU feasibility deconstruction"]');
    await expect(
      hero.getByRole("heading", { name: /your backyard, cast into an asset/i }),
    ).toBeVisible();
    await expect(hero.getByLabel(/property address/i)).toBeVisible();
    await expect(hero.getByRole("button", { name: /run feasibility/i })).toBeVisible();
    await expect(hero.getByRole("button", { name: /jump to zoning envelope/i })).toBeVisible();
    await expect(hero.locator('[data-scene-palette="daylight"]')).toBeVisible();
    await expect(hero.locator("video")).toHaveCount(0);

    const box = await hero.locator(".sticky").boundingBox();
    expect(box?.height ?? 0).toBeGreaterThan(540);
  });

  test("scrolls through the feasibility layers", async ({ page }) => {
    await page.goto("/");
    const hero = page.locator('section[aria-label="ADU feasibility deconstruction"]');
    await hero.evaluate((element) => {
      const top = window.scrollY + element.getBoundingClientRect().top;
      const travel = element.clientHeight - window.innerHeight;
      window.scrollTo(0, top + travel * 0.78);
    });

    await expect(
      hero.getByRole("button", { name: /jump to finished value/i }),
    ).toHaveAttribute("aria-current", "step");
  });

  test("routes the typed address to the studio", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel(/property address/i).fill("456 Pine St, Denver, CO");
    await page.getByRole("button", { name: /run feasibility/i }).click();
    await expect(page).toHaveURL(/\/studio/);
  });

  test("keeps the daylight scene under reduced motion", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator('[data-scene-palette="daylight"]')).toBeVisible();
    await expect(page.locator("video")).toHaveCount(0);
    await context.close();
  });
});
