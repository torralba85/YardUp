import { devices, expect, test } from "@playwright/test";

/**
 * Consent gating for Google Analytics.
 *
 * These specs skip unless the build under test has a measurement ID: without
 * one the tag and the banner are both absent by design, so there is nothing to
 * assert.
 *
 * As CI stands they always skip — the `verify` job runs a bare `npm run build`
 * and only `deploy` writes `NEXT_PUBLIC_GA_MEASUREMENT_ID`, so the banner never
 * renders in the Playwright run (which is also why it cannot overlay and break
 * the other specs). To exercise them, build with the ID set:
 *
 * ```bash
 * NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX npm run build
 * NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX npm run start -- -p 3000
 * npx playwright test e2e/analytics-consent.spec.ts
 * ```
 *
 * If the ID is ever added to the `verify` job, these specs start running and
 * the other specs need a consent decision seeded before navigation.
 */

const banner = /cookie consent/i;

/**
 * True when this build shipped a measurement ID (and therefore a banner).
 *
 * Waits rather than counting immediately: the banner is client-rendered after
 * hydration (consent lives in `localStorage`, which SSR cannot read), so an
 * instant `count()` races the hydration pass and reports a configured build as
 * unconfigured. A timeout here means genuinely no measurement ID.
 */
async function analyticsConfigured(page: import("@playwright/test").Page) {
  try {
    await page.getByRole("region", { name: banner }).waitFor({
      state: "visible",
      timeout: 5_000,
    });
    return true;
  } catch {
    return false;
  }
}

let analyticsEnabled: boolean | null = null;

// Production suppresses all measurement in WebDriver sessions so canaries and
// agent checks stay out of GA4. Probe once per worker so unconfigured CI builds
// skip tests 2..N immediately instead of waiting 5 seconds per test.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "webdriver", {
      configurable: true,
      get: () => false,
    });
  });
  // Keep automated verification traffic out of production GA4 while still
  // loading gtag.js and exercising real outgoing /g/collect hits.
  await page.route("**/g/collect**", (route) => route.fulfill({ status: 204, body: "" }));
  if (analyticsEnabled === null) {
    await page.goto("/");
    analyticsEnabled = await analyticsConfigured(page);
  }
  test.skip(!analyticsEnabled, "no measurement ID in this build");
});

