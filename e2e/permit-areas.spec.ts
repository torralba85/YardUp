import { test, expect } from "@playwright/test";

test("neighborhood data is reachable, dated, and usable on this viewport", async ({ page }, testInfo) => {
  await page.goto("/adu/ca/san-diego/permits");
  const link = page.locator('table a[href*="/permits/"]').first();
  const name = await link.textContent();
  await link.click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`${name} ADU Permits`);
  await expect(page.getByText("These are issued permits", { exact: false })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://lotfoundry.net${new URL(page.url()).pathname}`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("permit-area.png"), fullPage: true });
  await page.getByRole("textbox", { name: /street address/i }).fill("123 Example St, San Diego, CA");
  await page.getByRole("button", { name: "Check my address" }).click();
  await expect(page).toHaveURL(/\/studio$/);
  expect(page.url()).not.toContain("Example");
});

test("unknown planning areas return 404", async ({ request }) => {
  const response = await request.get("/adu/ca/san-diego/permits/not-a-planning-area");
  expect(response.status()).toBe(404);
});
