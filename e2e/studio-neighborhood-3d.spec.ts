import { expect, test } from "@playwright/test";

/**
 * Neighborhood 3D coverage for the photorealistic basemap ladder.
 *
 * The Playwright web server explicitly clears `NEXT_PUBLIC_GOOGLE_MAP_TILES_KEY`
 * and `NEXT_PUBLIC_CESIUM_ION_TOKEN`, so these specs exercise the bottom rung of
 * the ladder even when a developer has a credential in an ignored local env file.
 * The OpenStreetMap fallback remains worth guarding for unavailable/rejected
 * credential recovery.
 *
 * The photorealistic rungs cannot be asserted here — they need a provisioned,
 * billable key, and headless WebGL could not judge photogrammetry anyway.
 * `lib/cesium-photoreal.test.ts` covers the route selection and failure
 * fallthrough; what these specs prove is that the view still mounts, reports its
 * own provenance honestly, and tears down without errors.
 */

/** The floating lens switch that owns every scene view mode. */
function parcelViews(page: import("@playwright/test").Page) {
  return page.getByRole("radiogroup", { name: "Parcel view" });
}

/** The HUD opens collapsed; provenance and ground height sit behind Details. */
async function openHudDetails(page: import("@playwright/test").Page) {
  const toggle = page.getByTestId("cesium-hud").getByRole("button", { name: "Details" });
  if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
}

const CAMERA_CONTROL_NAMES = [
  "Zoom in",
  "Zoom out",
  "Rotate counterclockwise",
  "Rotate clockwise",
  "Tilt up",
  "Tilt down",
  "Recenter on property",
];

