import { expect, test, type Page } from "@playwright/test";
import { mockTestOwnerAuth } from "./fixtures/studio-auth";

// Public synthetic fixture only. No production account, token, or paid API.
const parcel = {
  address: "1421 NE 88th St", city: "Seattle, WA 98115", state: "WA", zip: "98115",
  lat: 47.69217, lng: -122.31232, source: "fallback", zoning: "R-1 (estimated)",
  boundaryGeoJson: null, lotArea: 5000, lotWidth: 40, lotLength: 125,
  existingHouseSqft: 0, maxLotCoveragePercent: 40,
  setbacks: { front: 20, rear: 20, side: 5 },
};

async function mockLookup(page: Page) {
  await mockTestOwnerAuth(page);
  const calls = { geocode: 0, parcel: 0 };
  await page.route("**/api/geocode?**", async (route) => {
    calls.geocode++;
    expect(route.request().headers().authorization).toBeUndefined();
    await route.fulfill({ json: { lat: parcel.lat, lng: parcel.lng, formattedAddress: "1421 NE 88th St, Seattle, WA 98115" } });
  });
  await page.route("**/api/parcel?**", async (route) => {
    calls.parcel++;
    expect(route.request().headers().authorization).toBeUndefined();
    await route.fulfill({ json: parcel });
  });
  await page.route("**/api/aerial?**", (route) => route.fulfill({
    contentType: "image/svg+xml",
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="540"><rect width="800" height="540" fill="#161616"/></svg>',
  }));
  return calls;
}

test("sample card preserves its advertised market scenario", async ({ page, isMobile }) => {
  await mockTestOwnerAuth(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const card = page.getByRole("link", { name: /Open the Seattle sample lot/ });
  await expect(card).toContainText("2,350");
  await expect(card).toContainText("13.2");
  const href = await card.getAttribute("href");
  const scenario = new URL(href!, "http://localhost").searchParams;
  expect(scenario.get("rent")).toBe("market");
  await card.click();
  if (isMobile) {
    await expect(page.getByRole("main")).toContainText("2,350");
  } else {
    await expect(page.getByRole("complementary", { name: "Property constraints" })).toContainText("2,350");
    await expect(page.getByRole("complementary", { name: "Property constraints" })).toContainText("13.2");
  }
  await expect.poll(() => new URL(page.url()).searchParams.get("rent")).toBe("market");
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("main")).toContainText("2,350");
});

test("native guest gets one successful lookup, preserves Back, and is asked to sign in for another", async ({ page, isMobile }, testInfo) => {
  test.skip(!isMobile, "Native onboarding is exercised at phone width");
  const calls = await mockLookup(page);
  await page.addInitScript(() => {
    Object.assign(window, { LotFoundryNative: { platform: "android" } });
  });
  await page.goto("/studio", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Explore my property/ }).click();
  await expect(page.getByTestId("app-guide")).toBeVisible();
  await page.getByRole("button", { name: /Open the Studio/ }).click();
  await expect(page.getByRole("heading", { name: /Start with your address/ })).toBeVisible();
  await page.getByRole("searchbox", { name: "Search property address" }).fill("1421 NE 88th St, Seattle, WA");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Your backyard could earn/ })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(calls).toEqual({ geocode: 1, parcel: 1 });
  await page.screenshot({ path: testInfo.outputPath("native-guest-first-lookup.png"), fullPage: true });
  await page.goBack({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Start with your address/ })).toBeVisible();
  await page.getByRole("searchbox", { name: "Search property address" }).fill("1423 NE 88th St, Seattle, WA");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(calls).toEqual({ geocode: 1, parcel: 1 });
  expect(new URL(page.url()).search).not.toMatch(/1421|1423|Seattle/);
});

test("unverified aerial is context only, without invented house, ADU or setback locations", async ({ page, isMobile }, testInfo) => {
  await mockLookup(page);
  await page.goto("/studio", { waitUntil: "domcontentloaded" });
  await page.getByRole("searchbox", { name: "Search property address" }).fill("1421 NE 88th St, Seattle, WA");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  if (isMobile) {
    await page.getByRole("button", { name: /Shape your ADU/ }).click();
  } else {
    await page.getByRole("navigation", { name: "Studio steps" }).getByRole("button", { name: /Design/ }).click();
  }
  await page.getByRole("radiogroup", { name: "Parcel view" }).getByRole("radio", { name: "Aerial" }).click();
  const aerial = page.getByLabel("Aerial lot view");
  await expect(aerial).toBeVisible();
  await expect(aerial).not.toContainText("EXISTING HOUSE");
  await expect(aerial).not.toContainText("PROPOSED ADU");
  await expect(aerial).not.toContainText(/Rear Setback|Front Setback|Side \d/);
  await expect(aerial).toContainText(/context|not.*aligned|alignment|boundary unavailable/i);
  await page.screenshot({ path: testInfo.outputPath("context-only-aerial.png"), fullPage: true });
});

test("imagery credits stay visible below the context notice at desktop and 320px phone width", async ({ page, isMobile }, testInfo) => {
  if (isMobile) await page.setViewportSize({ width: 320, height: 844 });
  await mockLookup(page);
  const credit = "Imagery: Esri, Maxar, Earthstar Geographics, and the GIS User Community";
  await page.route("**/api/aerial?**", (route) => route.fulfill({
    contentType: "image/svg+xml",
    headers: { "X-Aerial-Attribution": credit },
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="540"><rect width="800" height="540" fill="#161616"/></svg>',
  }));
  await page.goto("/studio", { waitUntil: "domcontentloaded" });
  await page.getByRole("searchbox", { name: "Search property address" }).fill("1421 NE 88th St, Seattle, WA");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  if (isMobile) {
    await page.getByRole("button", { name: /Shape your ADU/ }).click();
  } else {
    await page.getByRole("navigation", { name: "Studio steps" }).getByRole("button", { name: /Design/ }).click();
  }
  await page.getByRole("radiogroup", { name: "Parcel view" }).getByRole("radio", { name: "Aerial" }).click();
  const aerial = page.getByLabel("Aerial lot view", { exact: true });
  const footer = aerial.getByLabel("Aerial context and imagery credits");
  const attribution = footer.getByText(credit, { exact: true });
  const context = footer.getByRole("note").filter({ hasText: "Imagery is context only" });
  await expect(attribution).toBeVisible();
  await expect(context).toBeVisible();
  const image = aerial.getByRole("img");
  await expect(image).toHaveCSS("object-fit", "contain");
  const [creditBox, contextBox, aerialBox] = await Promise.all([
    attribution.boundingBox(), context.boundingBox(), aerial.boundingBox(),
  ]);
  expect(creditBox!.y).toBeGreaterThanOrEqual(contextBox!.y + contextBox!.height);
  expect(creditBox!.y + creditBox!.height).toBeLessThanOrEqual(aerialBox!.y + aerialBox!.height);
  expect(creditBox!.x).toBeGreaterThanOrEqual(aerialBox!.x);
  expect(creditBox!.x + creditBox!.width).toBeLessThanOrEqual(aerialBox!.x + aerialBox!.width);
  await page.screenshot({ path: testInfo.outputPath("aerial-context-and-credits.png"), fullPage: true });
});
