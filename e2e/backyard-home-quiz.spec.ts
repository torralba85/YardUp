import { expect, test } from "@playwright/test";
import { SAMPLE_LIVE_PARCEL } from "../test/fixtures/live-parcel";

test.describe("/can-i-build-a-backyard-home", () => {
  test("renders cleanly with zero horizontal overflow across viewports", async ({
    page,
    request,
  }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    const html = await (await request.get("/can-i-build-a-backyard-home")).text();
    expect(html).toContain(
      '<link rel="canonical" href="https://lotfoundry.net/can-i-build-a-backyard-home"/>',
    );
    expect(html).toContain("Can I build a backyard home?");
    expect(html).toContain("What are the ADU rules in San Diego?");
    expect(html).toContain("How much does an ADU cost in California?");

    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/can-i-build-a-backyard-home", {
        waitUntil: "domcontentloaded",
      });
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: "Can I build a backyard home?",
        }),
      ).toBeVisible();
      const fitsViewport = await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      );
      expect(fitsViewport, `scrollWidth <= innerWidth at ${width}px`).toBe(
        true,
      );
      if (width === 390 || width === 1440) {
        await page.screenshot({
          path: testInfo.outputPath(`backyard-home-${width}.png`),
        });
      }
    }

    expect(errors).toEqual([]);
  });

  test("completes the 5-step yes/no quiz, renders inline lot answer, and hands off parcel to /studio without leaking address in URL", async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.route("**/api/geocode?**", (route) =>
      route.fulfill({
        json: {
          lat: SAMPLE_LIVE_PARCEL.lat,
          lng: SAMPLE_LIVE_PARCEL.lng,
          formattedAddress: `${SAMPLE_LIVE_PARCEL.address}, ${SAMPLE_LIVE_PARCEL.city}`,
        },
      }),
    );
    await page.route("**/api/parcel?**", (route) =>
      route.fulfill({ json: { ...SAMPLE_LIVE_PARCEL, source: "county-gis" } }),
    );

    await page.goto("/can-i-build-a-backyard-home", {
      waitUntil: "domcontentloaded",
    });

    await page.getByRole("button", { name: /Yes, residential lot/i }).click();
    await page.getByRole("button", { name: /Yes, open yard space/i }).click();
    await page.getByRole("button", { name: /Yes, clearance looks open/i }).click();
    await page.getByRole("button", { name: /Yes, flat and clear/i }).click();
    await page.getByRole("button", { name: /Yes, housing or family/i }).click();

    await expect(page.getByText("Likely eligible")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Explore sample 600 sq ft lot/i }),
    ).toHaveAttribute("href", "/studio?parcel=coyote-brush&size=600");

    await page.screenshot({
      path: testInfo.outputPath("backyard-home-quiz-result.png"),
    });

    await page
      .getByLabel(/Check your exact address in the 3D studio/i)
      .fill(`${SAMPLE_LIVE_PARCEL.address}, ${SAMPLE_LIVE_PARCEL.city}`);
    await page.getByRole("button", { name: /Check my lot/i }).click();

    const answer = page.getByRole("region", {
      name: "Inline lot feasibility answer",
    });
    await expect(answer).toBeVisible();
    await expect(answer).toContainText(SAMPLE_LIVE_PARCEL.address);
    await answer.getByRole("button", { name: "Open in 3D" }).click();

    await expect(page).toHaveURL(/\/studio(?:\?|$)/, { timeout: 15000 });
    expect(page.url()).not.toContain("Cedar");
    expect(errors).toEqual([]);
  });

  test("tight-yard quiz branch recommends 400 sq ft and opens sample lot in /studio", async ({
    page,
  }) => {
    await page.goto("/can-i-build-a-backyard-home", {
      waitUntil: "domcontentloaded",
    });

    await page.getByRole("button", { name: /Yes, residential lot/i }).click();
    await page.getByRole("button", { name: /No, yard is tight/i }).click();
    await page.getByRole("button", { name: /Yes, clearance looks open/i }).click();
    await page.getByRole("button", { name: /Yes, flat and clear/i }).click();
    await page.getByRole("button", { name: /Yes, housing or family/i }).click();

    await expect(page.getByText("Needs parcel check")).toBeVisible();
    const sampleLink = page.getByRole("link", {
      name: /Explore sample 400 sq ft lot/i,
    });
    await expect(sampleLink).toHaveAttribute(
      "href",
      "/studio?parcel=coyote-brush&size=400",
    );
    await sampleLink.click();

    await expect(page).toHaveURL(/\/studio.*parcel=coyote-brush.*size=400/, {
      timeout: 15000,
    });
  });
});
