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
  return page.getByRole("group", { name: "Parcel view" });
}

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
    await parcelViews(page).getByRole("button", { name: "Neighborhood" }).click();

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
    await views.getByRole("button", { name: "Neighborhood" }).click();
    await expect(page.getByText("3D Globe currently unavailable")).toBeVisible();
    await expect(page.getByTestId("cesium-compliance-verdict")).toHaveText("Doesn't fit at this placement");
    await views.getByRole("button", { name: "3D model" }).click();
    await views.getByRole("button", { name: "Neighborhood" }).click();
    await expect(page.locator(".cesium-widget canvas")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("cesium-ground-elevation")).toContainText(/Ground/, { timeout: 60_000 });
    await expect(page.getByTestId("cesium-compliance-verdict")).toHaveText("Doesn't fit at this placement");
    expect(scriptRequests).toBe(2);
  });

  test("reports a ground elevation or says it is unavailable, never a bare number", async ({
    page,
  }) => {
    await page.goto("/studio");
    await parcelViews(page).getByRole("button", { name: "Neighborhood" }).click();

    // Mount plus ground-elevation lookup share one CDN-backed load.
    test.setTimeout(120_000);
    const elevation = page.getByTestId("cesium-ground-elevation");
    await expect(elevation).toBeVisible({ timeout: 30_000 });

    // Either a sea-level elevation, an explicitly-uncorrected reading, or an
    // honest "unavailable". A height with no datum stated is the failure case.
    await expect(elevation).toHaveText(
      /(above sea level|sea-level correction pending|Ground height unavailable)/i,
    );
  });

  test("keeps renderer attribution visible and separate from the HUD at narrow widths", async ({ page }) => {
    // Two renderer mounts share this test; each external CDN load can take 60s.
    test.setTimeout(150_000);
    await page.goto("/studio");
    await parcelViews(page).getByRole("button", { name: "Neighborhood" }).click();
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
      await credits.scrollIntoViewIfNeeded();
      const bounds = await credits.boundingBox();
      const hud = await page.getByTestId("cesium-basemap-route").boundingBox();
      expect(bounds).not.toBeNull();
      expect(hud).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(900);
      expect(bounds!.y).toBeGreaterThan(hud!.y + hud!.height);
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
    await views.getByRole("button", { name: "Neighborhood" }).click();
    await expect(page.getByTestId("cesium-container")).toBeVisible();

    await page.getByRole("button", { name: /Return to 3D model/i }).click();

    await expect(views.getByRole("button", { name: "3D model" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
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
      await views.getByRole("button", { name: "Neighborhood" }).click();
      await expect(page.getByTestId("cesium-container")).toBeVisible();
      await views.getByRole("button", { name: "3D model" }).click();
      await expect(views.getByRole("button", { name: "3D model" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    }

    expect(pageErrors).toEqual([]);
  });
});
