import { expect, test } from "@playwright/test";

test("web browsers retain builder signup at desktop and phone widths", async ({ page }) => {
  await page.goto("/signup?role=builder", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("radio", { name: /Builder/ })).toBeVisible();
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "Register here" })).toBeVisible();
});

test("Android navigation and signup expose only the homeowner flow", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    Object.assign(window, {
      LotFoundryNative: { platform: "android" },
      getDigitalGoodsService: async () => ({
        getDetails: async (ids: string[]) => ids.map((itemId) => ({
          itemId, price: { value: "28.99", currency: "USD" },
        })),
      }),
    });
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Register as a builder" })).toHaveCount(0);
  const menu = page.getByRole("button", { name: "Open menu" });
  if (await menu.isVisible()) {
    await menu.click();
    await expect(page.getByRole("link", { name: "Register as a builder" })).toHaveCount(0);
  }
  await page.goto("/signup?role=builder", { waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("Full name")).toBeVisible();
  await expect(page.getByRole("radio", { name: /Builder/ })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("app-homeowner-signup.png"), fullPage: true });
  await page.goto("/login?next=/builder", { waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Register here" })).toHaveCount(0);
});

test("a direct Android builder URL returns to homeowner Studio", async ({ page }) => {
  await page.addInitScript(() => {
    Object.assign(window, { LotFoundryNative: { platform: "android" } });
  });
  await page.goto("/builder", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/studio$/);
  await expect(page.getByRole("heading", { name: "A little more room for life." })).toBeVisible();
  await expect(page.getByText("Lead Credits", { exact: true })).toHaveCount(0);
});
