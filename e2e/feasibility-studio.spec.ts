import { expect, test } from "@playwright/test";

test.describe("Public LotFoundry flows", () => {
  test("loads the landing page with the income snapshot proof", async ({ page }, testInfo) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/LotFoundry \| ADU Income Potential/);
    await expect(
      page.getByRole("heading", { name: /See what your lot could earn/i }),
    ).toBeVisible();
    await expect(page.getByText("ADU income snapshot", { exact: true })).toBeVisible();
    await expect(page.getByText("$2,350")).toBeVisible();
    await expect(page.getByRole("link", { name: /Estimate my lot/i }).first()).toHaveAttribute(
      "href",
      "/signup",
    );

    await page.screenshot({
      path: testInfo.snapshotPath("landing-page.png"),
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
});
