import { expect, test, type Page } from "@playwright/test";

async function openDesign(page: Page, isMobile: boolean) {
  if (isMobile) await page.getByRole("button", { name: "Shape your ADU" }).click();
  else await page.getByRole("navigation", { name: "Studio steps" }).getByRole("button", { name: /Design/ }).click();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("lf-analytics-consent", JSON.stringify({ decision: "denied", version: 2, decidedAt: new Date().toISOString() }));
  });
});

test("selects a plan reference independently of the model and restores/removes it on reload", async ({ page, isMobile }, testInfo) => {
  test.setTimeout(90_000);
  await page.goto("/studio?parcel=coyote-brush");
  await openDesign(page, isMobile);
  await page.locator("summary").filter({ hasText: /^Pre-approved plans$/ }).click();
  const browser = page.getByRole("region", { name: "Pre-approved plan browser" });
  await expect(browser.getByRole("combobox", { name: "Permitting authority for this lot" })).toHaveValue("ca-san-diego");
  const card = browser.getByRole("article", { name: "County Standard Plan F" });
  await expect(card.getByRole("button", { name: "Select plan" })).toBeDisabled();
  const checkbox = browser.getByRole("checkbox");
  await checkbox.focus();
  await page.keyboard.press("Space");
  const before = new URL(page.url()).searchParams;
  await card.getByRole("button", { name: "Select plan" }).click();
  const summary = page.getByRole("region", { name: "Selected plan reference" });
  await expect(summary).toContainText("County Standard Plan F");
  await expect.poll(() => new URL(page.url()).searchParams.get("plan")).toBe("san-diego-city-plan-f");
  const after = new URL(page.url()).searchParams;
  for (const key of ["w", "l", "h", "roof", "finish", "x", "z", "rotation"]) expect(after.get(key)).toBe(before.get(key));
  await expect(browser).toContainText("Selecting a plan does not change your 3D model");
  await summary.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("selected-plan.png") });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.reload();
  await openDesign(page, isMobile);
  await expect(summary).toContainText("County Standard Plan F");
  await summary.getByRole("button", { name: "Remove plan reference" }).click();
  await expect(summary).toHaveCount(0);
  await expect.poll(() => new URL(page.url()).searchParams.has("plan")).toBe(false);
  await page.reload();
  await openDesign(page, isMobile);
  await expect(summary).toHaveCount(0);
});

test("browses another city's catalog while keeping selection restricted to the confirmed authority", async ({ page, isMobile }) => {
  await page.goto("/studio?parcel=coyote-brush");
  await openDesign(page, isMobile);
  await page.locator("summary").filter({ hasText: /^Pre-approved plans$/ }).click();
  const browser = page.getByRole("region", { name: "Pre-approved plan browser" });
  await browser.getByRole("checkbox").check();
  await browser.getByRole("combobox", { name: "Browse plans for" }).selectOption("ca-sacramento");
  await expect(browser.getByRole("article", { name: "Shelf Ready Studio" }).getByRole("button", { name: "Select plan" })).toBeDisabled();
  await expect(browser.getByRole("link", { name: /^Plan documents/ }).first()).toHaveAttribute("href", /^https:\/\/adu.cityofsacramento.org\//);
  await browser.getByRole("combobox", { name: "Browse plans for" }).selectOption("wa-seattle");
  await expect(browser.getByText("Availability needs verification", { exact: true })).toBeVisible();
  await expect(browser.getByRole("button", { name: "Select plan" })).toHaveCount(0);
});
