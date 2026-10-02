import { expect, test } from "@playwright/test";
import { mockTestOwnerAuth } from "./fixtures/studio-auth";

const chalk = "rgb(245, 245, 240)";
const carbon = "rgb(22, 22, 22)";
const orange = "rgb(255, 91, 36)";

test.describe("Project-wide A LOT MORE contract", () => {
  test("Studio gives the task action one signal-orange fill", async ({ page, isMobile }, testInfo) => {
    test.skip(isMobile, "Desktop rail and context header; mobile has its own journey contract");
    await page.goto("/studio?parcel=oak-street");
    const save = page.getByRole("button", { name: "Save this property — free account", exact: true });
    const certificate = page.getByRole("button", { name: "View certificate", exact: true });
    const signIn = page.getByRole("complementary", { name: "Studio navigation" })
      .getByRole("button", { name: "Sign In", exact: true });
    await expect(save).toHaveCSS("background-color", chalk);
    await expect(save).toHaveCSS("color", carbon);
    await expect(save).toHaveCSS("border-color", "rgb(101, 101, 95)");
    await expect(signIn).toHaveCSS("color", chalk);
    await expect(signIn).not.toHaveCSS("background-color", orange);
    await expect(certificate).toHaveCSS("background-color", orange);
    await expect(certificate).toHaveCSS("color", carbon);
    await save.focus();
    await expect(save).toBeFocused();
    await expect(save).toHaveCSS("box-shadow", /rgb\(196, 55, 8\)/);
    await page.screenshot({ path: testInfo.outputPath("studio-color-hierarchy.png") });
  });

  test("landing home target remains usable on narrow screens", async ({ page }) => {
    await page.goto("/");
    const home = page.getByRole("link", { name: "LotFoundry home", exact: true });
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect((await home.boundingBox())?.height).toBeGreaterThanOrEqual(44);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  });

  test("mobile dark header has visible keyboard focus", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chromium", "mobile header only");
    await page.goto("/studio");
    const reset = page.getByRole("button", { name: "Reset scenario", exact: true });
    await expect(reset).toBeVisible();
    await reset.focus();
    await expect(reset).toHaveCSS("outline-color", chalk);
    await expect(reset).toHaveCSS("outline-width", "2px");
    await page.screenshot({ path: testInfo.outputPath("mobile-header-focus.png") });
  });

  test("owner entry presents a clearly illustrative preview without overflow", async ({ page }, testInfo) => {
    await mockTestOwnerAuth(page);
    await page.goto("/login?next=/studio");
    await page.getByLabel("Email", { exact: true }).fill("studio-owner@example.test");
    await page.getByLabel("Password", { exact: true }).fill("Browser-fixture-only-123!");
    await page.locator('button[type="submit"]').click();
    await expect(page.getByRole("heading", { name: "Start with your property." })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Concept illustration, not your property/)).toBeVisible();
    await expect(page.getByRole("img", { name: /Illustrative model/ })).toBeVisible();
    const home = page.getByRole("link", { name: "LotFoundry home", exact: true });
    expect((await home.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("owner-entry.png"), fullPage: true });
  });

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
