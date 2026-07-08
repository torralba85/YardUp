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
    // Seam rule: a money figure within 3 seconds of arrival (arrival plate
    // and the step-1 MoneyFigure both stamp data-money).
    await expect(page.locator("[data-money]").first()).toBeVisible({ timeout: 3000 });
    // The studio renders past the arrival plate into step 1's address survey.
    // The "If built" income teaser is gated to a *resolved* lot; a failed
    // search stays on the demo preset (parcelMode "preset"), so it correctly
    // stays hidden here — the money moment is carried by the arrival plate's
    // data-money above.
    await expect(
      page.getByRole("heading", { name: /start with your address/i }),
    ).toBeVisible();
    // The handed-off search ran (and failed for this unresolvable address).
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 15000 });
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
    // The studio sheet renders first…
    await expect(page.getByTestId("studio-sheet")).toBeVisible();
    // …and the wizard never interrupts an arrival that brought an address.
    await expect(page.getByText(/could your backyard pay you rent/i)).not.toBeVisible();
    await expect(page.getByText("Rent potential / mo")).toBeVisible();
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 15000 });
    expect(page.url()).not.toMatch(/nowhere|zzyzx|[?&]q=/i);
  });
});
