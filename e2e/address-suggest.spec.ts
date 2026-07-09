import { expect, test } from "@playwright/test";

const productionBaseURL =
  process.env.LOTFOUNDRY_E2E_PRODUCTION_URL ?? "https://yardup-2026.web.app";

test.describe("address suggestions", () => {
  test("production /api/suggest returns live address suggestions", async ({
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "API smoke only needs one project");
    test.skip(
      process.env.LOTFOUNDRY_E2E_LIVE_SUGGEST !== "1",
      "Set LOTFOUNDRY_E2E_LIVE_SUGGEST=1 to hit production /api/suggest",
    );

    const url = new URL("/api/suggest", productionBaseURL);
    url.searchParams.set("q", "1600 Pennsylvania Ave");

    const response = await request.get(url.toString());
    const bodyText = await response.text();
    expect(response.status(), bodyText).toBe(200);

    const body = JSON.parse(bodyText) as { suggestions?: unknown };
    const suggestions = Array.isArray(body.suggestions) ? body.suggestions : [];
    expect(suggestions.length, bodyText).toBeGreaterThan(0);
    expect(suggestions.length, bodyText).toBeLessThanOrEqual(5);
    expect(suggestions.join(" "), bodyText).toMatch(/Pennsylvania|Washington|DC/i);
  });

  test("local address search falls back to server suggestions", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "desktop rail has the stable search");

    const suggestion = "1600 Pennsylvania Avenue NW, Washington, DC, USA";
    const suggestRequests: string[] = [];

    // Aborting the Places bootstrap fails @googlemaps/js-api-loader's
    // `script.onerror`, which rejects `importLibrary("places")`. AddressSearch
    // catches that, sets `googleFailed`, and hands autocomplete to `/api/suggest`
    // — the path we assert here — even when a real NEXT_PUBLIC_GOOGLE_PLACES_KEY
    // is configured (`hasPlacesKey === true`). The loader (v2.0.2) rejects
    // immediately with no retry; the generous timeout below absorbs the delay if
    // a future loader ever retries script loads with backoff.
    await page.route("https://maps.googleapis.com/**", (route) => route.abort());
    await page.route("https://maps.gstatic.com/**", (route) => route.abort());
    await page.route("**/api/suggest**", async (route) => {
      suggestRequests.push(route.request().url());
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ suggestions: [suggestion] }),
      });
    });

    await page.goto("/studio");
    await expect(page.getByRole("navigation", { name: "Studio steps" })).toBeVisible();

    await page.getByLabel("Search property address").fill("1600 Pennsylvania Ave");

    await expect(page.getByRole("option", { name: suggestion })).toBeVisible({
      timeout: 15_000,
    });
    expect(suggestRequests.some((url) => url.includes("/api/suggest"))).toBe(true);
  });
});
