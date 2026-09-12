import { expect, test, type Page } from "@playwright/test";
import { mockTestOwnerAuth } from "./fixtures/studio-auth";

test.describe("native app Studio onboarding", () => {
  test.skip(({ viewport }) => !viewport || viewport.width >= 1024, "the native app is a phone surface");

  /** Stand in for the Android shell: the same flag the purchase-channel detector reads. */
  async function openInAndroidApp(page: Page) {
    await page.addInitScript(() => {
      Object.assign(window, { LotFoundryNative: { platform: "android" } });
    });
    await page.goto("/studio");
  }

  test("a demo city opens without an account, and back steps through onboarding", async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    await openInAndroidApp(page);
    await expect(page.getByRole("heading", { name: "A little more room for life." })).toBeVisible();
    await expect(page.getByTestId("mobile-journey")).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath("app-welcome.png"), fullPage: true });

    await page.getByRole("button", { name: /Portland, OR/ }).click();
    await expect(page.getByRole("heading", { name: "How the Studio works." })).toBeVisible();
    await expect(page.getByText("Start in Portland, OR")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("app-guide.png"), fullPage: true });

    await page.getByRole("button", { name: /Open the Studio/ }).click();
    await expect(page.getByTestId("mobile-journey")).toBeVisible({ timeout: 25_000 });
    await expect(page.getByRole("heading", { name: /your backyard could earn/i })).toBeVisible();
    await expect(page.getByText(/812 Linden Avenue/).first()).toBeVisible();
    expect(new URL(page.url()).searchParams.get("parcel")).toBe("corner-lot");

    await page.goBack();
    await expect(page.getByTestId("app-guide")).toBeVisible();
    await page.goBack();
    await expect(page.getByTestId("app-welcome")).toBeVisible();
  });

  test("my property requires sign-in, then the guide, then the address workspace", async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    await mockTestOwnerAuth(page);
    await openInAndroidApp(page);

    await page.getByRole("button", { name: /Explore my property/ }).click();
    await expect(page.getByRole("heading", { name: "Sign in to explore your property." })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("app-sign-in.png"), fullPage: true });

    const open = page.getByRole("button", { name: /Sign in or create account/ });
    await open.click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByTestId("app-sign-in")).toBeVisible();

    await open.click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Email", { exact: true }).fill("studio-owner@example.test");
    await dialog.getByLabel("Password", { exact: true }).fill("Browser-fixture-only-123!");
    await dialog.locator('button[type="submit"]').click();

    await expect(page.getByRole("heading", { name: "How the Studio works." })).toBeVisible({ timeout: 25_000 });
    await expect(page.getByText("Find your lot")).toBeVisible();
    await page.getByRole("button", { name: /Open the Studio/ }).click();
    await expect(page.getByRole("heading", { name: "Start with your property." })).toBeVisible();

    // Back from the workspace returns to the guide; the completed sign-in screen was replaced.
    await page.goBack();
    await expect(page.getByTestId("app-guide")).toBeVisible();
    await page.goBack();
    await expect(page.getByTestId("app-welcome")).toBeVisible();
  });

  test("welcome fits narrow phones with full-size touch targets", async ({ page }) => {
    await openInAndroidApp(page);
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 740 });
      await expect(page.getByTestId("app-welcome")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      for (const button of await page.getByTestId("app-welcome").getByRole("button").all()) {
        const box = await button.boundingBox();
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      }
    }
  });
});
