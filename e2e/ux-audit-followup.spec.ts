import { expect, test } from "@playwright/test";
import { mockTestOwnerAuth } from "./fixtures/studio-auth";

test("property entry supports skip navigation and a visible field focus", async ({ page }, testInfo) => {
  await mockTestOwnerAuth(page);
  await page.goto("/login?next=/studio");
  await page.getByLabel("Email", { exact: true }).fill("studio-owner@example.test");
  await page.getByLabel("Password", { exact: true }).fill("Browser-fixture-only-123!");
  await page.locator('button[type="submit"]').click();
  await expect(page.getByRole("heading", { name: "Start with your property." })).toBeVisible();
  const skip = page.getByRole("link", { name: "Skip to content" });
  await skip.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await page.keyboard.press("Tab");
  const field = page.getByRole("combobox", { name: "Search property address" });
  await expect(field).toBeFocused();
  await expect(field).toHaveCSS("border-color", "rgb(196, 55, 8)");
  await expect(field).toHaveCSS("box-shadow", /rgb\(196, 55, 8\).*2px/);

  await page.getByRole("link", { name: "LotFoundry home", exact: true }).click();
  await page.getByRole("link", { name: /^Just looking\? See a sample result.*San Diego/i }).click();
  await expect(page.getByRole("heading", { name: "Start with your property." })).toBeHidden();
  await expect(page.getByRole("button", { name: /^Reset (scenario|project)$/i })).toBeVisible();
  await expect(page).toHaveURL(/parcel=coyote-brush/);
  await page.screenshot({ path: testInfo.outputPath("signed-in-example.png") });
});

test("mobile journey labels and provenance remain readable at narrow widths", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "mobile journey");
  await page.goto("/studio?parcel=coyote-brush", { waitUntil: "domcontentloaded" });
  // The default scenario begins at Your lot; choose the demo to see the rent.
  await page.getByRole("button", { name: /See (?:a|the) San Diego example/i }).click();
  const rail = page.getByRole("navigation", { name: "Journey progress" });
  const confidence = page.getByTestId("earn-confidence");
  await expect(confidence).toBeVisible();
  for (const width of [320, 390, 640]) {
    await page.setViewportSize({ width, height: 844 });
    for (const button of await rail.locator("ol button").all()) {
      await expect(button).toHaveCSS("font-size", "12px");
      const box = await button.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
      const label = await button.getAttribute("aria-label");
      expect(await button.evaluate((el) => el.scrollWidth <= el.clientWidth), `${label} at ${width}px`).toBe(true);
    }
    await expect(confidence).toHaveCSS("font-size", "12px");
    await expect(confidence).toHaveCSS("text-transform", "none");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`earn-${width}.png`) });
  }
  await page.setViewportSize({ width: 320, height: 740 });
  await page.getByRole("button", { name: /shape your backyard home/i }).click();
  await expect(page.getByText("Projected rent / mo", { exact: true })).toHaveCSS("font-size", "12px");
  await expect(page.getByRole("button", { name: /check feasibility/i })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("support text stays readable on hover", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "hover-capable pointer");
  await page.goto("/help");
  const openStudio = page.getByRole("banner").getByRole("link", { name: "Check my lot", exact: true });
  await openStudio.hover();
  await expect(openStudio).toHaveCSS("color", "rgb(22, 22, 22)");
});