test.describe("Studio Neighborhood 3D", () => {
  test.beforeEach(async ({ viewport }) => {
    // Desktop-only: the mobile journey reaches the scene through the Shape reveal.
    test.skip(!viewport || viewport.width < 1024, "desktop-only");
  });

  test("entering Neighborhood mounts Cesium and names the basemap it actually got", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/studio");
    await parcelViews(page).getByRole("radio", { name: "Neighborhood" }).click();

    await expect(page.getByTestId("cesium-container")).toBeVisible();

    // With no credentials the HUD must say OSM rather than implying photogrammetry.
    await expect(page.getByTestId("cesium-basemap-route")).toHaveText(/OpenStreetMap imagery/i, {
      timeout: 30_000,
    });
    await expect(page.getByTestId("cesium-photoreal-notice")).toContainText(
      /No Google Map Tiles key or Cesium ion token/i,
    );

    expect(pageErrors).toEqual([]);
  });

  test("preserves blocked placement and recovers from a failed Cesium download", async ({ page }) => {
    // Two CDN-backed viewer loads (failed + recovered); each can take 60s.
    test.setTimeout(150_000);
    let scriptRequests = 0;
    await page.route("**/Build/Cesium/Cesium.js", async (route) => {
      scriptRequests++;
      if (scriptRequests === 1) await route.abort();
      else await route.continue();
    });
    await page.goto("/studio?v=2&hc=wall&parcel=oak-street&w=20&l=30&h=12&x=0&z=0&rotation=0&size=600&roof=shed&finish=cedar&openings=1");
    const views = parcelViews(page);
    await views.getByRole("radio", { name: "Neighborhood" }).click();
    await expect(page.getByText("3D Globe currently unavailable")).toBeVisible();
    await expect(page.getByTestId("cesium-compliance-verdict")).toHaveText("Doesn't fit at this placement");
    await views.getByRole("radio", { name: "3D model" }).click();
    await views.getByRole("radio", { name: "Neighborhood" }).click();
    await expect(page.locator(".cesium-widget canvas")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("cesium-ground-elevation")).toContainText(/Ground/, { timeout: 60_000 });
    await expect(page.getByTestId("cesium-compliance-verdict")).toHaveText("Doesn't fit at this placement");
    expect(scriptRequests).toBe(2);
  });

  test("reports a ground elevation or says it is unavailable, never a bare number", async ({
    page,
  }) => {
    await page.goto("/studio");
    await parcelViews(page).getByRole("radio", { name: "Neighborhood" }).click();

    // Mount plus ground-elevation lookup share one CDN-backed load.
    test.setTimeout(120_000);
    await expect(page.getByText(/Streaming 3D globe/)).toHaveCount(0, { timeout: 60_000 });
    await openHudDetails(page);
    const elevation = page.getByTestId("cesium-ground-elevation");
    await expect(elevation).toBeVisible({ timeout: 30_000 });

    // Either a sea-level elevation, an explicitly-uncorrected reading, or an
    // honest "unavailable". A height with no datum stated is the failure case.
    await expect(elevation).toHaveText(
      /(above sea level|sea-level correction pending|Ground height unavailable)/i,
    );
  });

  test("keeps renderer attribution visible and separate from the HUD at narrow widths", async ({ page }) => {
    // Two renderer mounts share this test; each external CDN load can take 60s,
    // and CI's software WebGL makes every later action slow as well.
    test.setTimeout(300_000);
    await page.goto("/studio");
    await parcelViews(page).getByRole("radio", { name: "Neighborhood" }).click();
    const canvas = page.getByTestId("cesium-container");
    const credits = page.locator(".cesium-credit-logoContainer");
    await expect(credits).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/Streaming 3D globe/)).toHaveCount(0, { timeout: 30_000 });

    const consent = page.getByRole("region", { name: "Cookie consent" });
    if (await consent.isVisible()) await consent.getByRole("button", { name: "Decline" }).click();

    // Mobile uses a separate journey; reach its Shape reveal after resizing.
    // This verifies the existing path, not real-device performance readiness.
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      if (width < 1024) {
        await page.getByRole("button", { name: /reveal my backyard/i }).click();
        await page.getByRole("button", { name: /shape your adu/i }).click();
      }
      await expect(credits).toBeVisible({ timeout: 60_000 });
      await expect(page.getByText(/Streaming 3D globe/)).toHaveCount(0, { timeout: 30_000 });
      // Measure against the HUD at its largest, with the details open.
      const route = page.getByTestId("cesium-basemap-route");
      await expect(route).toBeVisible({ timeout: 60_000 });
      await openHudDetails(page);
      // Cesium rewrites its credit list as tiles stream, so the box may never be
      // "stable" for scrollIntoViewIfNeeded; a plain scroll is all this needs.
      await credits.evaluate((element) => element.scrollIntoView({ block: "nearest" }));
      const bounds = await credits.boundingBox();
      const hud = await route.boundingBox();
      expect(bounds).not.toBeNull();
      expect(hud).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(900);
      expect(bounds!.y).toBeGreaterThan(hud!.y + hud!.height);
      // The open HUD and the camera controls share the top edge without overlapping.
      const hudCard = await page.getByTestId("cesium-hud").boundingBox();
      const controls = await page.getByRole("group", { name: "Camera controls" }).boundingBox();
      expect(hudCard).not.toBeNull();
      expect(controls).not.toBeNull();
      expect(hudCard!.x + hudCard!.width).toBeLessThan(controls!.x);
      expect(controls!.x + controls!.width).toBeLessThanOrEqual(width);
      await expect(canvas).toBeVisible();
    }
  });

  test("returns to the 3D model and leaves the Studio usable", async ({ page }) => {
    // The return control is covered until the CDN-backed globe finishes loading.
    test.setTimeout(60_000);
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/studio");
    const views = parcelViews(page);
    await views.getByRole("radio", { name: "Neighborhood" }).click();
    await expect(page.getByTestId("cesium-container")).toBeVisible();

    await page.getByRole("button", { name: /Return to 3D model/i }).click();

    await expect(views.getByRole("radio", { name: "3D model" })).toBeChecked();
    expect(pageErrors).toEqual([]);
  });

  test("opens with a compact HUD and drives the camera from the control buttons", async ({ page }) => {
    // One CDN-backed viewer load, then seven camera moves. Cesium's render loop
    // keeps CI's software WebGL busy, so every action waits on the page: on a
    // slow runner each click took about 17s and the whole test about 185s.
    test.setTimeout(300_000);
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    // Reduced motion applies each step at once instead of animating it frame by
    // frame, which is slow under CI's software WebGL. The step maths is the same.
    await page.emulateMedia({ reducedMotion: "reduce" });

    await page.goto("/studio");
    await parcelViews(page).getByRole("radio", { name: "Neighborhood" }).click();
    const controls = page.getByRole("group", { name: "Camera controls" });
    await expect(controls.getByRole("button", { name: "Zoom in" })).toBeEnabled({ timeout: 90_000 });

    // Collapsed, the HUD is a corner card: the neighborhood stays in view.
    const hud = await page.getByTestId("cesium-hud").boundingBox();
    const view = await page.getByTestId("cesium-container").boundingBox();
    expect(hud).not.toBeNull();
    expect(view).not.toBeNull();
    expect(hud!.width * hud!.height).toBeLessThan(view!.width * view!.height * 0.12);
    await expect(page.getByTestId("cesium-compliance-verdict")).toBeVisible();
    await expect(page.getByTestId("cesium-ground-elevation")).toBeHidden();

    for (const name of CAMERA_CONTROL_NAMES) {
      await controls.getByRole("button", { name }).click();
    }
    await expect(page.locator(".cesium-widget canvas")).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test("survives repeated 3D to Neighborhood round trips without leaking errors", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/studio");
    const views = parcelViews(page);

    // Each entry builds a Cesium viewer and each exit destroys it; a missed
    // teardown shows up here as a leaked WebGL context or a destroyed-viewer throw.
    // Three viewer build/teardown round trips over the CDN.
    test.setTimeout(180_000);
    for (let pass = 0; pass < 3; pass += 1) {
      await views.getByRole("radio", { name: "Neighborhood" }).click();
      await expect(page.getByTestId("cesium-container")).toBeVisible();
      await views.getByRole("radio", { name: "3D model" }).click();
      await expect(views.getByRole("radio", { name: "3D model" })).toBeChecked();
    }

    expect(pageErrors).toEqual([]);
  });

  test("real address flow: clicking Neighborhood while lookup is pending displays loading state without demo address fallback", async ({
    page,
  }) => {
    // Delay geocode or parcel request to keep it in pending state
    await page.route("**/api/geocode*", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          lat: 37.4446,
          lng: -122.1611,
          formattedAddress: "250 Hamilton Avenue, Palo Alto, CA 94301",
        }),
      });
    });

    await page.goto("/studio?q=250+Hamilton+Avenue,+Palo+Alto,+CA+94301");

    // Left rail / header shows target address immediately, not 1234 Oak Street
    await expect(page.getByText("250 Hamilton Avenue").first()).toBeVisible();
    await expect(page.locator("text=1234 Oak Street")).toHaveCount(0);

    // Switch to Neighborhood while still pending
    await parcelViews(page).getByRole("radio", { name: "Neighborhood" }).click();

    // Renders loading placeholder, does not mount Cesium with Oak Street
    await expect(page.getByTestId("neighborhood-loading")).toBeVisible();
    await expect(page.getByText("Loading property for Neighborhood 3D…")).toBeVisible();
    await expect(page.locator("text=1234 Oak Street")).toHaveCount(0);
    await expect(page.getByTestId("cesium-container")).toHaveCount(0);
  });

  test("real address flow: failed lookup displays retry state in Neighborhood and does not mount demo", async ({
    page,
  }) => {
    await page.route("**/api/geocode*", async (route) => {
      await route.abort();
    });

    await page.goto("/studio?q=250+Hamilton+Avenue,+Palo+Alto,+CA+94301");

    // Switch to Neighborhood
    await parcelViews(page).getByRole("radio", { name: "Neighborhood" }).click();

    // Displays neighborhood lookup error and retry button
    await expect(page.getByTestId("neighborhood-lookup-error")).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry lookup" })).toBeVisible();
    await expect(page.locator("text=1234 Oak Street")).toHaveCount(0);
    await expect(page.getByTestId("cesium-container")).toHaveCount(0);
  });

  test("real address flow: successful lookup mounts Cesium with live parcel coordinates and supports view switching", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.route("**/api/geocode*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          lat: 37.4446,
          lng: -122.1611,
          formattedAddress: "250 Hamilton Avenue, Palo Alto, CA 94301",
        }),
      });
    });
    await page.route("**/api/parcel*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          address: "250 Hamilton Ave",
          city: "Palo Alto, CA",
          lotArea: 7500,
          lotWidth: 60,
          lotLength: 125,
          existingHouseSqft: 2000,
          maxLotCoveragePercent: 40,
          setbacks: { front: 20, rear: 20, side: 6 },
          zoning: "R-1",
          boundaryGeoJson: null,
          lat: 37.4446,
          lng: -122.1611,
          source: "regrid",
          state: "CA",
          zip: "94301",
          county: "Santa Clara",
        }),
      });
    });

    await page.goto("/studio?q=250+Hamilton+Avenue,+Palo+Alto,+CA+94301");

    // Wait for live parcel to resolve
    await expect(page.getByText("250 Hamilton Ave").first()).toBeVisible();
    await expect(page.locator("text=1234 Oak Street")).toHaveCount(0);

    // Switch to Neighborhood
    const views = parcelViews(page);
    await views.getByRole("radio", { name: "Neighborhood" }).click();

    // Cesium mounts for the live parcel
    await expect(page.getByTestId("cesium-container")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("neighborhood-loading")).toHaveCount(0);
    await expect(page.locator("text=1234 Oak Street")).toHaveCount(0);

    // Return to 3D model and switch back
    await views.getByRole("radio", { name: "3D model" }).click();
    await expect(page.getByText("250 Hamilton Ave").first()).toBeVisible();
    await views.getByRole("radio", { name: "Neighborhood" }).click();
    await expect(page.getByTestId("cesium-container")).toBeVisible();
    await expect(page.locator("text=1234 Oak Street")).toHaveCount(0);
  });
});
