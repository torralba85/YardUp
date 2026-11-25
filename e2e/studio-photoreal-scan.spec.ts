import { expect, test } from "@playwright/test";

/**
 * Internal-beta Photoreal Scan coverage (Task 10 of the 3DGS Studio beta plan).
 *
 * The curated scan is registered for the `oak-street` demo parcel only
 * (`lib/splat-registry.ts`), and that preset is the Studio's default, so a guest
 * landing on /studio already has Scan in scope.
 *
 * These specs assert the product contract — selector availability, provenance
 * copy, calibration behaviour, and the fallback path. They deliberately do not
 * assert that splats rendered: headless WebGL cannot judge photoreal output, and
 * the calibration panel is reachable whether or not the asset decodes, so the
 * contract stays testable either way.
 */

const SCAN_ASSET = "**/scans/oak-street-curated.spz";

/** The floating lens switch that owns every scene view mode. */
function parcelViews(page: import("@playwright/test").Page) {
  return page.getByRole("radiogroup", { name: "Parcel view" });
}

test.describe("Studio photoreal scan (beta)", () => {
  test.beforeEach(async ({ viewport }) => {
    // Desktop-only: the mobile journey reaches the scene through the Shape
    // reveal, which `mobile-studio.spec.ts` already walks.
    test.skip(!viewport || viewport.width < 1024, "desktop-only");
  });

  test("registered demo parcel offers Scan beside the other views", async ({ page }) => {
    await page.goto("/studio");

    const views = parcelViews(page);
    await expect(views.getByRole("radio", { name: "3D model" })).toBeVisible();
    await expect(views.getByRole("radio", { name: /^Scan/ })).toBeVisible();
    await expect(views.getByRole("radio", { name: "Neighborhood" })).toBeVisible();
    await expect(views.getByRole("radio", { name: "Aerial" })).toBeVisible();
    // 3D stays the safe default for a preset parcel with no aerial imagery.
    await expect(views.getByRole("radio", { name: "3D model" })).toBeChecked();
  });

  test("a parcel with no registered scan hides Scan entirely", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/studio");
    // The sample-property picker lives on Your Lot; the Studio opens on Rules & Fit.
    await page.getByRole("button", { name: "Your lot" }).click();

    const views = parcelViews(page);
    await expect(views.getByRole("radio", { name: /^Scan/ })).toBeVisible();

    await page.getByText("Try a sample property").click();
    await page.getByLabel("Sample Property").selectOption("corner-lot");

    await expect(views.getByRole("radio", { name: /^Scan/ })).toHaveCount(0);
    await expect(views.getByRole("radio", { name: "3D model" })).toBeVisible();
  });

  test("entering Scan states the sample provenance and keeps 3D reachable", async ({ page }) => {
    await page.goto("/studio");

    const views = parcelViews(page);
    await views.getByRole("radio", { name: /^Scan/ }).click();

    // The banner must never imply the scan is a survey of this property.
    await expect(page.getByText(/Sample scan/)).toBeVisible();
    await expect(page.getByText(/not a capture of this property/)).toBeVisible();
    await expect(
      page.getByText(/placement uses the estimated model/),
    ).toBeVisible();
    // Calibration is internal; a public build must not expose it.
    if (process.env.NEXT_PUBLIC_SCAN_CALIBRATION !== "true") {
      await expect(page.getByRole("button", { name: "Calibrate Scan" })).toHaveCount(0);
    }

    await page.getByRole("button", { name: "Return to 3D model" }).first().click();
    await expect(views.getByRole("radio", { name: "3D model" })).toBeChecked();
  });

  test("calibration panel adjusts, resets, and exports the scan transform", async ({
    page,
    context,
  }) => {
    test.skip(
      process.env.NEXT_PUBLIC_SCAN_CALIBRATION !== "true",
      "internal tool: build with NEXT_PUBLIC_SCAN_CALIBRATION=true",
    );
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/studio");
    await parcelViews(page).getByRole("radio", { name: /^Scan/ }).click();

    const openCalibration = page.getByRole("button", { name: "Calibrate Scan" });
    await openCalibration.click();

    const panel = page.getByRole("complementary", { name: "3DGS Visual Calibration" });
    await expect(panel).toBeVisible();
    await expect(panel.getByText(/VISUAL CALIBRATION/)).toBeVisible();
    await expect(panel.getByText(/NOT SURVEYED/)).toBeVisible();
    // Opening the drawer moves focus into it.
    await expect(panel.getByRole("button", { name: "Close calibration panel" })).toBeFocused();

    // Registered transform from `lib/splat-registry.ts`: positionFt [0, 0, 15].
    const yaw = panel.getByLabel("Yaw rotation in degrees");
    const zOffset = panel.getByLabel("Z offset in feet");
    await expect(yaw).toHaveValue("0");
    await expect(zOffset).toHaveValue("15");

    await yaw.fill("15");
    await expect(panel.getByText("15°")).toBeVisible();
    await zOffset.fill("22");
    await expect(zOffset).toHaveValue("22");

    await panel.getByRole("button", { name: "Reset" }).click();
    await expect(yaw).toHaveValue("0");
    await expect(zOffset).toHaveValue("15");

    // Export copies to the clipboard, or falls back to a selectable textarea
    // when the clipboard is unavailable. Either outcome is a pass.
    await panel.getByRole("button", { name: /Export JSON/ }).click();
    await expect(
      panel
        .getByRole("button", { name: /Copied/ })
        .or(panel.getByLabel("Calibration JSON export")),
    ).toBeVisible();

    await panel.getByRole("button", { name: "Close calibration panel" }).click();
    await expect(panel).toHaveCount(0);
    await expect(openCalibration).toBeFocused();
  });

  test("a failed scan load leaves the Studio usable", async ({ page }) => {
    await page.route(SCAN_ASSET, (route) => route.abort());
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/studio");
    const views = parcelViews(page);
    await views.getByRole("radio", { name: /^Scan/ }).click();

    await expect(page.getByText(/Scan unavailable/)).toBeVisible({ timeout: 30_000 });
    // The rest of the Studio must survive a dead asset.
    await expect(views.getByRole("radio", { name: "3D model" })).toBeVisible();

    await page.getByRole("button", { name: "Return to 3D model" }).first().click();
    await expect(views.getByRole("radio", { name: "3D model" })).toBeChecked();
    expect(pageErrors, pageErrors.join(" | ")).toEqual([]);
  });

  test("ADU design choices survive a 3D to Scan round trip", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/studio");
    await page.getByRole("button", { name: /Design/i }).click();

    const sizes = page.getByRole("radiogroup", { name: "ADU footprint size" });
    const large = sizes.getByRole("radio", { name: /800 sf/ });
    await large.click();
    await expect(large).toBeChecked();

    const roofs = page.getByRole("radiogroup", { name: "Roof style" });
    const roof = roofs.getByRole("radio").nth(1);
    await roof.click();
    await expect(roof).toBeChecked();

    const views = parcelViews(page);
    await views.getByRole("radio", { name: /^Scan/ }).click();
    await views.getByRole("radio", { name: "3D model" }).click();

    await expect(large).toBeChecked();
    await expect(roof).toBeChecked();
  });
});
