import { test, expect } from "@playwright/test";
import { SAMPLE_LIVE_PARCEL } from "../test/fixtures/live-parcel";

test("neighborhood data is reachable, dated, and usable on this viewport", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  // The page's address box answers inline first; keep that lookup synthetic.
  await page.route("**/api/geocode?**", (route) => route.fulfill({ json: {
    lat: SAMPLE_LIVE_PARCEL.lat, lng: SAMPLE_LIVE_PARCEL.lng,
    formattedAddress: `${SAMPLE_LIVE_PARCEL.address}, ${SAMPLE_LIVE_PARCEL.city}`,
  } }));
  await page.route("**/api/parcel?**", (route) => route.fulfill({ json: { ...SAMPLE_LIVE_PARCEL, source: "county-gis" } }));
  await page.goto("/adu/ca/san-diego/permits");
  const link = page.locator('table a[href*="/permits/"]').first();
  const name = await link.textContent();
  expect(await link.evaluate((anchor) => anchor.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  await link.click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`${name} ADU Permits`, { timeout: 20_000 });
  await expect(page.getByText("These are issued permits", { exact: false })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://lotfoundry.net${new URL(page.url()).pathname}`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("permit-area.png"), fullPage: true });
  const lookup = page.getByRole("complementary", { name: "Lot check and tools" });
  await lookup.locator("summary").click();
  await lookup.getByRole("textbox", { name: /street address/i }).first().fill(`${SAMPLE_LIVE_PARCEL.address}, ${SAMPLE_LIVE_PARCEL.city}`);
  await lookup.locator("form").getByRole("button", { name: "Check my lot" }).click();
  const answer = page.getByRole("region", { name: "Inline lot feasibility answer" });
  await expect(answer).toBeVisible();
  await answer.getByRole("link", { name: "Open in 3D" }).click();
  await expect(page).toHaveURL(/\/studio(?:\?|$)/, { timeout: 20_000 });
  expect(page.url()).not.toContain(SAMPLE_LIVE_PARCEL.address.split(" ")[1]);
});

test("unknown planning areas return 404", async ({ request }) => {
  const response = await request.get("/adu/ca/san-diego/permits/not-a-planning-area");
  expect(response.status()).toBe(404);
});
