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
    await expect(page.locator("#main-content").getByRole("link", { name: /sign in/i })).toBeVisible();
  });

  test("legal pages use Terms & Conditions labeling", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.getByRole("heading", { name: /terms & conditions/i })).toBeVisible();
    await page.goto("/privacy");
    await expect(page.getByText(/firebase hosting/i)).toBeVisible();
    await expect(page.getByText("OpenAI", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /delete account/i }).first()).toBeVisible();
  });

  test("account creation and social sign-in require affirmative legal consent", async ({ page }) => {
    await page.goto("/signup");
    // Apple stays hidden until NEXT_PUBLIC_APPLE_SIGN_IN=true (no Apple provider yet).
    await expect(page.getByRole("button", { name: "Apple" })).toHaveCount(0);
    const signupConsent = page.getByRole("checkbox", { name: /18 or older/i });
    await expect(page.getByRole("button", { name: "Create account" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Google" })).toBeDisabled();
    await signupConsent.check();
    await expect(page.getByRole("button", { name: "Create account" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Google" })).toBeEnabled();

    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Apple" })).toHaveCount(0);
    const loginConsent = page.getByRole("checkbox", { name: /18 or older/i });
    await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Google" })).toBeDisabled();
    await loginConsent.check();
    await expect(page.getByRole("button", { name: "Google" })).toBeEnabled();
  });
});
