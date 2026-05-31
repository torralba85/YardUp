import { expect, test } from "@playwright/test";

test.describe("Feasibility Studio", () => {
  test("loads the studio with default metrics and scene", async ({ page }, testInfo) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/LotFoundry \| ADU Feasibility Studio/);

    const heading = page.getByRole("heading", { name: "Feasibility Studio", level: 2 });
    await expect(heading).toBeVisible();

    await expect(page.getByText("Build Cost Range")).toBeVisible();
    await expect(page.getByText("Monthly Rent")).toBeVisible();

    // Scene area or fallback must render
    const sceneSection = page.getByRole("region", { name: /Parcel massing scene/i });
    await expect(sceneSection).toBeVisible();

    await page.screenshot({
      path: testInfo.snapshotPath("default-screen.png"),
      fullPage: true,
    });
  });

  test("flags review needed when picking 1,000 sf on the compact preset", async ({
    page,
  }, testInfo) => {
    await page.goto("/");
    await page.getByLabel("Parcel Preset").selectOption("compact-lot");

    const sizeGroup = page.getByRole("group", { name: /ADU footprint size/i });
    await sizeGroup.getByRole("button", { name: "1,000 sf" }).click();

    await expect(
      page.getByRole("alert").filter({ hasText: /Review needed/i }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.snapshotPath("review-needed.png"),
      fullPage: true,
    });
  });

  test("updates rent estimate when switching to Market", async ({ page }) => {
    await page.goto("/");
    const rentGroup = page.getByRole("group", { name: /Rental estimate/i });
    await rentGroup.getByRole("button", { name: "Market" }).click();

    const monthlyRentCard = page.getByText("Monthly Rent").locator("..");
    await expect(monthlyRentCard).toContainText("$2,350");
  });

  test("downloads a summary text file", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Generate Concept Report/i }).click();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /Download/i }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.txt$/);
  });

  test("arrow keys move ADU without scrolling the page", async ({ page }) => {
    await page.goto("/");
    // Click outside any form element so the window keydown handler receives the event
    await page.locator("body").click({ position: { x: 10, y: 10 } });

    const scrollBefore = await page.evaluate(() => window.scrollY);
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("ArrowDown");
    }
    const scrollAfter = await page.evaluate(() => window.scrollY);
    expect(scrollAfter).toBe(scrollBefore);
  });

  test("hydrates state from a shared URL", async ({ page }) => {
    await page.goto(
      "/?parcel=compact-lot&size=1000&roof=gable&finish=board&rent=market&openings=0",
    );

    await expect(page.getByLabel("Parcel Preset")).toHaveValue("compact-lot");
    await expect(
      page.getByRole("alert").filter({ hasText: /Review needed/i }),
    ).toBeVisible();

    const monthlyRentCard = page.getByText("Monthly Rent").locator("..");
    await expect(monthlyRentCard).toContainText("$2,150");
  });
});
