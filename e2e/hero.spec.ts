import { expect, test } from "@playwright/test";

import { SAMPLE_LIVE_PARCEL } from "../test/fixtures/live-parcel";

test.describe("A lot more landing", () => {
  test("an expired member hint still opens the guest's real property", async ({ page, isMobile }) => {
    test.setTimeout(60_000);
    await page.addInitScript(() => {
      if (window.top === window) window.localStorage.setItem("lf:member-session", "1");
    });
    let guestGeocode = false;
    let guestParcel = false;
    let geocodeCount = 0;
    let parcelCount = 0;
    await page.route("**/api/geocode?**", (route) => {
      geocodeCount += 1;
      guestGeocode = !route.request().headers().authorization;
      return route.fulfill({ json: {
        lat: SAMPLE_LIVE_PARCEL.lat,
        lng: SAMPLE_LIVE_PARCEL.lng,
        formattedAddress: `${SAMPLE_LIVE_PARCEL.address}, ${SAMPLE_LIVE_PARCEL.city}`,
      } });
    });
    await page.route("**/api/parcel?**", (route) => {
      parcelCount += 1;
      guestParcel = !route.request().headers().authorization;
      return route.fulfill({ json: { ...SAMPLE_LIVE_PARCEL, source: "county-gis" } });
    });
    await page.goto("/");
    await page.locator("#hero-address").fill(`${SAMPLE_LIVE_PARCEL.address}, ${SAMPLE_LIVE_PARCEL.city}`);
    await page.getByRole("region", { name: "Explore your lot", exact: true })
      .getByRole("button", { name: "Check my lot" }).click();

    const answer = page.getByRole("region", { name: "Inline lot feasibility answer" });
    await expect(answer).toBeVisible();
    await expect(answer).toContainText(SAMPLE_LIVE_PARCEL.address);
    await expect.poll(() => guestGeocode).toBe(true);
    await expect.poll(() => guestParcel).toBe(true);

    await answer.getByRole("link", { name: "Open in 3D" }).click();
    await expect(page).toHaveURL(/\/studio/);
    await expect(page.getByText(SAMPLE_LIVE_PARCEL.address, { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    // Studio consumes the stashed parcel without re-fetching geocode or parcel.
    expect(geocodeCount).toBe(1);
    expect(parcelCount).toBe(1);
    const search = new URL(page.url()).searchParams;
    expect(Array.from(search.values()).join(" ")).not.toContain(SAMPLE_LIVE_PARCEL.address);
    expect(search.has("q")).toBe(false);
    if (isMobile) {
      // Analytics-enabled builds retain the visitor's unanswered consent
      // banner across this handoff. Resolve it before using the Studio footer.
      const consent = page.getByRole("region", { name: "Cookie consent" });
      if (await consent.isVisible()) await consent.getByRole("button", { name: "Decline" }).click();
      await page.getByRole("button", { name: "Shape your ADU" }).click();
    }
    await expect(page.locator("canvas").first()).toBeVisible({ timeout: 15_000 });
  });

  test("keeps address entry private and preserves it between the two forms", async ({
    page,
  }) => {
    const suggestRequests: string[] = [];
    page.on("request", (request) => {
      if (/\/api\/suggest/.test(request.url())) suggestRequests.push(request.url());
    });
    await page.goto("/");
    const hero = page.getByRole("region", {
      name: "Explore your lot",
      exact: true,
    });
    await hero.getByRole("button", { name: "Check my lot" }).click();
    await expect(hero.getByRole("alert")).toHaveText(
      "Enter an address to explore your lot.",
    );
    await expect(
      hero.getByLabel("Property address", { exact: true }),
    ).toBeFocused();
    await hero
      .getByLabel("Property address", { exact: true })
      .fill("456 Pine St, Denver, CO");
    await expect(page.locator("#closing-address")).toHaveValue(
      "456 Pine St, Denver, CO",
    );
    await page
      .locator('[aria-labelledby="closing-title"]')
      .getByRole("button", { name: "Check my lot" })
      .click();

    // A first-time visitor reaches the studio without an account prompt; the
    // address rides session storage, never the URL, so it stays out of
    // history, the Referer header, and analytics.
    await page.waitForURL(/\/studio/, { timeout: 15000 });
    expect(page.url()).not.toMatch(/456|Pine|Denver|[?&]q=/i);
    // The landing itself must never spend metered suggestion quota.
    expect(suggestRequests).toEqual([]);
  });

  test("asks a visitor who already used their free lookups to sign in", async ({
    page,
  }) => {
    await page.goto("/");
    // Spend the 3-lookup anonymous allowance, as a return visit would have.
    await page.evaluate(() => window.localStorage.setItem("lf:guest-lookups", "3"));
    await page.reload();

    const hero = page.getByRole("region", {
      name: "Explore your lot",
      exact: true,
    });
    await hero
      .getByLabel("Property address", { exact: true })
      .fill("456 Pine St, Denver, CO");
    await hero.getByRole("button", { name: "Check my lot" }).click();

    const dialog = page
      .getByRole("dialog")
      .filter({ hasText: /sign in|sign up|create account/i });
    await expect(dialog).toBeVisible({ timeout: 15000 });
    expect(page.url()).not.toMatch(/456|Pine|Denver|[?&]q=/i);
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(
      hero.getByRole("button", { name: "Check my lot" }),
    ).toBeFocused();
    await expect(
      hero.getByLabel("Property address", { exact: true }),
    ).toHaveValue("456 Pine St, Denver, CO");
  });

  test("transforms the example using keyboard controls, including reduced motion", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const controls = page.getByRole("radiogroup", {
      name: "Property illustration view",
    });
    await controls.getByRole("radio", { checked: true }).focus();
    // Both parcel layers keep fixed alt text; the live figcaption names the scene.
    const sceneCaption = page.locator("figcaption span[aria-live]");
    await page.keyboard.press("Home");
    await expect(sceneCaption).toHaveText("Existing yard");
    await expect(
      controls.getByRole("radio", { name: /Today/ }),
    ).toBeChecked();
    await page.keyboard.press("ArrowRight");
    await expect(sceneCaption).toHaveText("Illustrative footprint");
    await page.keyboard.press("ArrowRight");
    await expect(sceneCaption).toHaveText("Backyard home concept");
    await expect(
      controls.getByRole("radio", { name: /The possibility/ }),
    ).toBeChecked();
    await expect(page.locator("canvas, video")).toHaveCount(0);
  });

  test("updates income and payback together while keeping demo context visible", async ({
    page,
  }) => {
    await page.goto("/");
    const numbers = page.locator("#numbers");
    // The landing opens on the market case, matching the hero and the Studio sample link.
    await expect(numbers.getByText("$2,615/mo", { exact: true })).toBeVisible();
    await expect(numbers.getByText("11.9", { exact: false })).toBeVisible();
    await expect(numbers.getByText(/COYOTE BRUSH COURT DEMO, SAN DIEGO/)).toBeVisible();
    await numbers.locator("summary").click();
    await expect(
      numbers.getByText(
        /curated Coyote Brush Court demo in San Diego, calculated by the Studio engine/i,
      ),
    ).toBeVisible();
    await expect(
      numbers.getByText(/annual net operating income is \$21,182/),
    ).toBeVisible();
    await numbers.getByRole("radio", { name: "conservative", exact: true }).click();
    await expect(numbers.getByText("$2,335/mo", { exact: true })).toBeVisible();
    await expect(numbers.getByText("13.3", { exact: false })).toBeVisible();
  });

  test("supports intent selection, report inspection, and honest purchase copy", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("radio", { name: "For income", exact: true }).click();
    await expect(
      page.getByText("Explore what a small home could earn, and what it might take to bring it to life."),
    ).toBeVisible();
    await page
      .getByRole("radio", { name: "The estimates", exact: true })
      .click();
    const report = page.getByRole("article", {
      name: "Sample feasibility report",
    });
    // The sample report follows the selected rent case, which starts on market.
    await expect(report.getByText("$2,615", { exact: true })).toBeVisible();
    await page.getByRole("radio", { name: "Next steps", exact: true }).click();
    await expect(report.getByText(/Confirm property boundaries/)).toBeVisible();
    await expect(
      page.getByText("The complete Certificate is an optional one-time purchase. Review it in the Studio before checkout."),
    ).toBeVisible();
    await page
      .getByText("Does this mean I can build?", { exact: true })
      .click();
    await expect(
      page.getByText(
        /It does not grant a permit or guarantee a buildable design/,
      ),
    ).toBeVisible();
  });

  test("does not load Firebase or metered APIs on initial render", async ({
    page,
  }) => {
    const requests: string[] = [];
    page.on("request", (request) => {
      if (
        /firebase|firestore|identitytoolkit|\/api\/(suggest|parcel|geocode)/i.test(
          request.url(),
        )
      )
        requests.push(request.url());
    });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Explore an ADU on your lot in 3D." }),
    ).toBeVisible();
    await expect(page.locator("#hero-address")).toBeVisible();
    expect(requests).toEqual([]);
  });

  test("mobile navigation closes on Escape and restores focus", async ({
    page,
    viewport,
  }) => {
    test.skip(!viewport || viewport.width > 800, "mobile navigation only");
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    const menu = page.getByRole("navigation", { name: "Mobile navigation" });
    await menu.getByRole("link", { name: "ADU guides", exact: true }).focus();
    await page.keyboard.press("Escape");
    await expect(menu).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
  });
});
