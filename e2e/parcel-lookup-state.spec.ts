import { expect, test } from "@playwright/test";
import { SAMPLE_LIVE_PARCEL } from "../test/fixtures/live-parcel";

const address = `${SAMPLE_LIVE_PARCEL.address}, ${SAMPLE_LIVE_PARCEL.city}`;
// A real query takes over a previously selected sample on both layouts.
const lookupUrl = `/studio?parcel=oak-street&q=${encodeURIComponent(address)}`;

test("failed parcel lookup hides sample figures and retry restores property results", async ({ page, isMobile }) => {
  let failParcel = true;
  await page.route("**/api/geocode*", (route) => route.fulfill({ json: {
    lat: SAMPLE_LIVE_PARCEL.lat,
    lng: SAMPLE_LIVE_PARCEL.lng,
    formattedAddress: address,
  } }));
  await page.route("**/api/parcel*", (route) => failParcel
    ? route.fulfill({ status: 502, json: {} })
    : route.fulfill({ json: SAMPLE_LIVE_PARCEL }));

  await page.goto(lookupUrl);
  await expect(page.getByText("Parcel data is unavailable for this address. Please try again.")).toBeVisible();
  await expect(page.getByTestId("demo-mode-banner")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Free property preview" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "What a backyard home could rent for" })).toHaveCount(0);
  await expect(page.getByText("1234 Oak Street", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/Demo mode will be used/)).toHaveCount(0);

  failParcel = false;
  if (isMobile) {
    await page.getByRole("searchbox", { name: "Search property address" }).fill(address);
    await page.getByRole("button", { name: "Search", exact: true }).click();
  } else {
    await page.getByRole("button", { name: "Retry lookup" }).click();
  }
  await expect(page.getByTestId("property-lookup-error")).toHaveCount(0);
  await expect(page.getByRole("region", { name: isMobile ? "What a backyard home could rent for" : "Free property preview" })).toBeVisible();
  await expect(page.getByText(SAMPLE_LIVE_PARCEL.address, { exact: true }).first()).toBeVisible();
  await expect(page.getByTestId("demo-mode-banner")).toHaveCount(0);
});

test("failed geocode shows recovery actions and only an explicit choice enables demo results", async ({ page, isMobile }) => {
  await page.route("**/api/geocode*", (route) => route.fulfill({ status: 404, json: {} }));
  await page.goto(lookupUrl);
  await expect(page.getByTestId("demo-mode-banner")).toHaveCount(0);
  await expect(page.getByText(/We couldn't find that address/)).toBeVisible();
  await expect(page.getByRole("region", { name: "Free property preview" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "What a backyard home could rent for" })).toHaveCount(0);

  await page.getByRole("button", { name: isMobile ? "See the Seattle example" : "Explore demo lot" }).click();
  await expect(page.getByTestId("demo-mode-banner")).toContainText(isMobile ? "Demo Mode: Seattle" : "Demo Mode: San Diego");
  await expect(page.getByRole("region", { name: isMobile ? "What a backyard home could rent for" : "Free property preview" })).toBeVisible();
});
