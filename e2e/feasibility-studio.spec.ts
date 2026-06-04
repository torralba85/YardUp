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

    await expect(page).toHaveTitle(/LotFoundry \| ADU Income Potential/);
    await expect(page.getByRole("heading", { name: /Know what your lot could earn/i })).toBeVisible();
    // Reduced-motion renders the static hero frame: the income snapshot proof.
    await expect(page.getByText("$2,350").first()).toBeVisible();
    await expect(page.getByText(/estimated monthly rent/i).first()).toBeVisible();
    // Always-rendered closing CTA heading (mode-independent).
    await expect(
      page.getByRole("heading", { name: /Find the ADU income potential/i }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Estimate my lot/i }).first()).toHaveAttribute(
      "href",
      "/signup",
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

  test("studio requires sign in and preserves the next route", async ({ page }) => {
    await page.goto("/studio");

    await expect(page).toHaveURL(/\/login\?next=\/studio$/);
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });

  test("builder dashboard requires sign in and preserves the next route", async ({ page }) => {
    await page.goto("/builder");

    await expect(page).toHaveURL(/\/login\?next=\/builder$/);
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });

  test("user can navigate to Permit Guide and view local rules", async ({ page }) => {
    await signUpUser(page);
    // Navigating via sidebar navigation button
    await page.getByRole("button", { name: /Permit Guide/i }).click();
    await expect(page.getByRole("heading", { name: /Seattle ADU Starter Guide/i })).toBeVisible();
    await expect(page.getByText(/Confirm lot size is at least 3,200 sf/i)).toBeVisible();
  });

  test("user can browse Inspiration Gallery and apply a template", async ({ page }) => {
    await signUpUser(page);
    // Navigating via sidebar navigation button
    await page.getByRole("button", { name: /Inspiration Gallery/i }).click();
    await expect(page.getByRole("heading", { name: /Inspiration Gallery/i })).toBeVisible();
    await expect(page.getByText(/Courtyard Studio with Clerestory Light/i)).toBeVisible();

    // Click Apply on the first inspiration card (Canyon Courtyard)
    const applyButton = page.getByRole("button", { name: /Apply to Studio/i }).first();
    await applyButton.click();

    // Assert that the page redirected back to the studio and updated the active ADU config
    await expect(page.getByRole("heading", { name: "Feasibility Studio", level: 2 }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Cedar/i })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: /Shed/i })).toHaveAttribute("aria-pressed", "true");
  });
});
