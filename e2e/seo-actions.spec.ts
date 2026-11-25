import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("lf-analytics-consent", JSON.stringify({
      decision: "denied", version: 3, decidedAt: new Date().toISOString(),
    }));
  });
});

test("public loan comparison handles zero interest and invalid input at narrow widths", async ({ page }, testInfo) => {
  await page.goto("/adu-cost-calculator#financing");
  const financing = page.locator("#financing");
  await page.getByLabel("Loan amount ($)", { exact: true }).fill("120000");
  await page.getByLabel("Annual interest rate (%)", { exact: true }).fill("0");
  await page.getByLabel("Loan term (years)", { exact: true }).fill("10");
  await expect(financing.locator("dl > div").filter({ hasText: "Monthly loan payment" }).locator("dd")).toHaveText("$1,000");
  await page.getByLabel("Loan term (years)", { exact: true }).fill("0");
  await expect(financing.getByText(/Enter a loan from/)).toBeVisible();
  await page.getByLabel("Loan term (years)", { exact: true }).fill("10");
  await financing.screenshot({ path: testInfo.outputPath("financing.png") });
  await page.setViewportSize({ width: 320, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await financing.screenshot({ path: testInfo.outputPath("financing-320.png") });
  for (const name of ["financing.png", "financing-320.png"]) {
    await testInfo.attach(name, { path: testInfo.outputPath(name), contentType: "image/png" });
  }
  await expect(page.getByRole("heading", { name: "Free address check" })).toBeAttached();
});

test("Studio planning guide explains limits and links to sample and methodology", async ({ page }, testInfo) => {
  await page.goto("/studio?parcel=coyote-brush");
  const overview = page.getByTestId("studio-overview");
  await overview.locator("summary").click();
  await expect(overview.getByRole("heading", { name: "When a result needs verification" })).toBeVisible();
  await expect(overview.getByText(/Certificate of Feasibility \(\$/)).toBeVisible();
  await expect(overview.getByRole("link", { name: "Sample certificate" })).toHaveAttribute("href", "/sample-certificate/san-diego");
  await expect(overview.getByRole("link", { name: "Cost and rent methodology" })).toHaveAttribute("href", "/adu/how-we-estimate");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("studio-overview.png"), fullPage: true });
  await testInfo.attach("studio-overview.png", {
    path: testInfo.outputPath("studio-overview.png"), contentType: "image/png",
  });
});
