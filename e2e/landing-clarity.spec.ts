import { expect, test } from "@playwright/test";

test("landing explains the tool before address entry, then shows the model, with the app link at the close", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const hero = page.locator("#start");
  const explanation = hero.getByText(
    /explore a backyard-home layout/i,
  );
  const address = hero.getByLabel("Property address", { exact: true });
  // Since the cinematic hero (2026-11-01) the parcel illustration lives in the
  // model section after the hero, and the Play badge closes the page.
  const illustration = page.locator("#the-model figure");
  const closing = page.locator('[aria-labelledby="closing-title"]');
  const closingAddress = closing.getByLabel("Property address", { exact: true });
  const app = closing.getByRole("link", { name: "Get it on Google Play" });
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
      const heroBox = await hero.boundingBox();
      expect((await illustration.boundingBox())!.y).toBeGreaterThanOrEqual(
        heroBox!.y + heroBox!.height,
      );
      const closingInputBox = await closingAddress.boundingBox();
      expect((await app.boundingBox())!.y).toBeGreaterThanOrEqual(
        closingInputBox!.y + closingInputBox!.height,
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
  // Address each group by name. The maquette's inspection pins are a radio group too,
  // but they mount and unmount as scroll walks the pinned model section between scenes,
  // which shifts positional locators; they have their own test below.
  const names = [
    "Property illustration view",
    "Preview footprint",
    "Preview roof profile",
    "What would your backyard home be for?",
    "Demo rent assumption",
    "Build cost layers",
    "Sample report pages",
  ];
  await expect(page.getByRole("radiogroup", { name: names[0], exact: true })).toBeVisible();
  const groupNames = await page.getByRole("radiogroup").evaluateAll((groups) =>
    groups.map((group) => group.getAttribute("aria-label")).filter((name) => name !== "Maquette inspection points"),
  );
  expect(groupNames.sort()).toEqual([...names].sort());
  for (const name of names) {
    const group = page.getByRole("radiogroup", { name, exact: true });
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

test("maquette inspection pins are one radio group that moves with the arrow keys", async ({
  page,
}) => {
  // Reduced motion keeps the model section static on "The possibility", so the pins
  // stay mounted while focus moves between them.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const pins = page.getByRole("radiogroup", { name: "Maquette inspection points" });
  await pins.scrollIntoViewIfNeeded();
  await expect(pins.getByRole("radio")).toHaveCount(3);
  await expect(pins.locator('[role="radio"][tabindex="0"]')).toHaveCount(1);
  await pins.getByRole("radio", { checked: true }).press("End");
  const last = pins.getByRole("radio").last();
  await expect(last).toBeChecked();
  await expect(last).toBeFocused();
  await expect(page.getByText("POINT 03 / 03")).toBeVisible();
  await last.press("ArrowRight");
  await expect(pins.getByRole("radio").first()).toBeChecked();
  await expect(page.getByText("POINT 01 / 03")).toBeVisible();
});

test("actual Studio preview loads and the example opens without an account prompt", async ({
  page,
}) => {
  await page.goto("/");
  const capture = page.getByRole("img", {
    name: /Coyote Brush Court demo in the LotFoundry 3D studio/,
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
    page.getByText("Explore in the Studio", { exact: true }),
  ).toBeVisible();
  const freeOffer = page.getByText("Explore in the Studio", { exact: true }).locator("../..");
  await expect(freeOffer).toContainText(/estimated monthly rent range/);
  await expect(freeOffer).not.toContainText(/build cost|payback/i);
  await page.getByRole("link", { name: "Try the Coyote Brush Court demo" }).click();
  await expect(page).toHaveURL(
    (url) =>
      url.pathname === "/studio" &&
      url.searchParams.get("parcel") === "coyote-brush",
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
