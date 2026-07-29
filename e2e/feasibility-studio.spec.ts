import { expect, test } from "@playwright/test";

test.describe("Public LotFoundry flows", () => {
  test("loads the landing page with the lot survey hero", async ({ page }, testInfo) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/LotFoundry \| See what your backyard can earn/);
    await expect(
      page.getByRole("heading", { name: /See what your backyard can earn/i }),
    ).toBeVisible();
    // The rent verdict plate leads the first viewport.
    await expect(
      page.getByRole("complementary", { name: /Projected rent verdict/i }),
    ).toBeVisible();
    // Always-rendered closing CTA heading (mode-independent).
    await expect(
      page.getByRole("heading", { name: /Check your address.*Get your numbers/i }),
    ).toBeVisible();
    // Survey-instrument search is the hero CTA.
    await expect(page.getByRole("button", { name: /Run feasibility/i })).toBeVisible();

    await page.screenshot({
      path: testInfo.outputPath("landing-page.png"),
      fullPage: true,
    });
  });

  test("signup exposes homeowner and builder account choices", async ({ page }) => {
    await page.goto("/signup");

    await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Homeowner/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Builder/i })).toBeVisible();
    await page.getByRole("button", { name: /Builder/i }).click();
    await expect(page.getByRole("button", { name: /Create account/i })).toBeVisible();
  });

  test("studio is open to guests", async ({ page, viewport }) => {
    await page.goto("/studio");

    // Guests are no longer redirected — mobile gets the five-reveal journey,
    // desktop gets the dashboard.
    await expect(page).toHaveURL(/\/studio/);
    if (viewport && viewport.width < 1024) {
      await expect(
        page.getByRole("heading", { name: /start with your address/i }),
      ).toBeVisible();
    } else {
      await expect(page.getByRole("navigation", { name: "Studio steps" })).toBeVisible();
      await expect(page.getByRole("button", { name: /Rules & Fit/i })).toBeVisible();
    }
  });

  test("builder dashboard requires sign in and preserves the next route", async ({ page }) => {
    await page.goto("/builder");

    await expect(page).toHaveURL(/\/login\?next=\/builder$/);
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });

  test("guest can navigate to Permit Guide and view demo rules", async ({ page, viewport }) => {
    // Desktop-only: the mobile journey surfaces permit caveats as the Check
    // reveal's verify items instead of the full permit guide panel (#130).
    test.skip(!viewport || viewport.width < 1024, "desktop-only");
    await page.goto("/studio");
    await page.getByRole("button", { name: /Rules & Fit/i }).click();
    await expect(page.getByRole("heading", { name: /Seattle ADU Starter Guide/i })).toBeVisible();
    await expect(page.getByText(/Confirm lot size is at least 3,200 sf/i)).toBeVisible();
  });

  test("guest can browse Inspiration Gallery and apply a demo template", async ({ page, viewport }) => {
    test.setTimeout(60_000);
    // Desktop-only: the mobile journey keeps Shape to broad size/style
    // choices; the gallery is not part of the default mobile path (#130).
    test.skip(!viewport || viewport.width < 1024, "desktop-only");
    await page.goto("/studio");
    // Navigating via sidebar navigation button
    await page.getByRole("button", { name: /Design/i }).click();
    await expect(page.getByRole("heading", { name: /Inspiration Gallery/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Courtyard Studio with Clerestory Light/i)).toBeVisible();

    // Click Apply on the first inspiration card (Canyon Courtyard)
    const applyButton = page.getByRole("button", { name: /Apply to Studio/i }).first();
    await applyButton.click();

    // The applied template updates the active ADU config in the studio.
    await expect(page.getByRole("heading", { name: "Feasibility Studio", level: 2 }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Cedar/i })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: /Shed/i })).toHaveAttribute("aria-pressed", "true");
  });

  test("back navigation steps through the journey instead of leaving the study", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "The five-reveal journey is the mobile layout only");

    await page.goto("/studio");
    await page.getByRole("button", { name: /Seattle/i }).click();
    await page.getByRole("button", { name: /Reveal my backyard/i }).click();
    await expect(page.getByRole("heading", { name: /could earn/i })).toBeVisible();

    await page.getByRole("button", { name: /Shape your ADU/i }).click();
    // ShapeStep's own <h1> is "Pick a direction." — the word "Shape" only
    // appears in the section's aria-label and the rail's step chip, neither
    // of which is heading-role, so assert on the actual heading text.
    await expect(page.getByRole("heading", { name: /Pick a direction/i })).toBeVisible();

    await page.goBack();

    // The study survives: we land on the previous reveal, still inside the app.
    await expect(page.getByRole("heading", { name: /could earn/i })).toBeVisible();
  });
});
