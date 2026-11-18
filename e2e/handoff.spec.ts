import { expect, test } from "@playwright/test";

// An address no geocoder resolves: with live keys the search returns zero
// results; without keys the API reports missing configuration. Either way the
// studio surfaces its role="alert" banner — proof the handed-off search ran —
// and withholds demo figures until the visitor chooses to explore the demo lot.
const UNRESOLVABLE_ADDRESS = "0 Nowhere Lane, Zzyzx Flats, ZZ 00000";

/** Session-storage key the hero writes and the studio consumes once on mount. */
const ADDRESS_HANDOFF_KEY = "lf:pending-address";

/**
 * Seed the handoff the way the hero does, then open the studio.
 *
 * These tests are about the *studio* side of the seam: that it picks the
 * stashed address up, runs the search, and keeps the money moment on screen.
 * Driving them through the hero would now require completing a real sign-in
 * (`a1d7529` gates address handoff on auth), which CI cannot do — generic
 * Playwright runs must not create accounts in the production Firebase project.
 * The landing-side half of the seam is covered as a guest in `hero.spec.ts`.
 */
async function handOffAddress(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.evaluate(
    ([key, address]) => window.sessionStorage.setItem(key, address),
    [ADDRESS_HANDOFF_KEY, UNRESOLVABLE_ADDRESS] as const,
  );
  await page.goto("/studio");
}

test.describe("landing → studio handoff", () => {
  test("desktop: the searched address runs and the money moment survives", async ({
    page,
    viewport,
  }) => {
    test.skip(!viewport || viewport.width < 1024, "desktop-only");
    await handOffAddress(page);

    await expect(page).toHaveURL(/\/studio/);
    // Wait for the dawn arrival plate (Firebase auth resolution) before
    // timing the handed-off geocode request, matching the mobile test below.
    await expect(
      page.getByRole("complementary", { name: "Studio navigation" }),
    ).toBeVisible({ timeout: 15000 });
    const preview = page.getByRole("region", { name: "Free property preview" });
    // The handed-off search ran and failed for this unresolvable address
    // (15s absorbs the geocode round trip; the banner surfaces with or without
    // keys). Filter to the alert that carries text: Next.js's route announcer
    // is also role="alert" and, once a route sets a title, carries that title
    // as text too, so take the first match like the mobile case below.
    await expect(
      page.getByRole("alert").filter({ hasText: /\S/ }).first(),
    ).toBeVisible({ timeout: 15000 });
    // Failed lookups withhold demo figures until the visitor explicitly opts in.
    await expect(preview).toHaveCount(0);
    // Privacy: the typed address never reaches the URL.
    expect(page.url()).not.toMatch(/nowhere|zzyzx|[?&]q=/i);

    // Explicit demo recovery restores the free property preview and rent range.
    await page.getByRole("button", { name: "Explore demo lot" }).click();
    await expect(preview).toBeVisible();
    await expect(preview).toContainText("Estimated monthly rent");
    // Build cost, net income, payback and financed cash flow stay locked; the
    // rent range is free.
    await expect(preview.locator('[data-locked-metric="true"]')).toHaveCount(4);
  });

  test("mobile: the journey absorbs the handed-off address", async ({
    page,
    viewport,
  }) => {
    test.skip(!viewport || viewport.width >= 1024, "mobile-only");
    await handOffAddress(page);

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
