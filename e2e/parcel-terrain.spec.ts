import { expect, test } from "@playwright/test";
import { createTerrainGrid, FEET_PER_METER } from "../lib/parcel-terrain";

const parcel = {
  address: "Terrain preview test lot", city: "San Francisco, CA", lotArea: 6000, lotWidth: 60, lotLength: 100,
  existingHouseSqft: 0, maxLotCoveragePercent: 40, setbacks: { front: 20, rear: 20, side: 5 },
  zoning: "Unknown", lat: 37.775, lng: -122.4195, source: "county-gis", state: "CA", zip: "94103",
  boundaryGeoJson: { type: "Polygon", coordinates: [[[-122.4196, 37.7748], [-122.4194, 37.7748], [-122.4194, 37.7752], [-122.4196, 37.7752], [-122.4196, 37.7748]]] },
};
const grid = createTerrainGrid(parcel.boundaryGeoJson)!;
const terrain = { grid, elevations: grid.points.map((p) => (100 + p.x * 0.15 + p.z * 0.08) / FEET_PER_METER), source: "USGS 3DEP", verticalDatum: "NAVD88 (test fixture)", resolutionMeters: 1, acquiredYears: [2023], fetchedAt: "2026-10-22" };

test.use({ deviceScaleFactor: 1 });

test("terrain renders relief, placement controls and provenance on desktop and phone", async ({ page, viewport }, testInfo) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let requests = 0;
  await page.route("**/api/parcel-terrain", async (route) => { requests++; await route.fulfill({ json: terrain }); });
  await page.goto("/");
  await page.evaluate((value) => sessionStorage.setItem("lf:initial-live-parcel", JSON.stringify(value)), parcel);
  await page.goto("/studio", { waitUntil: "domcontentloaded" });
  if (viewport && viewport.width < 1024) await page.getByRole("button", { name: /design your backyard home/i }).click();
  await page.getByRole("radio", { name: "Terrain", exact: true }).click();
  await expect(page.getByTestId("terrain-canvas").locator("canvas")).toBeVisible();
  await expect(page.getByTestId("terrain-footprint-relief")).toContainText("ground change beneath this ADU");
  const before = await page.getByTestId("terrain-footprint-relief").innerText();
  await page.getByRole("button", { name: "Rotate 15°", exact: true }).click();
  await expect(page.getByTestId("terrain-footprint-relief")).not.toHaveText(before);
  await page.getByRole("button", { name: "Move ADU north" }).click();
  await page.getByRole("button", { name: "Top view", exact: true }).click();
  await expect(page.getByRole("button", { name: "Angled view", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Angled view", exact: true }).click();
  await page.getByText("Elevation source and accuracy", { exact: true }).click();
  await expect(page.getByText(/Resolution is not survey accuracy/)).toBeVisible();
  await page.getByText("Elevation source and accuracy", { exact: true }).click();
  await page.getByRole("button", { name: "Reset position" }).click();
  await page.getByTestId("terrain-canvas").scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("terrain-preview.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(requests).toBe(1);
  expect(errors).toEqual([]);
});

test("demo terrain never invents ground elevations", async ({ page, viewport }) => {
  test.setTimeout(90_000);
  let requested = false;
  await page.route("**/api/parcel-terrain", async (route) => { requested = true; await route.abort(); });
  await page.goto("/studio?parcel=oak-street", { waitUntil: "domcontentloaded" });
  if (viewport && viewport.width < 1024) {
    await page.getByRole("button", { name: /design your backyard home/i }).click();
  }
  await page.getByRole("radio", { name: "Terrain", exact: true }).click();
  await expect(page.getByText(/Demo lots and estimated boundaries/)).toBeVisible();
  expect(requested).toBe(false);
});
