import { devices, expect, test } from "@playwright/test";

const banner = /cookie consent/i;
const denied = {
  analytics_storage: "denied",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
};

function commands(page: import("@playwright/test").Page): Promise<unknown[][]> {
  return page.evaluate(() =>
    (window.dataLayer ?? []).map((entry) => Array.from(entry as ArrayLike<unknown>)),
  );
}

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
  // Verify commands and tag-load timing without sending synthetic traffic.
  await page.route("https://www.googletagmanager.com/gtag/js?**", (route) =>
    route.fulfill({ contentType: "application/javascript", body: "" }),
  );
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "webdriver", {
      configurable: true,
      get: () => false,
    });
  });
  // Keep automated verification traffic out of production GA4 while still
  // loading gtag.js and exercising real outgoing /g/collect hits.
  await page.route("**/g/collect**", (route) => route.fulfill({ status: 204, body: "" }));
  await page.route(/googleadservices\.com|doubleclick\.net|google\.com\/(?:pagead|ccm)\//, (route) => route.abort());
  if (analyticsEnabled === null) {
    await page.goto("/");
    analyticsEnabled = await analyticsConfigured(page);
  }
  test.skip(!analyticsEnabled, "no measurement ID in this build");
});

test.describe("analytics consent", () => {

  test("loads GA4 with denied storage before a decision and keeps Ads off", async ({ page }) => {
    const loader = page.waitForRequest("https://www.googletagmanager.com/gtag/js?**");
    await page.goto("/");
    expect((await loader).url()).toContain("gtag/js?id=G-");
    await expect(page.getByRole("region", { name: banner })).toBeVisible();
    await expect.poll(async () => (await commands(page)).some(([type, name]) => type === "event" && name === "page_view")).toBe(true);
    const initial = await commands(page);
    expect(initial[0]).toEqual(["consent", "default", denied]);
    expect(initial.filter(([type]) => type === "config").map((entry) => entry[1]))
      .toEqual([expect.stringMatching(/^G-/)]);
    expect((await page.context().cookies()).filter((cookie) => /^_(ga|gcl|gac)/.test(cookie.name))).toEqual([]);
  });

  test("declining persists and keeps storage denied after reload", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /decline/i }).click();
    await page.reload();
    await expect(page.getByRole("region", { name: banner })).toHaveCount(0);
    await expect.poll(async () => (await commands(page))[0]).toEqual(["consent", "default", denied]);
    expect((await commands(page)).some(([type, id]) => type === "config" && String(id).startsWith("AW-"))).toBe(false);
  });

  test("accepting grants cookies and initializes the Ads destination", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^accept$/i }).click();
    await expect(page.getByRole("region", { name: banner })).toHaveCount(0);
    await expect.poll(() => commands(page)).toEqual(expect.arrayContaining([
      ["consent", "update", { ...denied, analytics_storage: "granted", ad_storage: "granted", ad_user_data: "granted" }],
      ["config", expect.stringMatching(/^AW-/), expect.objectContaining({ send_page_view: false })],
    ]));
  });

  test("records one sanitized page_view on initial load and on client-side navigation", async ({ page, isMobile }) => {
    await page.unroute("https://www.googletagmanager.com/gtag/js?**");
    const collectRequests: { en: string | null; dl: string | null; dp: string | null; dt: string | null; tid: string | null; gcs: string | null }[] = [];
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
        gcs: parsed.searchParams.get("gcs"),
      });
    });

    await page.goto("/?q=123+Secret+Main+St&email=test@example.com");
    await expect.poll(() => collectRequests.find((hit) => hit.en === "page_view")?.gcs).toBe("G100");
    expect((await page.context().cookies()).filter((cookie) => /^_(ga|gcl|gac)/.test(cookie.name))).toEqual([]);
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
    if (isMobile) await page.getByRole("button", { name: "Open menu", exact: true }).click();
    await page.getByRole("link", { name: "About", exact: true }).filter({ visible: true }).first().click();
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
    await page.evaluate(() => { document.cookie = "_ga=temporary; path=/"; });

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
        .getByRole("button", { name: "Check my lot" });
      await expect(submitButton).toBeVisible();

      const submitBox = await submitButton.boundingBox();
      expect(submitBox).not.toBeNull();

      expect(bannerBox!.y).toBeGreaterThanOrEqual(submitBox!.y + submitBox!.height);
  });
  }
});
