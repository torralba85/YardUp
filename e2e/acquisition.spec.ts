import { expect, test } from "@playwright/test";
import { SAMPLE_LIVE_PARCEL } from "../test/fixtures/live-parcel";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "webdriver", { configurable: true, get: () => false });
  });
  // Observe the local Google command queue without sending synthetic visits,
  // Firebase requests or campaign events to any production service.
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (["127.0.0.1", "localhost"].includes(url.hostname)) return route.continue();
    if (url.hostname === "www.googletagmanager.com" && url.pathname === "/gtag/js") return route.fulfill({ contentType: "application/javascript", body: "" });
    return route.abort();
  });
});

test("approved acquisition labels survive opt-in without property data", async ({ page }) => {
  await page.goto("/adu-cost-calculator?utm_source=facebook&utm_medium=organic_social&utm_campaign=adu_size_comparison_20261111&address=private-address&certKey=private-token#secret");
  const banner = page.getByRole("region", { name: /cookie consent/i });
  // Bare CI builds omit the measurement ID; configured builds are exercised
  // locally and again on the deployed site with collectors intercepted.
  const configured = await banner.waitFor({ state: "visible", timeout: 5_000 }).then(() => true, () => false);
  test.skip(!configured, "no measurement ID in this build");
  await expect(banner).toBeVisible();
  await expect.poll(() => page.evaluate(() => typeof window.gtag)).toBe("function");
  expect(await page.evaluate(() => JSON.stringify(window.dataLayer))).not.toMatch(/campaign_source|AW-/);
  await page.getByRole("button", { name: /^accept$/i }).click();
  await expect.poll(() => page.evaluate(() => (window.dataLayer ?? []).map((entry) => Array.from(entry as ArrayLike<unknown>)).findLast((entry) => entry[0] === "config" && String(entry[1]).startsWith("G-"))?.[2])).toMatchObject({
    campaign_source: "facebook",
    campaign_medium: "organic_social",
    campaign_name: "adu_size_comparison_20261111",
    page_location: expect.stringMatching(/\/adu-cost-calculator$/),
  });
  const queue = await page.evaluate(() => JSON.stringify(window.dataLayer));
  expect(queue).not.toMatch(/private-address|private-token|#secret|utm_source/);
  await page.getByRole("combobox", { name: /^County/ }).selectOption("san-diego");
  await page.getByRole("combobox", { name: /^Unit size/ }).selectOption("800");
  await expect(page.getByRole("region", { name: "Estimate your ADU" })).toContainText("$305");
});

test("tagged rent resource leads to a recorded parcel result in Studio", async ({ page }) => {
  test.setTimeout(60_000);
  const parcel = { ...SAMPLE_LIVE_PARCEL, source: "county-gis" };
  await page.route("**/api/geocode?**", (route) => route.fulfill({ json: {
    lat: parcel.lat,
    lng: parcel.lng,
    formattedAddress: parcel.address,
  } }));
  await page.route("**/api/parcel?**", (route) => route.fulfill({ json: parcel }));
  await page.goto("/adu/ca/rent?utm_source=casita_coalition&utm_medium=referral&utm_campaign=rent_resource_20261111");
  const banner = page.getByRole("region", { name: /cookie consent/i });
  const configured = await banner.waitFor({ state: "visible", timeout: 5_000 }).then(() => true, () => false);
  test.skip(!configured, "no measurement ID in this build");
  await page.getByRole("button", { name: /^accept$/i }).click();
  const lookup = page.getByRole("complementary", { name: "Lot check and tools" });
  await lookup.locator("summary").click();
  await lookup.getByRole("textbox", { name: /street address/i }).first().fill(parcel.address);
  await lookup.locator("form").getByRole("button", { name: "Check my lot" }).click();
  const answer = page.getByRole("region", { name: "Inline lot feasibility answer" });
  await expect(answer).toBeVisible();
  await answer.getByRole("link", { name: "Open in 3D" }).click();
  await expect(page).toHaveURL(/\/studio(?:\?|$)/, { timeout: 25_000 });
  await expect(page.getByText(parcel.address, { exact: true }).first()).toBeVisible();
  const tracked = () => page.evaluate(() =>
    (window.dataLayer ?? []).map((entry) => Array.from(entry as ArrayLike<unknown>)),
  );
  await expect.poll(tracked).toEqual(expect.arrayContaining([
    ["event", "lot_answer_viewed", expect.objectContaining({
      campaign_source: "casita_coalition",
      campaign_name: "rent_resource_20261111",
      surface: "guide",
    })],
    ["event", "studio_opened", expect.objectContaining({
      campaign_source: "casita_coalition",
      campaign_name: "rent_resource_20261111",
    })],
  ]));
  expect(JSON.stringify(await tracked())).not.toContain(parcel.address);
});

test("explicit internal QA marker suppresses the tagged visitor", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("lf-analytics-consent", JSON.stringify({ decision: "granted", version: 3, decidedAt: "2026-11-11" }));
    sessionStorage.setItem("lf:analytics-internal", "1");
  });
  const tagRequests: string[] = [];
  page.on("request", request => { if (request.url().includes("googletagmanager.com/gtag/js")) tagRequests.push(request.url()); });
  await page.goto("/adu-cost-calculator?utm_source=x&utm_medium=organic_social&utm_campaign=adu_financing_20261111");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(tagRequests).toEqual([]);
  expect(await page.evaluate(() => typeof window.gtag)).toBe("undefined");
});

for (const guide of [
  {
    path: "/adu/ca/san-diego-county",
    opening: /generally need 4 feet of clearance/i,
    action: "summary",
  },
  {
    path: "/adu/ca/san-diego/cost",
    opening: /Use the City of San Diego fee schedule below/i,
    action: "a",
  },
]) {
  test(`San Diego guide renders its answer and lot check at ${guide.path}`, async ({ page }) => {
    await page.goto(guide.path);
    await expect(page.getByText(guide.opening)).toBeVisible();
    const action = page.getByRole("complementary", { name: "Lot check and tools" }).locator(guide.action).filter({ hasText: "Check my lot" });
    await action.click();
    const address = page.getByRole("textbox", { name: /street address/i });
    await expect(address).toBeVisible();
    if (guide.action === "a") await expect(address).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("Carlsbad checklist and search metadata render on a narrow viewport", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/adu/ca/carlsbad");
  await expect(page).toHaveTitle("Carlsbad ADU Regulations (2026): Setbacks & Permits");
  await expect(page.getByRole("heading", { name: "Carlsbad ADU regulations: three checks for your lot" })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://lotfoundry.net/adu/ca/carlsbad");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("heading", { name: "Carlsbad ADU regulations: three checks for your lot" }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("carlsbad-checklist-320.png") });
});
