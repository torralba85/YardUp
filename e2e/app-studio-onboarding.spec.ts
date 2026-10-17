import { expect, test, type Page } from "@playwright/test";
import { mockTestOwnerAuth } from "./fixtures/studio-auth";

test.describe("native app Studio onboarding", () => {
  test.skip(({ viewport }) => !viewport || viewport.width >= 1024, "the native app is a phone surface");
  test.beforeEach(async ({ page }) => {
    await mockTestOwnerAuth(page);
  });

  /** Stand in for the Android shell: the same flag the purchase-channel detector reads. */
  async function openInAndroidApp(page: Page) {
    await page.addInitScript(() => {
      Object.assign(window, { LotFoundryNative: { platform: "android" } });
    });
    await page.goto("/studio", { waitUntil: "domcontentloaded" });
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

    // A remount must resume the chosen city, not drop back to Welcome.
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByText("Start in Portland, OR")).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: /Open the Studio/ }).click();
    await expect(page.getByTestId("mobile-journey")).toBeVisible({ timeout: 25_000 });
    await expect(page.getByRole("heading", { name: /your backyard could earn/i })).toBeVisible();
    await expect(page.getByText(/812 Linden Avenue/).first()).toBeVisible();
    expect(new URL(page.url()).searchParams.get("parcel")).toBe("corner-lot");

    await page.goBack({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("app-guide")).toBeVisible();
    await page.goBack({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("app-welcome")).toBeVisible();
  });

  test("my property opens the guide and guest address workspace without sign-in", async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    await openInAndroidApp(page);

    await page.getByRole("button", { name: /Explore my property/ }).click();
    await expect(page.getByRole("heading", { name: "How the Studio works." })).toBeVisible({ timeout: 25_000 });
    await expect(page.getByText("Find your lot")).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: /Open the Studio/ }).click();
    await expect(page.getByRole("heading", { name: "Start with your address." })).toBeVisible();
    await expect(page.getByRole("searchbox", { name: "Search property address" })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("app-guest-address.png"), fullPage: true });

    // Back from the guest workspace returns through the guide to Welcome.
    await page.goBack({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("app-guide")).toBeVisible();
    await page.goBack({ waitUntil: "domcontentloaded" });
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
