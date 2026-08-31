import { expect, test } from "@playwright/test";

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
    test.skip(!(await analyticsConfigured(page)), "no measurement ID in this build");

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
    test.skip(!(await analyticsConfigured(page)), "no measurement ID in this build");

    await page.getByRole("button", { name: /decline/i }).click();
    await expect(page.getByRole("region", { name: banner })).toHaveCount(0);

    // A refusal has to survive a reload, or the banner nags on every page.
    await page.reload();
    await expect(page.getByRole("region", { name: banner })).toHaveCount(0);
    expect(googleRequests).toEqual([]);
  });

  test("accepting loads gtag.js for the configured property", async ({ page }) => {
    await page.goto("/");
    test.skip(!(await analyticsConfigured(page)), "no measurement ID in this build");

    const gtagRequest = page.waitForRequest((request) =>
      request.url().includes("googletagmanager.com/gtag/js"),
    );
    await page.getByRole("button", { name: /^accept$/i }).click();

    await expect(page.getByRole("region", { name: banner })).toHaveCount(0);
    expect((await gtagRequest).url()).toContain("gtag/js?id=G-");
    await expect
      .poll(() => page.evaluate(() => typeof window.gtag))
      .toBe("function");
  });

  test("the privacy page can turn analytics back off", async ({ page }) => {
    await page.goto("/");
    test.skip(!(await analyticsConfigured(page)), "no measurement ID in this build");

    await page.getByRole("button", { name: /^accept$/i }).click();
    await page.goto("/privacy");

    await page.getByRole("button", { name: /turn off analytics/i }).click();
    await expect(page.getByText(/analytics cookies are off/i)).toBeVisible();
    // Withdrawal must actually clear the identifier, not just stop new hits.
    const cookies = await page.context().cookies();
    expect(cookies.filter((cookie) => cookie.name.startsWith("_ga"))).toEqual([]);
  });
});
