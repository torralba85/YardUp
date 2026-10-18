import { expect, test } from "@playwright/test";

test("free Studio offers a 3D concept and rent range without exposing paid figures", async ({ page }, testInfo) => {
  await page.goto("/studio?parcel=coyote-brush");
  const mobile = testInfo.project.name.includes("mobile");
  if (mobile) {
    await page.getByRole("button", { name: /Reveal my backyard/ }).click();
    await expect(page.getByText("$2,459–$3,074")).toBeVisible();
    await page.getByRole("button", { name: /Shape your ADU/ }).click();
    await expect(page.getByRole("radiogroup", { name: "ADU size", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Check feasibility" }).click();
  }
  const preview = page.getByRole("region", { name: "Free property preview" });
  await expect(preview.getByText("$2,459–$3,074")).toBeVisible();
  await expect(preview.locator('[data-locked-metric="true"]')).toHaveCount(4);
  await expect(page.getByRole("button", { name: "Numbers & readiness" })).toHaveCount(0);
  for (const figure of ["$19,918", "$231K–$289K", "12.6 yrs"]) {
    await expect(page.getByText(figure, { exact: true })).toHaveCount(0);
  }
  await preview.getByRole("button", { name: "See what’s behind the numbers" }).click();
  await expect(page.getByRole("button", { name: "Continue to secure checkout — $29" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Free property preview" }).locator('[data-locked-metric="true"]')).toHaveCount(4);
  await page.screenshot({ path: testInfo.outputPath("studio-paid-preview.png"), fullPage: true });
});
