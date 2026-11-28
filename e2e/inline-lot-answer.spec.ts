import { expect, test } from "@playwright/test";
import { SAMPLE_LIVE_PARCEL } from "../test/fixtures/live-parcel";

test("guide visitors get an inline answer and reuse the parcel in Studio", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  let geocodes = 0;
  let parcels = 0;
  await page.route("**/api/geocode?**", (route) => {
    geocodes += 1;
    expect(route.request().headers().authorization).toBeUndefined();
    return route.fulfill({ json: {
      lat: SAMPLE_LIVE_PARCEL.lat, lng: SAMPLE_LIVE_PARCEL.lng,
      formattedAddress: `${SAMPLE_LIVE_PARCEL.address}, ${SAMPLE_LIVE_PARCEL.city}`,
    } });
  });
  await page.route("**/api/parcel?**", (route) => {
    parcels += 1;
    return route.fulfill({ json: { ...SAMPLE_LIVE_PARCEL, source: "county-gis" } });
  });
  await page.goto("/adu/ca/san-diego");
  const lookup = page.getByRole("complementary", { name: "Lot check and tools" });
  await lookup.locator("summary").click();
  await lookup.getByRole("textbox", { name: /street address/i }).first().fill(`${SAMPLE_LIVE_PARCEL.address}, ${SAMPLE_LIVE_PARCEL.city}`);
  await lookup.locator("form").getByRole("button", { name: "Check my lot" }).click();
  const answer = page.getByRole("region", { name: "Inline lot feasibility answer" });
  await expect(answer).toBeVisible();
  await expect(answer).toContainText("Early planning estimates");
  // A teaser only: no figures or lot facts before the Studio and certificate.
  await expect(answer).not.toContainText("$");
  await expect(answer).not.toContainText("sq ft");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("guide-inline-answer.png"), fullPage: true });
  await answer.getByRole("link", { name: "Open in 3D" }).click();
  await expect(page).toHaveURL(/\/studio(?:\?|$)/);
  await expect(page.getByText(SAMPLE_LIVE_PARCEL.address, { exact: true }).first()).toBeVisible();
  expect(geocodes).toBe(1);
  expect(parcels).toBe(1);
  expect(page.url()).not.toContain("Cedar");
});
