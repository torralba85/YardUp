import { expect, test, type Page } from "@playwright/test";

async function signUpUser(page: Page) {
  const email = `test-user-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
  await page.goto("/signup");
  await page.fill("#displayName", "E2E Test User");
  await page.fill("#email", email);
  await page.fill("#password", "Password123!");
  await page.click("button[type='submit']");
  await page.waitForURL(/\/studio/);
}

test.describe("Public LotFoundry flows", () => {
  test("loads the landing page with the income snapshot proof", async ({ page }, testInfo) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/LotFoundry \| ADU Feasibility & Income Estimates/);
    await expect(page.getByRole("heading", { name: /Estimate the ADU income your lot could support/i })).toBeVisible();
    // Owner-path proof — the address → fit → income steps list.
    await expect(page.getByText(/Compare rent, cost, and payback/i).first()).toBeVisible();
    // Always-rendered closing CTA heading (mode-independent).
    await expect(
      page.getByRole("heading", { name: /Know what to ask before you spend on plans/i }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Check my address/i }).first()).toHaveAttribute(
      "href",
      "/studio",
    );

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
      await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
    }
  });

  test("builder dashboard requires sign in and preserves the next route", async ({ page }) => {
    await page.goto("/builder");

    await expect(page).toHaveURL(/\/login\?next=\/builder$/);
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });

  test("user can navigate to Permit Guide and view local rules", async ({ page, viewport }) => {
    const mobile = !!viewport && viewport.width < 1024;
    // Mobile shows the first-run wizard on a fresh profile — skip it so the
    // test lands in the sheet studio directly.
    if (mobile) await page.addInitScript(() => localStorage.setItem("lf-wizard-seen", "1"));
    await signUpUser(page);
    if (mobile) {
      // Mobile renders the permit guide inside the bottom sheet's sections —
      // expand to full snap (peek → half → full) to reach it.
      await page.getByRole("button", { name: /expand panel/i }).click();
      await page.getByRole("button", { name: /expand panel/i }).click();
    } else {
      // Navigating via sidebar navigation button
      await page.getByRole("button", { name: /Permit Guide/i }).click();
    }
    await expect(page.getByRole("heading", { name: /Seattle ADU Starter Guide/i })).toBeVisible();
    await expect(page.getByText(/Confirm lot size is at least 3,200 sf/i)).toBeVisible();
  });

  test("user can browse Inspiration Gallery and apply a template", async ({ page, viewport }) => {
    const mobile = !!viewport && viewport.width < 1024;
    if (mobile) await page.addInitScript(() => localStorage.setItem("lf-wizard-seen", "1"));
    await signUpUser(page);
    if (mobile) {
      // Mobile renders the gallery inside the bottom sheet's sections —
      // expand to full snap (peek → half → full) to reach it.
      await page.getByRole("button", { name: /expand panel/i }).click();
      await page.getByRole("button", { name: /expand panel/i }).click();
    } else {
      // Navigating via sidebar navigation button
      await page.getByRole("button", { name: /Inspiration Gallery/i }).click();
    }
    await expect(page.getByRole("heading", { name: /Inspiration Gallery/i })).toBeVisible();
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
