import { expect, test } from "@playwright/test";

test.describe("mobile studio", () => {
  test.skip(({ viewport }) => !viewport || viewport.width >= 1024, "mobile-only suite");

  test("first-run wizard skips into the bottom-sheet studio", async ({ page }) => {
    await page.goto("/studio");

    await expect(page.getByText(/could your backyard pay you rent/i)).toBeVisible();

    await page.getByRole("button", { name: /skip — explore the demo lot/i }).click();

    await expect(page.getByTestId("studio-sheet")).toBeVisible();
    await expect(page.getByText("Rent potential / mo")).toBeVisible();
    // Coach marks appear once on a fresh profile. The inspector renders its
    // own role="note" hint, so filter to the coach mark.
    await expect(page.getByRole("note").filter({ hasText: /drag your adu/i })).toBeVisible();
    await page.getByRole("button", { name: /got it/i }).click();
  });

  test("expanding the sheet reveals controls and metrics react to size change", async ({ page }) => {
    // This flow drives several sequential vaul sheet snaps plus an accordion
    // open before asserting; it runs close to the default 30s budget and tips
    // over on slower CI runners. Triple the timeout to keep it stable.
    test.slow();
    await page.goto("/studio");
    await page.getByRole("button", { name: /skip — explore the demo lot/i }).click();
    const note = page.getByRole("note").filter({ hasText: /drag your adu/i });
    if (await note.isVisible()) {
      await page.getByRole("button", { name: /got it/i }).click();
    }

    // Monthly rent is scenario-driven and ignores footprint, so watch the
    // build-cost range — it scales with ADU size.
    const buildRange = page.getByTestId("studio-sheet").getByText(/\$\d+K-\$\d+K/).first();
    const buildBefore = await buildRange.textContent();

    // Two clicks: peek → half → full. Only the full snap scrolls the sheet
    // body, so the footprint presets stay unreachable at half.
    await page.getByRole("button", { name: /expand panel/i }).click();
    await page.getByRole("button", { name: /expand panel/i }).click();
    // The inspector is an accordion: open step 2 to reach the footprint
    // presets (buttons labeled like "800 sf"), which stay clipped otherwise.
    await page.getByRole("button", { name: "2 Design Your ADU" }).click();
    await page.getByRole("button", { name: /800 sf/i }).click();

    await expect(page.getByTestId("studio-sheet").getByText("800 ft²").first()).toBeVisible();
    await expect(buildRange).not.toHaveText(buildBefore ?? "");
  });

  test("wizard does not reappear after being skipped", async ({ page }) => {
    await page.goto("/studio");
    await page.getByRole("button", { name: /skip — explore the demo lot/i }).click();
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
