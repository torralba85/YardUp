import { expect, test } from "@playwright/test";
import { signInTestOwner } from "./fixtures/studio-auth";

test.beforeEach(async ({ page }) => {
  test.setTimeout(60_000);
  await signInTestOwner(page);
});

test("county GIS uncertainty survives the parcel handoff into Rules & Fit", async ({ page, viewport }) => {
  await page.goto("/");
  await page.evaluate(() => sessionStorage.setItem("lf:initial-live-parcel", JSON.stringify({
    address: "Review fixture", city: "Seattle, WA", lotArea: 6000, lotWidth: 60, lotLength: 100,
    existingHouseSqft: 0, maxLotCoveragePercent: 40,
    setbacks: { front: 20, rear: 20, side: 5 }, zoning: "Unknown", boundaryGeoJson: null,
    lat: 47.6, lng: -122.3, source: "county-gis", state: "WA", zip: "98101",
  })));
  await page.goto("/studio");
  if (viewport && viewport.width < 1024) {
    // A resolved live parcel starts at Earn; Find is already complete.
    await page.getByRole("button", { name: /shape your adu/i }).click();
    await page.getByRole("button", { name: /check feasibility/i }).click();
  }
  await expect(page.getByText("Needs Review", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Zoning and ADU permission are unverified/).first()).toBeVisible();
  await expect(page.getByText(/Existing building footprint is unknown/).first()).toBeVisible();
  await expect(page.getByText(/ADU appears permitted under current rules/)).toHaveCount(0);
});
