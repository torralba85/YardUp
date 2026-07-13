import { expect, test, type Page } from "@playwright/test";

async function skipMobileFirstRunUi(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("lf-wizard-seen", "1");
    localStorage.setItem("lf-coach-seen", "1");
  });
}

test.describe("Public LotFoundry flows", () => {
  test("loads the landing page with the blue hour survey hero", async ({ page }, testInfo) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/LotFoundry \| ADU Feasibility & Income Estimates/);
    await expect(
      page.getByRole("heading", { name: /Every backyard hides a second address/i }),
    ).toBeVisible();
    // The rent verdict plate leads the first viewport.
    await expect(
      page.getByRole("complementary", { name: /Projected rent verdict/i }),
    ).toBeVisible();
    // Always-rendered closing CTA heading (mode-independent).
    await expect(
      page.getByRole("heading", { name: /Know what to ask before you spend on plans/i }),
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

  test("studio is open to guests for the wizard funnel", async ({ page, viewport }) => {
    await page.goto("/studio");

    // Guests are no longer redirected — mobile gets the first-run wizard,
    // desktop gets the dashboard.
    await expect(page).toHaveURL(/\/studio/);
    if (viewport && viewport.width < 1024) {
      await expect(page.getByText(/could your backyard pay you rent/i)).toBeVisible();
    } else {
      await expect(page.getByRole("navigation", { name: "Studio steps" })).toBeVisible();
      await expect(page.getByRole("button", { name: /Feasibility & Rules/i })).toBeVisible();
    }
  });

  test("builder dashboard requires sign in and preserves the next route", async ({ page }) => {
    await page.goto("/builder");

    await expect(page).toHaveURL(/\/login\?next=\/builder$/);
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });

  test("guest can navigate to Permit Guide and view demo rules", async ({ page, viewport }) => {
    const mobile = !!viewport && viewport.width < 1024;
    // Mobile shows the first-run wizard on a fresh profile — skip it so the
    // test lands in the sheet studio directly.
    if (mobile) await skipMobileFirstRunUi(page);
    await page.goto("/studio");
    if (mobile) {
      // Mobile renders the permit guide inside the bottom sheet's sections —
      // expand to full snap (peek → half → full) to reach it.
      await page.getByRole("button", { name: /expand panel/i }).click();
      await page.getByRole("button", { name: /expand panel/i }).click();
      // Wait for the animation to complete
      await page.waitForTimeout(500);
    } else {
      // Navigating via sidebar navigation button
      await page.getByRole("button", { name: /Feasibility & Rules/i }).click();
    }
    await expect(page.getByRole("heading", { name: /Seattle ADU Starter Guide/i })).toBeVisible();
    await expect(page.getByText(/Confirm lot size is at least 3,200 sf/i)).toBeVisible();
  });

  test("guest can browse Inspiration Gallery and apply a demo template", async ({ page, viewport }) => {
    const mobile = !!viewport && viewport.width < 1024;
    if (mobile) await skipMobileFirstRunUi(page);
    await page.goto("/studio");
    if (mobile) {
      // Mobile renders the gallery inside the Design step's sheet sections.
      await page.locator("nav button").filter({ hasText: /^Design/ }).click();
      await expect(page.getByRole("dialog", { name: /Design step/i })).toBeVisible();
      // Step selection opens the sheet to half; expand once more to reach full.
      await page.getByRole("button", { name: /expand panel/i }).click();
      // Wait for the animation to complete
      await page.waitForTimeout(500);
    } else {
      // Navigating via sidebar navigation button
      await page.getByRole("button", { name: /Design/i }).click();
    }
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
});
