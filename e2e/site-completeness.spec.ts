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
  expect(xml).toContain("/delete-account");
});

test("unknown route shows branded 404 recovery", async ({ page }) => {
  await page.goto("/this-route-does-not-exist-lf");
  await expect(page.getByRole("heading", { name: /page not found/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /^home$/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /get help/i })).toBeVisible();
});
