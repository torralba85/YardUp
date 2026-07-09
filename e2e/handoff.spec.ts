import { expect, test } from "@playwright/test";

// An address no geocoder resolves: with live keys the search returns zero
// results; without keys the API reports missing configuration. Either way the
// studio surfaces its role="alert" banner — proof the handed-off search ran —
// while the demo parcel keeps the money moment on screen.
const UNRESOLVABLE_ADDRESS = "0 Nowhere Lane, Zzyzx Flats, ZZ 00000";

test.describe("landing → studio handoff", () => {
  test("desktop: the searched address runs and the money moment survives", async ({
    page,
    viewport,
  }) => {
    test.skip(!viewport || viewport.width < 1024, "desktop-only");
    await page.goto("/");
    await page.getByLabel(/property address/i).fill(UNRESOLVABLE_ADDRESS);
    await page.getByRole("button", { name: /run feasibility/i }).click();

    await expect(page).toHaveURL(/\/studio/);
    // Seam rule (DESIGN.md): a money-green figure within 3s of arrival — the
    // dawn arrival plate stamps data-money while Firebase auth resolves.
    await expect(page.locator("[data-money]").first()).toBeVisible({ timeout: 3000 });
    // The handed-off search ran and failed for this unresolvable address
    // (15s absorbs the geocode round trip; the banner surfaces with or without
    // keys). Filter to the alert that carries text: Next.js also renders an
    // empty role="alert" route announcer, so a bare getByRole("alert") is
    // ambiguous under Playwright strict mode.
    await expect(
      page.getByRole("alert").filter({ hasText: /\S/ }),
    ).toBeVisible({ timeout: 15000 });
    // Money moment survives: the desktop studio opens on Feasibility with the
    // demo preset, so its "If built" income figure stays on screen after the
    // failed search settles. 15s absorbs auth + the search round trip.
    await expect(page.getByText("If built").first()).toBeVisible({ timeout: 15000 });
    // Privacy: the typed address never reaches the URL.
    expect(page.url()).not.toMatch(/nowhere|zzyzx|[?&]q=/i);
  });

  test("mobile: the first-run wizard yields to the handed-off address", async ({
    page,
    viewport,
  }) => {
    test.skip(!viewport || viewport.width >= 1024, "mobile-only");
    await page.goto("/");
    await page.getByLabel(/property address/i).fill(UNRESOLVABLE_ADDRESS);
    await page.getByRole("button", { name: /run feasibility/i }).click();

    await expect(page).toHaveURL(/\/studio/);
    // The studio sheet renders first… (15s: the dawn arrival plate holds the
    // screen until Firebase auth resolves, same budget as the other arrivals)
    await expect(page.getByTestId("studio-sheet")).toBeVisible({ timeout: 15000 });
    // …and the wizard never interrupts an arrival that brought an address.
    await expect(page.getByText(/could your backyard pay you rent/i)).not.toBeVisible();
    await expect(page.getByText("Rent potential / mo")).toBeVisible();
    // The handed-off search ran and failed: the parcel error surfaces as a
    // role="alert" banner (PeekMetrics and the constraints panel both carry
    // one). Filter out Next.js's empty route-announcer alert, then take the
    // first since several error surfaces may show the message at once.
    await expect(
      page.getByRole("alert").filter({ hasText: /\S/ }).first(),
    ).toBeVisible({ timeout: 15000 });
    expect(page.url()).not.toMatch(/nowhere|zzyzx|[?&]q=/i);
  });
});
