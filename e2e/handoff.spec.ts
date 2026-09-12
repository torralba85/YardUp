import { expect, test } from "@playwright/test";
import { signInTestOwner } from "./fixtures/studio-auth";

test("an unsuccessful address handoff stays private and offers a retry", async ({ page }) => {
  test.setTimeout(60_000);
  await signInTestOwner(page);
  await page.route("**/api/geocode**", (route) => route.fulfill({ status: 404, json: { error: "Address not found" } }));
  await page.evaluate(() => sessionStorage.setItem("lf:pending-address", "0 Nowhere Lane, Zzyzx Flats, ZZ 00000"));
  await page.reload();
  await expect(page.getByRole("alert").filter({ hasText: "We couldn't find that address" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Start with your property." })).toBeVisible();
  await expect(page.getByLabel("Search property address")).toBeVisible();
  await expect(page.getByText("No property loaded")).toBeVisible();
  expect(page.url()).not.toMatch(/nowhere|zzyzx|[?&]q=/i);
  expect(await page.evaluate(() => sessionStorage.getItem("lf:pending-address"))).toBeNull();
});
