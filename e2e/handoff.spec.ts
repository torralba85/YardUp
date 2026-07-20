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
    // keys). Filter to the alert that carries text: Next.js's route announcer
    // is also role="alert" and, once a route sets a title, carries that title
    // as text too, so take the first match like the mobile case below.
    await expect(
      page.getByRole("alert").filter({ hasText: /\S/ }).first(),
    ).toBeVisible({ timeout: 15000 });
    // Money moment survives: the desktop studio opens on Feasibility with the
    // demo preset, so its "If built" income figure stays on screen after the
    // failed search settles. 15s absorbs auth + the search round trip.
    await expect(page.getByText("If built").first()).toBeVisible({ timeout: 15000 });
    // Privacy: the typed address never reaches the URL.
    expect(page.url()).not.toMatch(/nowhere|zzyzx|[?&]q=/i);
  });

  test("mobile: the journey absorbs the handed-off address", async ({
    page,
    viewport,
  }) => {
    test.skip(!viewport || viewport.width >= 1024, "mobile-only");
    await page.goto("/");
    await page.getByLabel(/property address/i).fill(UNRESOLVABLE_ADDRESS);
    await page.getByRole("button", { name: /run feasibility/i }).click();

    await expect(page).toHaveURL(/\/studio/);
    // The five-reveal journey renders (15s: the dawn arrival plate holds the
    // screen until Firebase auth resolves, same budget as the other arrivals).
    await expect(page.getByTestId("mobile-journey")).toBeVisible({ timeout: 15000 });
    // The handed-off search ran and failed for this unresolvable address, so
    // the journey stays on the Find reveal with its error banner — the
    // visitor can retry or pick a demo lot. Filter out Next.js's empty
    // route-announcer alert.
    await expect(
      page.getByRole("alert").filter({ hasText: /\S/ }).first(),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole("heading", { name: /start with your address/i }),
    ).toBeVisible();
    expect(page.url()).not.toMatch(/nowhere|zzyzx|[?&]q=/i);
  });
});
