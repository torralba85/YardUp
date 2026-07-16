import { test, expect } from "@playwright/test";

/**
 * Launch-completeness coverage for the public website surfaces: every public
 * route renders a main landmark without uncaught page errors, the branded 404
 * recovers, crawl metadata resolves, and the settings/delete-account pages
 * offer their signed-out actions.
 */

const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/help",
  "/feedback",
  "/privacy",
  "/terms",
  "/delete-account",
];

for (const path of PUBLIC_ROUTES) {
  test(`${path} loads without page errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("unknown routes get the branded 404 with recovery links", async ({ page }) => {
  await page.goto("/this-parcel-does-not-exist");
  await expect(
    page.getByRole("heading", { name: /no parcel on record here/i }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /back to home/i })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /start a feasibility study/i }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /get help/i })).toBeVisible();
});

test("robots.txt allows public pages and names the sitemap", async ({ request }) => {
  const res = await request.get("/robots.txt");
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toContain("Disallow: /builder");
  expect(body).toContain("Disallow: /settings");
  expect(body).toContain("sitemap.xml");
});

test("sitemap.xml lists only public routes", async ({ request }) => {
  const res = await request.get("/sitemap.xml");
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toContain("/studio");
  expect(body).toContain("/help");
  expect(body).not.toContain("/builder");
});

test("the shared footer reaches every support and legal surface", async ({ page }) => {
  await page.goto("/help");
  const footer = page.locator("footer");
  for (const label of [
    "About",
    "Help",
    "Feedback",
    "Terms & Conditions",
    "Privacy",
    "Delete account",
  ]) {
    await expect(footer.getByRole("link", { name: label })).toBeVisible();
  }
});

test("settings offers a sign-in action when signed out", async ({ page }) => {
  await page.goto("/settings");
  await expect(
    page.getByRole("heading", { name: /sign in to manage your account/i }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
});

test("delete-account explains retention and offers sign-in when signed out", async ({
  page,
}) => {
  await page.goto("/delete-account");
  await expect(
    page.getByRole("heading", { name: /what gets deleted/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /what is retained/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /sign in to continue/i }),
  ).toBeVisible();
});

test("the feedback form renders its categories and honeypot stays hidden", async ({
  page,
}) => {
  await page.goto("/feedback");
  await expect(page.getByLabel(/category/i)).toBeVisible();
  await expect(
    page.getByLabel(/what happened, or what should we build/i),
  ).toBeVisible();
  // The honeypot must never be visible to humans.
  await expect(page.locator("#feedback-company")).not.toBeInViewport();
});
