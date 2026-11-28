import { expect, test } from "@playwright/test";

test("county GIS uncertainty survives the parcel handoff into Rules & Fit", async ({ page, viewport }) => {
  await page.goto("/");
  await page.evaluate(() => sessionStorage.setItem("lf:initial-live-parcel", JSON.stringify({
    address: "Review fixture", city: "Seattle, WA", lotArea: 6000, lotWidth: 60, lotLength: 100,
    existingHouseSqft: 0, maxLotCoveragePercent: 40,
    setbacks: { front: 20, rear: 20, side: 5 }, zoning: "Unknown", boundaryGeoJson: null,
    lat: 47.6, lng: -122.3, source: "county-gis", state: "WA", zip: "98101",
  })));
  await page.goto("/studio");
  const mobile = viewport && viewport.width < 1024;
  await expect(page.getByRole("region", { name: mobile ? "Rent and fit" : "Free property preview" })).toBeVisible();
  await expect(page.getByText(/Not permit approval or guaranteed income/).first()).toBeVisible();
  await expect(page.getByText(/Existing building footprint is unknown/).first()).toBeVisible();
  await expect(page.getByText(/ADU appears permitted under current rules/)).toHaveCount(0);
});
