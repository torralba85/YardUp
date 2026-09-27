import { expect, test } from "@playwright/test";

test("landing explains the tool before address entry and keeps the mobile app link after the preview", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const hero = page.locator("#start");
  const explanation = hero.getByText(
    /See what could fit, compare estimated build costs/,
  );
  const address = hero.getByLabel("Property address", { exact: true });
  const illustration = hero.locator("figure");
  const app = hero.getByRole("link", { name: "Get it on Google Play" });
  const widths =
    testInfo.project.name === "mobile-chromium"
      ? [320, 390, 800]
      : [1150, 1440];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 844 });
    await expect(explanation).toBeVisible();
    const copyBox = await explanation.boundingBox();
    const inputBox = await address.boundingBox();
    expect(copyBox!.y + copyBox!.height).toBeLessThan(inputBox!.y);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width <= 480) {
      const submitBox = await hero
        .getByRole("button", { name: "Explore my lot" })
        .boundingBox();
      expect(submitBox!.y + submitBox!.height).toBeLessThan(844);
    }
    if (width <= 800) {
      const visualBox = await illustration.boundingBox();
      expect((await app.boundingBox())!.y).toBeGreaterThanOrEqual(
        visualBox!.y + visualBox!.height,
      );
    }
  }
  await page.setViewportSize({
    width: testInfo.project.name === "mobile-chromium" ? 390 : 1440,
    height: 844,
  });
  // Capture initial entry independently of the resize and offscreen-paint checks.
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  // Confirm hydration before screenshots hide the input caret. Otherwise the
  // temporary screenshot style can be seen by React during hydration.
  const today = page.getByRole("radio", { name: "Today" });
  const possibility = page.getByRole("radio", { name: "The possibility" });
  await today.click();
  await expect(today).toHaveAttribute("aria-checked", "true");
  await possibility.click();
  await expect(possibility).toHaveAttribute("aria-checked", "true");
  await page.screenshot({
    path: testInfo.outputPath("landing-hero.png"),
    scale: "css",
  });
  await page.getByRole("contentinfo").scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("heading", { name: /It starts with your address/i }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: testInfo.outputPath("landing-full.png"),
    fullPage: true,
    scale: "css",
  });
  for (const id of ["how-it-works", "report"]) {
    await page
      .locator(`#${id}`)
      .screenshot({ path: testInfo.outputPath(`${id}.png`), scale: "css" });
  }
});

test("landing radios expose one tab stop, move focus, and update the associated report", async ({
  page,
}) => {
  await page.goto("/");
  const groups = page.getByRole("radiogroup");
  await expect(groups).toHaveCount(4);
  for (const group of await groups.all()) {
    const checked = group.getByRole("radio", { checked: true });
    await expect(group.locator('[role="radio"][tabindex="0"]')).toHaveCount(1);
    await checked.focus();
    await checked.press("End");
    await expect(group.getByRole("radio").last()).toBeChecked();
    await expect(group.getByRole("radio").last()).toBeFocused();
    await group.getByRole("radio").last().press("Home");
    await expect(group.getByRole("radio").first()).toBeChecked();
  }
  await page
    .getByRole("radiogroup", { name: "Sample report pages" })
    .getByRole("radio")
    .first()
    .press("End");
  await expect(
    page.getByText(/Confirm property boundaries, setbacks/),
  ).toBeVisible();
  await expect(
    page.getByRole("radio", { name: "Next steps", exact: true }),
  ).toHaveCSS("outline-color", "rgb(196, 55, 8)");
});

test("actual Studio preview loads and the example opens without an account prompt", async ({
  page,
}) => {
  await page.goto("/");
  const capture = page.getByRole("img", {
    name: /Oak Street demo in the LotFoundry 3D studio/,
  });
  await capture.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      capture.evaluate(
        (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
      ),
    )
    .toBe(true);
  await expect(
    page.getByText("Certificate of Feasibility", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Explore in the studio", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Try the Oak Street demo" }).click();
  await expect(page).toHaveURL(
    (url) =>
      url.pathname === "/studio" &&
      url.searchParams.get("parcel") === "oak-street",
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
