import { expect, test } from "@playwright/test";

const PUBLIC_PATHS = [
  "/",
  "/about",
  "/help",
  "/feedback",
  "/privacy",
  "/terms",
  "/delete-account",
  "/login",
  "/signup",
  "/studio",
  "/adu/ca",
  "/adu/ca/san-diego",
  "/adu/ca/san-diego/cost",
  "/adu/ca/chula-vista",
  "/adu/ca/oceanside",
  "/adu/ca/escondido",
  "/adu/ca/carlsbad",
  "/adu/ca/imperial-beach",
  "/adu/ca/la-mesa",
  "/adu/ca/san-marcos",
  "/adu/ca/san-diego-county",
  "/adu/how-we-estimate",
] as const;

for (const path of PUBLIC_PATHS) {
  test(`${path} loads without page errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await page.goto(path);
    expect(response?.status(), `${path} status`).toBeLessThan(400);
    // Prefer main landmarks; auth pages use AuthLayout headings; studio mobile
    // may expose scene, sheet, or wizard copy instead of a single <main>.
    const surface = page
      .locator(
        [
          "#main-content",
          "main",
          "[data-testid='scene-viewport']",
          "[aria-label='Studio navigation']",
          "h1",
          "form",
          "img[alt='LotFoundry']",
        ].join(", "),
      )
      .first();
    await expect(surface).toBeVisible({ timeout: 15_000 });
    // Filter known benign third-party noise if any; app code should be clean.
    const appErrors = errors.filter(
      (msg) =>
        !msg.includes("ResizeObserver") &&
        !msg.includes("Non-Error promise rejection") &&
        !msg.includes("Google Maps JavaScript API"),
    );
    expect(appErrors, `${path} page errors: ${appErrors.join(" | ")}`).toEqual([]);
  });
}

test("robots and sitemap are reachable", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  const robotsBody = await robots.text();
  expect(robotsBody).toMatch(/sitemap/i);

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  expect(xml).toContain("/about");

  // Segmented ADU sitemap: hub plus one URL per jurisdiction page.
  const aduSitemap = await request.get("/sitemap-adu.xml");
  expect(aduSitemap.status()).toBe(200);
  const aduXml = await aduSitemap.text();
  expect(aduXml).toContain("/adu/ca/san-diego");
  expect(aduXml).toContain("/adu/ca");

  // `79c6545` de-indexed the account-utility pages: they have nothing to rank
  // for and carry a page-level noindex, so listing them in the sitemap would
  // work against that. Absence here is the intended state, not an omission.
  expect(xml).not.toContain("/delete-account");
  expect(xml).not.toContain("/login");
  expect(xml).not.toContain("/signup");

  // De-indexed is not hidden: Play requires the deletion URL stay publicly
  // reachable, and robots.txt must not disallow it.
  expect(robotsBody).not.toMatch(/Disallow:\s*\/delete-account/i);
  const deleteAccount = await request.get("/delete-account");
  expect(deleteAccount.status()).toBe(200);
});

test("unknown route shows branded 404 recovery", async ({ page }) => {
  await page.goto("/this-route-does-not-exist-lf");
  await expect(page.getByRole("heading", { name: /page not found/i })).toBeVisible();
  const main = page.getByRole("main");
  await expect(main.getByRole("link", { name: /^home$/i })).toBeVisible();
  await expect(main.getByRole("link", { name: /get help/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "LotFoundry home", exact: true })).toHaveAttribute("href", "/");
});


test("/studio exposes crawlable overview content and public links", async ({ page }) => {
  await page.goto("/studio");

  const overview = page.getByTestId("studio-overview");
  const overviewDisclosure = overview.locator("details");
  await expect(
    overview.getByRole("heading", { level: 1, name: "ADU Feasibility Studio" }),
  ).toBeVisible();
  await expect(overviewDisclosure).not.toHaveAttribute("open", "");

  const mainBox = await page.getByRole("main").boundingBox();
  const overviewBox = await overview.boundingBox();
  expect(mainBox).not.toBeNull();
  expect(overviewBox).not.toBeNull();
  expect(overviewBox!.x).toBeCloseTo(mainBox!.x, 0);

  await overview.getByText("Planning guide & methodology").click();
  await expect(overviewDisclosure).toHaveAttribute("open", "");
  await expect(overview.getByRole("link", { name: "California ADU rules" })).toHaveAttribute(
    "href",
    "/adu/ca",
  );
  await expect(overview.getByRole("link", { name: "About LotFoundry" })).toHaveAttribute(
    "href",
    "/about",
  );
  await expect(overview.getByRole("link", { name: "Help" })).toHaveAttribute("href", "/help");

  const words = (await overview.textContent() ?? "").split(/\s+/).filter(Boolean);
  expect(words.length).toBeGreaterThanOrEqual(150);
});
