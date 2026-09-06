import { expect, test } from "@playwright/test";

const chalk = "rgb(245, 245, 240)";
const carbon = "rgb(22, 22, 22)";
const orange = "rgb(255, 91, 36)";

test.describe("Project-wide A LOT MORE contract", () => {
  for (const route of ["/login", "/signup", "/forgot-password", "/terms", "/settings"]) {
    test(`${route} uses the shared ground and fonts`, async ({ page }, testInfo) => {
      await page.goto(route);
      await expect(page.locator("body")).toHaveCSS("background-color", chalk);
      await expect(page.locator("body")).toHaveCSS("font-family", /manrope/i);
      await expect(page.getByRole("heading").first()).toBeVisible();
      await expect(page.getByRole("heading").first()).toHaveCSS("font-family", /space.*grotesk/i);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`${route.slice(1)}.png`), fullPage: true });
    });
  }

  for (const route of ["/login", "/signup"]) {
    test(`${route} keeps consent explicit and primary labels readable`, async ({ page }) => {
      await page.goto(route);
      const checkbox = page.getByRole("checkbox");
      await expect(checkbox).not.toBeChecked();
      await expect(checkbox).toHaveCSS("accent-color", carbon);
      await expect(checkbox).toHaveCSS("width", "20px");
      await expect(page.getByRole("button", { name: "Google", exact: true })).toBeDisabled();
      const primary = page.locator('button[type="submit"]');
      await expect(primary).toHaveCSS("background-color", orange);
      await expect(primary).toHaveCSS("color", carbon);
      await expect(primary).toHaveCSS("border-radius", "3px");
      // Local UI-only interaction: never submit credentials or accept real account terms.
      await checkbox.check();
      await expect(page.getByRole("button", { name: "Google", exact: true })).toBeEnabled();
      await checkbox.uncheck();
      await expect(page.getByRole("button", { name: "Google", exact: true })).toBeDisabled();
    });
  }

  test("Studio sign-in uses the same chalk form and returns focus", async ({ page }, testInfo) => {
    await page.goto("/studio");
    const signIn = page.getByRole("button", { name: /^sign in$/i }).filter({ visible: true }).first();
    await signIn.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("form input").first()).toHaveCSS("background-color", chalk);
    await expect(dialog.getByRole("checkbox")).toHaveCSS("accent-color", carbon);
    await page.screenshot({ path: testInfo.outputPath("auth-modal.png"), fullPage: false });
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(signIn).toBeFocused();
  });
});