test.describe("analytics consent", () => {

  test("sends nothing to Google before the visitor decides", async ({ page }) => {
    const googleRequests: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (url.includes("googletagmanager.com") || url.includes("google-analytics.com")) {
        googleRequests.push(url);
      }
    });

    await page.goto("/");

    await expect(page.getByRole("region", { name: banner })).toBeVisible();
    // The whole point of opt-in: an undecided visitor is not measured.
    expect(googleRequests).toEqual([]);
  });

  test("declining dismisses the banner and still loads no tag", async ({ page }) => {
    const googleRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("googletagmanager.com")) googleRequests.push(request.url());
    });

    await page.goto("/");

    await page.getByRole("button", { name: /decline/i }).click();
    await expect(page.getByRole("region", { name: banner })).toHaveCount(0);

    // A refusal has to survive a reload, or the banner nags on every page.
    await page.reload();
    await expect(page.getByRole("region", { name: banner })).toHaveCount(0);
    expect(googleRequests).toEqual([]);
  });

  test("accepting loads gtag.js for the configured property", async ({ page }) => {
    await page.goto("/");

    const gtagRequest = page.waitForRequest((request) =>
      request.url().includes("googletagmanager.com/gtag/js"),
    );
    await page.getByRole("button", { name: /^accept$/i }).click();

    await expect(page.getByRole("region", { name: banner })).toHaveCount(0);
    expect((await gtagRequest).url()).toContain("gtag/js?id=G-");
    await expect
      .poll(() => page.evaluate(() => typeof window.gtag))
      .toBe("function");
    const initialConsent = await page.evaluate(() =>
      (window.dataLayer ?? [])
        .map((entry) => Array.from(entry as ArrayLike<unknown>))
        .find((entry) => entry[0] === "consent" && entry[1] === "default")?.[2],
    );
    expect(initialConsent).toMatchObject({
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "denied",
      analytics_storage: "granted",
    });
  });

  test("records one sanitized page_view on initial load and on client-side navigation", async ({ page }) => {
    const collectRequests: { en: string | null; dl: string | null; dp: string | null; dt: string | null; tid: string | null }[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (!url.includes("/g/collect")) return;
      const parsed = new URL(url);
      collectRequests.push({
        en: parsed.searchParams.get("en"),
        dl: parsed.searchParams.get("dl"),
        dp: parsed.searchParams.get("dp"),
        dt: parsed.searchParams.get("dt"),
        tid: parsed.searchParams.get("tid"),
      });
    });

    await page.goto("/?q=123+Secret+Main+St&email=test@example.com");
    await page.getByRole("button", { name: /^accept$/i }).click();

    await expect
      .poll(async () =>
        page.evaluate(() =>
          (window.dataLayer ?? [])
            .map((entry) => Array.from(entry as ArrayLike<unknown>))
            .filter((entry) => entry[0] === "event" && entry[1] === "page_view")
            .map((entry) => entry[2] as Record<string, unknown>),
        ),
      )
      .toHaveLength(1);

    const initialViews = await page.evaluate(() =>
      (window.dataLayer ?? [])
        .map((entry) => Array.from(entry as ArrayLike<unknown>))
        .filter((entry) => entry[0] === "event" && entry[1] === "page_view")
        .map((entry) => entry[2] as Record<string, unknown>),
    );
    expect(initialViews[0]).toMatchObject({
      page_path: "/",
      page_location: expect.stringMatching(/\/$/),
    });
    expect(JSON.stringify(initialViews[0])).not.toMatch(/Secret|Main|test@example\.com/);

    // Client-side SPA navigation should emit exactly one additional sanitized page_view.
    await page.locator('a[href="/about"]').first().click();
    await page.waitForURL("**/about");

    await expect
      .poll(async () =>
        page.evaluate(() =>
          (window.dataLayer ?? [])
            .map((entry) => Array.from(entry as ArrayLike<unknown>))
            .filter((entry) => entry[0] === "event" && entry[1] === "page_view")
            .map((entry) => entry[2] as Record<string, unknown>),
        ),
      )
      .toHaveLength(2);

    const allViews = await page.evaluate(() =>
      (window.dataLayer ?? [])
        .map((entry) => Array.from(entry as ArrayLike<unknown>))
        .filter((entry) => entry[0] === "event" && entry[1] === "page_view")
        .map((entry) => entry[2] as Record<string, unknown>),
    );
    expect(allViews[1]).toMatchObject({
      page_path: "/about",
      page_location: expect.stringMatching(/\/about$/),
    });
    expect(String(allViews[1].page_title ?? "").trim().length).toBeGreaterThan(0);

    await expect
      .poll(() => collectRequests.filter((r) => r.en === "page_view").length)
      .toBeGreaterThanOrEqual(2);
    for (const hit of collectRequests) {
      expect(hit.dl ?? "").not.toMatch(/Secret|Main|test@example\.com/);
    }
  });

  test("the privacy page can turn analytics back off", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /^accept$/i }).click();
    await page.goto("/privacy");

    await page.getByRole("button", { name: /turn off measurement/i }).click();
    await expect(page.getByText(/analytics and ads measurement cookies are off/i)).toBeVisible();
    const consentUpdates = await page.evaluate(() =>
      (window.dataLayer ?? [])
        .map((entry) => Array.from(entry as ArrayLike<unknown>))
        .filter((entry) => entry[0] === "consent" && entry[1] === "update")
        .map((entry) => entry[2]),
    );
    expect(consentUpdates.at(-1)).toMatchObject({
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
    });
    expect(await page.evaluate(() => (window as unknown as Record<string, boolean>)["ga-disable-AW-18350405574"])).toBe(true);
    // Withdrawal must actually clear the identifier, not just stop new hits.
    const cookies = await page.context().cookies();
    expect(cookies.filter((cookie) => cookie.name.startsWith("_ga") || cookie.name.startsWith("_gcl_") || cookie.name.startsWith("_gac_"))).toEqual([]);
  });
});

test.describe("phone banner layout", () => {
  // Not `...devices["iPhone 13"]`: that carries `defaultBrowserType: "webkit"`,
  // which Playwright rejects inside a describe group.
  test.use({ viewport: devices["iPhone 13"].viewport, isMobile: true, hasTouch: true });

  for (const viewport of [{ width: 390, height: 844 }, { width: 390, height: 664 }, { width: 320, height: 568 }]) {
    test(`the ${viewport.width}x${viewport.height} banner leaves the hero address field visible`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/");

      const consentBanner = page.getByRole("region", { name: banner });
      await expect(consentBanner).toBeVisible();

      const bannerBox = await consentBanner.boundingBox();
      expect(bannerBox).not.toBeNull();

      const submitButton = page
        .locator("#hero-address")
        .locator("xpath=ancestor::form")
        .getByRole("button", { name: /explore my lot/i });
      await expect(submitButton).toBeVisible();

      const submitBox = await submitButton.boundingBox();
      expect(submitBox).not.toBeNull();

      expect(bannerBox!.y).toBeGreaterThanOrEqual(submitBox!.y + submitBox!.height);
  });
  }
});
