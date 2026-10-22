import { expect, test } from "@playwright/test";

test.describe("mobile studio journey", () => {
  test.skip(({ viewport }) => !viewport || viewport.width >= 1024, "mobile-only suite");

  test("golden path: five reveals from find to act", async ({ page }) => {
    await page.goto("/studio");

    // Reveal 1 · Find — the journey replaces the old sheet composition.
    await expect(page.getByTestId("mobile-journey")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Journey progress" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /start with your address/i }),
    ).toBeVisible();
    // A demo lot is preselected; the single primary action reveals the payoff.
    await page.getByRole("button", { name: /reveal my backyard/i }).click();

    // Reveal 2 · Earn — the money figure appears immediately with a
    // confidence teaser citing the market basis.
    await expect(
      page.getByRole("heading", { name: /your backyard could earn/i }),
    ).toBeVisible();
    await expect(page.getByTestId("earn-confidence")).toBeVisible();
    await page.getByRole("button", { name: /shape your adu/i }).click();

    // Reveal 3 · Shape — broad size/style directions only by default.
    await page.getByRole("radio", { name: /2 bedroom/i }).click();
    await page.getByRole("radio", { name: /stucco/i }).click();
    await page.getByRole("button", { name: /check feasibility/i }).click();
    await expect(page.getByRole("main")).toBeFocused();
    await expect.poll(() => page.getByRole("main").evaluate((el) => el.scrollTop)).toBe(0);

    // Reveal 4 · Check — the plain-language verdict leads, then the
    // verification items follow it.
    await expect(page.getByRole("region", { name: "Free property preview" })).toBeVisible();
    await page.getByRole("button", { name: /See what’s behind the numbers/i }).click();

    // Reveal 5 · Act — completion artifact plus the two next actions.
    await expect(
      page.getByRole("heading", { name: /your feasibility study is ready/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /connect with matched builders/i }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /save scenario/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /share link/i })).toBeVisible();
  });

  test("progress targets stay labeled and at least 44px at narrow widths", async ({ page }) => {
    await page.goto("/studio");
    for (const width of [320, 390, 440, 768]) {
      await page.setViewportSize({ width, height: 844 });
      const rail = page.getByRole("navigation", { name: "Journey progress" });
      const buttons = rail.locator("ol button");
      await expect(buttons).toHaveCount(5);
      for (const button of await buttons.all()) {
        const box = await button.boundingBox();
        expect(box?.width).toBeGreaterThanOrEqual(44);
        expect(box?.height).toBeGreaterThanOrEqual(44);
      }
      await expect(rail.getByText("Find", { exact: true })).toBeVisible();
      await expect(rail.getByText("Act", { exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  });

  test("fine-tune is optional progressive disclosure on the Shape reveal", async ({ page }) => {
    await page.goto("/studio");
    await page.getByRole("button", { name: /reveal my backyard/i }).click();
    await page.getByRole("button", { name: /shape your adu/i }).click();

    await page.getByRole("button", { name: /fine-tune dimensions/i }).click();
    const drawer = page.getByTestId("fine-tune-drawer");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("button", { name: /close fine-tune panel/i })).toBeFocused();
    await expect(
      drawer.getByRole("heading", { name: /design your adu/i }),
    ).toBeVisible();

    await page.getByRole("button", { name: /close fine-tune panel/i }).click();
    await expect(drawer).toHaveCount(0);
    await expect(page.getByRole("button", { name: /fine-tune dimensions/i })).toBeFocused();
    // A second opening catches stale modal/focus locks after the first close.
    await page.getByRole("button", { name: /fine-tune dimensions/i }).click();
    await expect(drawer).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);
    await expect(page.getByRole("button", { name: /fine-tune dimensions/i })).toBeFocused();
    // Closing the drawer lands back on the Shape reveal's default path.
    await expect(page.getByRole("button", { name: /check feasibility/i })).toBeVisible();
  });

  test("the rail travels back to completed reveals only", async ({ page }) => {
    await page.goto("/studio");
    await page.getByRole("button", { name: /reveal my backyard/i }).click();
    await expect(
      page.getByRole("heading", { name: /your backyard could earn/i }),
    ).toBeVisible();

    // Back chevron returns to Find.
    await page.getByRole("button", { name: /back to previous step/i }).click();
    await expect(
      page.getByRole("heading", { name: /start with your address/i }),
    ).toBeVisible();

    // Forward travel happens only through the step's primary action — the
    // rail's upcoming steps are inert.
    await expect(
      page.getByRole("navigation", { name: "Journey progress" }).getByRole("button", {
        name: /check/i,
      }),
    ).toBeDisabled();
  });

  test("a shared scenario link opens on the money reveal, not onboarding", async ({ page }) => {
    await page.goto("/studio?parcel=corner-lot&size=800&roof=gable&finish=board&rent=market&openings=1");

    // The restored lot's money figure is the first visible state.
    await expect(
      page.getByRole("heading", { name: /your backyard could earn/i }),
    ).toBeVisible();
    await expect(page.getByText("812 Linden Avenue", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /start with your address/i }),
    ).not.toBeVisible();

    // Find stays reachable for choosing a different lot.
    await page.getByRole("button", { name: /back to previous step/i }).click();
    await expect(
      page.getByRole("heading", { name: /start with your address/i }),
    ).toBeVisible();
  });

  test("a default-scenario URL still begins at the Find reveal", async ({ page }) => {
    await page.goto("/studio?parcel=oak-street&size=600&roof=shed&finish=cedar&rent=conservative&openings=1");

    await expect(
      page.getByRole("heading", { name: /start with your address/i }),
    ).toBeVisible();
  });
});

test.describe("desktop studio regression", () => {
  test.skip(({ viewport }) => !viewport || viewport.width < 1024, "desktop-only suite");

  test("desktop shows the guided spine and never the mobile journey", async ({ page }) => {
    await page.goto("/studio");

    await expect(page.getByRole("navigation", { name: "Studio steps" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Rules & Fit" })).toBeVisible();
    await expect(page.getByTestId("mobile-journey")).not.toBeVisible();
  });
});
