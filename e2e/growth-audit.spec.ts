import { expect, test } from "@playwright/test";

test("Studio previews locked detail while keeping the free rent range available", async ({ page }, testInfo) => {
  await page.goto("/studio?parcel=oak-street&step=certificate", { waitUntil: "domcontentloaded" });
  const preview = page.getByRole("region", { name: "Free property preview" });
  await expect(preview).toBeVisible();
  // Since the 2026-11-01 funnel change only financed cash flow stays locked;
  // build cost, net income and payback are free.
  await expect(preview.locator('[data-locked-metric="true"]')).toHaveCount(1);
  await expect(preview).toContainText("Estimated monthly rent");
  await expect(page.getByRole("button", { name: "Continue to secure checkout — $29" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("studio-cost-preview.png") });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("market demo, full sample, and keyboard dismissal agree", async ({ page }, testInfo) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const rent = page.getByRole("radiogroup", { name: "Demo rent assumption" });
  await expect(rent.getByRole("radio", { name: "market", exact: true })).toHaveAttribute("aria-checked", "true");
  await page.getByText("What’s behind these numbers?").click();
  await expect(page.locator("#numbers details")).toContainText("$19,035");
  await rent.getByRole("radio", { name: "conservative", exact: true }).click();
  await expect(page.locator("#numbers details")).toContainText("$16,605");
  const preview = page.getByRole("button", { name: "View full sample / save PDF" });
  await preview.click();
  const dialog = page.getByRole("dialog", { name: "Oak Street sample Certificate" });
  await expect(dialog).toBeVisible();
  // The shared ui/Dialog title: Space Grotesk 500, the same on every dialog.
  await expect(dialog.getByRole("heading", { level: 2 })).toHaveCSS("font-family", /space.*grotesk/i);
  await expect(dialog.getByRole("heading", { level: 2 })).toHaveCSS("font-weight", "500");
  const report = page.frameLocator('iframe[title="Full sample Certificate of Feasibility"]');
  await expect(report.getByRole("heading", { name: "Hard & Soft Cost Allowances" })).toBeVisible();
  await expect(report.getByText("Public sample", { exact: false })).toContainText("market rent");
  await page.screenshot({ path: testInfo.outputPath("sample-dialog.png") });
  await page.getByRole("button", { name: "Close sample" }).focus();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(preview).toBeFocused();
  await page.locator("#report").screenshot({ path: testInfo.outputPath("certificate-offer.png") });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("homepage server HTML has one slash-form canonical and alt text on both parcel images", async ({ request }) => {
  const html = await (await request.get("/")).text();
  expect(html.match(/<link rel="canonical"[^>]*>/g)).toEqual([
    '<link rel="canonical" href="https://lotfoundry.net/"/>',
  ]);
  for (const image of ["parcel-after", "parcel-before"]) {
    const tag = html.match(new RegExp(`<img[^>]*src="/landing/a-lot-more/${image}\\.webp"[^>]*>`))?.[0];
    expect(tag).toMatch(/ alt="[^"]+"/);
    expect(tag).not.toContain("aria-hidden");
  }
});

test("city pages have static local numbers, a self canonical, and the matching demo", async ({ page, request }) => {
  for (const [city, label, parcel, rent, demoName] of [
    ["seattle", "Seattle", "oak-street", "$2,350", "Oak Street"],
    ["portland", "Portland", "corner-lot", "$2,600", "Linden Avenue"],
    ["austin", "Austin", "compact-lot", "$2,150", "Mesa Court"],
    ["san-diego", "San Diego", "coyote-brush", "$2,615", "Coyote Brush Court"],
  ]) {
    const sample = await request.get(`/sample-certificate/${city}`);
    expect(sample.headers()["x-frame-options"]).toBe("SAMEORIGIN");
    expect(sample.headers()["x-robots-tag"]).toContain("noindex");
    const response = await request.get(`/${city}`);
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain(demoName);
    expect(html).toContain(`https://lotfoundry.net/${city}`);
    expect(html).toContain(`${label} ADU Feasibility`);
    expect(html).toContain(rent);
    await page.goto(`/${city}`, { waitUntil: "domcontentloaded" });
    const link = page.getByRole("link", { name: `Open the ${label} sample lot in the 3D studio` });
    await expect(link).toContainText(rent);
    expect(new URLSearchParams((await link.getAttribute("href"))!.split("?")[1]).get("parcel")).toBe(parcel);
  }
  const costGuide = await request.get("/adu/ca/san-diego/cost");
  expect(costGuide.status()).toBe(200);
  expect(await costGuide.text()).toContain("San Diego");
  const unknown = await request.get("/unsupported-city");
  expect(unknown.status()).toBe(404);
});

test("sample remains usable at 320px", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "View full sample / save PDF" }).click();
  const dialog = page.getByRole("dialog", { name: "Oak Street sample Certificate" });
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((node) => node.getBoundingClientRect().width <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("sample-dialog-320.png") });
  await page.getByRole("button", { name: "Close sample" }).click();
  await expect(dialog).not.toBeVisible();
});
