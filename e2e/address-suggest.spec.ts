import { expect, test } from "@playwright/test";

const productionBaseURL =
  process.env.LOTFOUNDRY_E2E_PRODUCTION_URL ?? "https://lotfoundry.net";

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

  test("guest address search never spends suggestion quota", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "desktop rail has the stable search");

    // Address suggestions (browser Places or /api/suggest) cost metered API
    // quota, so signed-out visitors get neither source: typing must fire no
    // suggest requests and the input must carry the sign-in note instead.
    // The signed-in googleFailed → /api/suggest fallback wiring is covered by
    // the AddressSearch unit tests.
    const suggestRequests: string[] = [];

    // Keep the run hermetic: never load real Google Maps JS.
    await page.route("https://maps.googleapis.com/**", (route) => route.abort());
    await page.route("https://maps.gstatic.com/**", (route) => route.abort());
    await page.route("**/api/suggest**", async (route) => {
      suggestRequests.push(route.request().url());
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ suggestions: ["1600 Pennsylvania Avenue NW, Washington, DC, USA"] }),
      });
    });

    await page.goto("/studio", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("navigation", { name: "Studio steps" })).toBeVisible();

    const search = page.getByLabel("Search property address");
    await search.fill("1600 Pennsylvania Ave");

    // Guests get no dropdown (it would spend metered quota), but they are
    // pointed at the free-text Search button rather than an account wall.
    await expect(
      page.getByText("Type a full address (street, city, state) and press Search.").first(),
    ).toBeVisible();
    // Wait out the 300ms suggestion debounce before asserting nothing fired.
    await page.waitForTimeout(800);
    expect(suggestRequests).toHaveLength(0);
    await expect(page.getByRole("option")).toHaveCount(0);
  });
});
