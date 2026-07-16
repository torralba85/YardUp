import { expect, test } from "@playwright/test";

test.describe("account and support surfaces", () => {
  test("settings page renders guest sign-in CTA", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: /account settings|settings/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
  });

  test("help and feedback are linked and usable", async ({ page }) => {
    await page.goto("/help");
    await expect(page.getByRole("heading", { name: /help/i })).toBeVisible();
    await page.goto("/feedback");
    await expect(page.getByRole("heading", { name: /feedback/i })).toBeVisible();
    await expect(page.getByLabel(/what happened, or what should we build/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /send feedback/i })).toBeVisible();
  });

  test("delete-account explains retention and offers sign-in", async ({ page }) => {
    await page.goto("/delete-account");
    await expect(page.getByRole("heading", { name: /delete your account/i })).toBeVisible();
    await expect(page.getByText(/what lotfoundry deletes/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
  });

  test("legal pages use Terms & Conditions labeling", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.getByRole("heading", { name: /terms & conditions/i })).toBeVisible();
    await page.goto("/privacy");
    await expect(page.getByText(/firebase hosting/i)).toBeVisible();
    await expect(page.getByText("OpenAI", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /delete account/i }).first()).toBeVisible();
  });
});
