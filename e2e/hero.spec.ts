import { expect, test } from "@playwright/test";

test.describe("Blue Hour survey hero", () => {
  test("shows the second-address headline, address instrument, and dusk scene", async ({ page }) => {
    await page.goto("/");

    const hero = page.locator('section[aria-label="Blue hour lot survey"]');
    await expect(
      hero.getByRole("heading", { name: /every backyard hides a second address/i }),
    ).toBeVisible();
    await expect(hero.getByLabel(/property address/i)).toBeVisible();
    await expect(hero.getByRole("button", { name: /run feasibility/i })).toBeVisible();

    // The dusk aerial poster is always present (no-JS/reduced motion floor);
    // the Remotion composition draws its own copy on top, so match by alt.
    await expect(hero.getByRole("img", { name: /aerial view of a suburban lot/i })).toBeVisible();
    await expect(hero.locator("video")).toHaveCount(0);

    const box = await hero.locator(".sticky").boundingBox();
    expect(box?.height ?? 0).toBeGreaterThan(560);
  });

  test("mounts the scroll-scrubbed Remotion player when motion is allowed", async ({ page }) => {
    await page.goto("/");
    const hero = page.locator('section[aria-label="Blue hour lot survey"]');
    await expect(hero.getByTestId("blue-hour-player")).toBeVisible();
  });

  test("leads the first viewport with the projected-rent verdict plate", async ({ page }) => {
    await page.goto("/");
    const hero = page.locator('section[aria-label="Blue hour lot survey"]');
    const verdict = hero.getByRole("complementary", { name: /projected rent verdict/i });
    await expect(verdict).toBeAttached();
    await expect(verdict.getByText(/typical supported markets/i)).toBeAttached();

    // Anchored inside the first viewport.
    const box = await verdict.boundingBox();
    const height = page.viewportSize()?.height ?? 0;
    expect(box).not.toBeNull();
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(height + 2);
  });

  test("counts the rent verdict up as the survey scrubs to its end", async ({ page }) => {
    await page.goto("/");
    const hero = page.locator('section[aria-label="Blue hour lot survey"]');
    await hero.evaluate((element) => {
      const top = window.scrollY + element.getBoundingClientRect().top;
      const travel = element.clientHeight - window.innerHeight;
      window.scrollTo(0, top + travel * 0.98);
    });
    const verdict = hero.getByRole("complementary", { name: /projected rent verdict/i });
    await expect(verdict.getByText("$2,340")).toBeVisible();
    await expect(verdict.getByText(/feasible · estimate only/i)).toBeVisible();
  });

  test("routes the typed address to the studio without persisting it in the URL", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel(/property address/i).fill("456 Pine St, Denver, CO");
    await page.getByRole("button", { name: /run feasibility/i }).click();
    await expect(page).toHaveURL(/\/studio/);
    // Privacy rule: a guest's typed address must never land in the URL/history.
    expect(page.url()).not.toMatch(/456|Pine|Denver|[?&]q=/i);
  });

  test("keeps the still photograph and skips the player under reduced motion", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");
    const hero = page.locator('section[aria-label="Blue hour lot survey"]');
    await expect(hero.getByRole("img", { name: /aerial view of a suburban lot/i })).toBeVisible();
    await expect(hero.getByTestId("blue-hour-player")).toHaveCount(0);
    // No pin: the track collapses to a single viewport for reduced motion.
    const track = await hero.boundingBox();
    const viewport = page.viewportSize()?.height ?? 0;
    expect(track?.height ?? 0).toBeLessThanOrEqual(Math.max(viewport, 640) + 2);
    await context.close();
  });
});
