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

test("public guides distinguish jurisdictions and link to official permit resources", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("navigation", { name: "Footer" });
  await expect(footer.getByRole("link", { name: "City of San Diego ADU rules" })).toHaveAttribute("href", "/adu/ca/san-diego");
  await expect(footer.getByRole("link", { name: "San Diego ADU permits by neighborhood" })).toHaveAttribute("href", "/adu/ca/san-diego/permits");
  const structuredData = page.locator('script[type="application/ld+json"]');
  expect((await structuredData.allTextContents()).join("\n")).toContain('"@type":"SoftwareApplication"');
  await page.goto("/adu/ca/san-diego-county");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Unincorporated San Diego County ADU Setbacks/);
  await page.getByRole("link", { name: "City of San Diego ADU handbook and ordinance" }).click();
  await expect(page.getByRole("heading", { name: "City of San Diego ADU handbook and ordinance" })).toBeVisible();
  const cityResources = page.getByRole("region", { name: "City of San Diego ADU handbook and ordinance" });
  await expect(cityResources.getByRole("link", { name: /Information Bulletin 400/ })).toHaveAttribute("href", /information-bulletins\/400$/);
  await expect(cityResources.getByRole("link", { name: "San Diego ADU permits by neighborhood" })).toHaveAttribute("href", "/adu/ca/san-diego/permits");
  await expect(page.getByRole("link", { name: "Unincorporated San Diego County ADU setbacks and rules" })).toHaveAttribute("href", "/adu/ca/san-diego-county");
  const cityStructuredData = (await structuredData.allTextContents()).join("\n");
  expect(cityStructuredData).not.toContain('"@type":"SoftwareApplication"');
  expect(cityStructuredData).toContain('"@type":"Article"');
  await page.goto("/adu/ca/la-mesa");
  const laMesaResources = page.getByRole("region", { name: "Official La Mesa ADU requirements" });
  await expect(laMesaResources.getByRole("link", { name: /Development Matrix/ })).toHaveAttribute("href", /DocumentCenter\/View\/26946$/);
  await expect(laMesaResources.getByRole("link", { name: "Permit steps" })).toHaveAttribute("href", "#adu-process");
});

test("cost pages show the sample certificate next to the free check", async ({ page }, testInfo) => {
  for (const [name, path] of [["calculator", "/adu-cost-calculator"], ["san-diego-cost", "/adu/ca/san-diego/cost"]]) {
    await page.goto(path);
    const offer = page.getByRole("region", { name: "Free address check" });
    await expect(offer.getByRole("button", { name: "Check my lot" })).toBeEnabled();
    await expect(offer.getByText(/Certificate of Feasibility · \$[\d.]+ one-time/)).toBeVisible();
    await expect(offer.getByRole("link", { name: "View a sample certificate" })).toHaveAttribute("href", "/sample-certificate/san-diego");
    const screenshot = testInfo.outputPath(`${name}-certificate-offer.png`);
    await offer.screenshot({ path: screenshot });
    await testInfo.attach(`${name}-certificate-offer`, { path: screenshot, contentType: "image/png" });
  }
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
