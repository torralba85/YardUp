import { expect, test } from "@playwright/test";
import { mockTestOwnerAuth, signInTestOwner } from "./fixtures/studio-auth";

test("welcome explains the app, requires sign-in, and preserves a shared link", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const path = "/studio?parcel=corner-lot&size=800&roof=gable";
  await page.goto(path);
  await expect(page.getByRole("heading", { name: "A little more room for life." })).toBeVisible();
  await expect(page.getByRole("list", { name: "How LotFoundry works" })).toBeVisible();
  await expect(page.getByLabel("Search property address")).toHaveCount(0);
  await expect(page.getByTestId("mobile-journey")).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("welcome.png"), fullPage: true });
  const start = page.getByRole("button", { name: "Get started" });
  await start.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(start).toBeFocused();
  expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe(path);
  await expect(page.getByTestId("studio-welcome")).toBeVisible();

  await mockTestOwnerAuth(page);
  await start.click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Email", { exact: true }).fill("studio-owner@example.test");
  await dialog.getByLabel("Password", { exact: true }).fill("Browser-fixture-only-123!");
  await dialog.locator('button[type="submit"]').click();
  await expect(page.getByTestId("studio-welcome")).toHaveCount(0);
  await expect(page.getByText("812 Linden Avenue", { exact: true }).first()).toBeVisible({ timeout: 25_000 });
  expect(new URL(page.url()).searchParams.get("parcel")).toBe("corner-lot");
  expect(new URL(page.url()).searchParams.get("size")).toBe("800");
});

test("welcome fits narrow screens and keeps both entry actions reachable", async ({ page }) => {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/studio");
    await expect(page.getByRole("heading", { name: "A little more room for life." })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const name of ["Get started", "Sign in"]) {
      const button = page.getByRole("button", { name, exact: true });
      await button.scrollIntoViewIfNeeded();
      const box = await button.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
  }
});

test("an authenticated owner skips welcome and sign-out locks Studio on return", async ({ page }) => {
  test.setTimeout(60_000);
  await signInTestOwner(page);
  await expect(page.getByTestId("studio-welcome")).toHaveCount(0);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/studio");
  await expect(page.getByTestId("studio-welcome")).toBeVisible();
  await expect(page.getByLabel("Search property address")).toHaveCount(0);
});

test("a pending property survives welcome and resolves after sign-in", async ({ page }) => {
  test.setTimeout(60_000);
  await mockTestOwnerAuth(page);
  await page.route("**/api/geocode**", (route) => route.fulfill({ json: {
    lat: 47.6, lng: -122.3, formattedAddress: "123 Example St",
  } }));
  await page.route("**/api/parcel**", (route) => route.fulfill({ json: {
    address: "123 Example St", city: "Seattle, WA", lotArea: 6000, lotWidth: 60, lotLength: 100,
    existingHouseSqft: 1600, maxLotCoveragePercent: 40,
    setbacks: { front: 20, rear: 20, side: 5 }, zoning: "NR3", boundaryGeoJson: null,
    lat: 47.6, lng: -122.3, source: "county-gis", state: "WA", zip: "98101",
  } }));
  await page.goto("/studio");
  await page.evaluate(() => sessionStorage.setItem("lf:pending-address", "123 Example St"));
  await page.getByRole("button", { name: "Get started" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Email", { exact: true }).fill("studio-owner@example.test");
  await dialog.getByLabel("Password", { exact: true }).fill("Browser-fixture-only-123!");
  await dialog.locator('button[type="submit"]').click();
  await expect(page.getByText("123 Example St", { exact: true }).first()).toBeVisible({ timeout: 25_000 });
  expect(page.url()).not.toMatch(/Example|[?&]q=/i);
  expect(await page.evaluate(() => sessionStorage.getItem("lf:pending-address"))).toBeNull();
});
