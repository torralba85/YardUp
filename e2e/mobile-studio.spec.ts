import { expect, test } from "@playwright/test";

test.describe("mobile studio", () => {
  test.skip(({ viewport }) => !viewport || viewport.width >= 1024, "mobile-only suite");

  test("first-run wizard skips into the bottom-sheet studio", async ({ page }) => {
    await page.goto("/studio");

    await expect(page.getByText(/could your backyard pay you rent/i)).toBeVisible();

    await page.getByRole("button", { name: /skip/i }).click();

    await expect(page.getByTestId("studio-sheet")).toBeVisible();
    await expect(page.locator('nav[aria-label="Studio progress"]')).toBeVisible();
    await expect(page.getByText("Rent potential / mo")).toBeVisible();
    // Coach marks appear once on a fresh profile. The inspector renders its
    // own role="note" hint, so filter to the coach mark.
    await expect(page.getByRole("note").filter({ hasText: /drag your adu/i })).toBeVisible();
    await page.getByRole("button", { name: /got it/i }).click();
  });

  test("design step controls update metrics from the mobile spine", async ({ page }) => {
    // This flow drives a vaul sheet snap plus an accordion before asserting; it
    // can run close to the default 30s budget on slower CI runners.
    test.slow();
    await page.goto("/studio");
    await page.getByRole("button", { name: /skip/i }).click();
    const note = page.getByRole("note").filter({ hasText: /drag your adu/i });
    if (await note.isVisible()) {
      await page.getByRole("button", { name: /got it/i }).click();
    }

    // Monthly rent is scenario-driven and ignores footprint, so watch the
    // build-cost range; it scales with ADU size.
    const buildRange = page.getByTestId("studio-sheet").getByText(/\$\d+K-\$\d+K/).first();
    const buildBefore = await buildRange.textContent();

    // P2 scopes mobile sheet content by the guided spine. Move to Design before
    // driving the inspector; Feasibility no longer dumps every panel at once.
    await page.locator('nav[aria-label="Studio progress"] button').filter({ hasText: "Design" }).click();
    await page.getByRole("button", { name: /expand panel/i }).click();

    // The inspector is an accordion: open step 2 to reach the footprint presets.
    await page.getByRole("button", { name: "2 Design Your ADU" }).click();
    await page.getByRole("button", { name: /800 sf/i }).click();

    await expect(page.getByTestId("studio-sheet").getByText(/800 ft/).first()).toBeVisible();
    await expect(buildRange).not.toHaveText(buildBefore ?? "");
  });

  test("wizard does not reappear after being skipped", async ({ page }) => {
    await page.goto("/studio");
    await page.getByRole("button", { name: /skip/i }).click();
    await expect(page.getByTestId("studio-sheet")).toBeVisible();

    await page.reload();
    await expect(page.getByTestId("studio-sheet")).toBeVisible();
    await expect(page.getByText(/could your backyard pay you rent/i)).not.toBeVisible();
  });
});

test.describe("desktop studio regression", () => {
  test.skip(({ viewport }) => !viewport || viewport.width < 1024, "desktop-only suite");

  test("desktop shows the guided spine and never the mobile wizard", async ({ page }) => {
    await page.goto("/studio");

    await expect(page.getByRole("navigation", { name: "Studio steps" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Feasibility & Rules" })).toBeVisible();
    await expect(page.getByText(/could your backyard pay you rent/i)).not.toBeVisible();
    await expect(page.getByTestId("studio-sheet")).not.toBeVisible();
  });
});
