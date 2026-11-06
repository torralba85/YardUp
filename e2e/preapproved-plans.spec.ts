import { expect, test, type Page } from "@playwright/test";

async function openDesign(page: Page, isMobile: boolean) {
  if (isMobile) await page.getByRole("button", { name: "Shape your ADU" }).click();
  else await page.getByRole("navigation", { name: "Studio steps" }).getByRole("button", { name: /Design/ }).click();
}

const openCatalog = (page: Page) => page.locator("summary").filter({ hasText: /^Pre-approved plans/ }).click();

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("lf-analytics-consent", JSON.stringify({ decision: "denied", version: 2, decidedAt: new Date().toISOString() }));
  });
});

test("uses a plan to size the 3D model, restores it on reload and keeps the model when removed", async ({ page, isMobile }, testInfo) => {
  test.setTimeout(90_000);
  await page.goto("/studio?parcel=coyote-brush");
  await openDesign(page, isMobile);
  await expect(page.locator("summary").filter({ hasText: /^Pre-approved plans/ })).toContainText("6 plans for San Diego, CA");
  await openCatalog(page);
  const browser = page.getByRole("region", { name: "Pre-approved plan browser" });
  await expect(browser.getByRole("combobox", { name: "Permitting authority for this lot" })).toHaveValue("ca-san-diego");
  const card = browser.getByRole("article", { name: "County Standard Plan E" });
  await expect(card.getByRole("button", { name: "Use this plan" })).toBeDisabled();
  const checkbox = browser.getByRole("checkbox");
  await checkbox.focus();
  await page.keyboard.press("Space");
  const before = new URL(page.url()).searchParams;
  await card.getByRole("button", { name: "Use this plan" }).click();
  const summary = page.getByRole("region", { name: "Selected plan reference" });
  await expect(summary).toContainText("County Standard Plan E");
  await expect(summary).toContainText("3D model sized to this plan: 23.5 × 34 ft, 799 sq ft.");
  await expect(summary.getByRole("heading", { name: "County Standard Plan E" })).toBeFocused();
  await expect.poll(() => new URL(page.url()).searchParams.get("plan")).toBe("san-diego-city-plan-e");
  const after = new URL(page.url()).searchParams;
  expect([after.get("w"), after.get("l"), after.get("size")]).toEqual(["23.5", "34", "799"]);
  for (const key of ["h", "roof", "finish"]) expect(after.get(key)).toBe(before.get(key));
  await summary.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("plan-in-use.png") });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await summary.getByRole("button", { name: "View on your lot" }).click();
  await expect(page.locator("#studio-model-stage")).toBeInViewport();
  await page.reload();
  await openDesign(page, isMobile);
  await expect(summary).toContainText("County Standard Plan E");
  await expect(summary).toContainText("23.5 × 34 ft");
  await summary.getByRole("button", { name: "Remove plan" }).click();
  await expect(summary).toHaveCount(0);
  await expect.poll(() => new URL(page.url()).searchParams.has("plan")).toBe(false);
  expect(new URL(page.url()).searchParams.get("size")).toBe("799");
  await page.reload();
  await openDesign(page, isMobile);
  await expect(summary).toHaveCount(0);
});

test("browses another authority's catalog but only uses plans for a confirmed authority", async ({ page, isMobile }) => {
  await page.goto("/studio?parcel=coyote-brush");
  await openDesign(page, isMobile);
  await openCatalog(page);
  const browser = page.getByRole("region", { name: "Pre-approved plan browser" });
  await browser.getByRole("checkbox").check();
  const authority = browser.getByRole("combobox", { name: "Permitting authority for this lot" });
  await authority.selectOption("ca-sacramento");
  await expect(browser.getByRole("checkbox")).not.toBeChecked();
  await expect(browser.getByRole("article", { name: "Shelf Ready Studio" }).getByRole("button", { name: "Use this plan" })).toBeDisabled();
  await expect(browser.getByRole("link", { name: /^Plan documents/ }).first()).toHaveAttribute("href", /^https:\/\/adu.cityofsacramento.org\//);
  await expect(authority.locator("option", { hasText: "Seattle, WA" })).toHaveCount(0);
  await authority.selectOption("ca-oakland");
  await expect(browser.getByText("Availability needs verification", { exact: true })).toBeVisible();
  await expect(browser.getByRole("button", { name: "Use this plan" })).toHaveCount(0);
});
