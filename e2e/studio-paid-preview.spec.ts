import { expect, test } from "@playwright/test";

// The free preview shows only the rent range; build cost, annual net income,
// payback and financed cash flow stay in the certificate (2026-11-18 reversal
// of the 2026-11-01 unblur).
test("free Studio shows the rent range while cost, income and payback stay paid", async ({ page }, testInfo) => {
  await page.goto("/studio?parcel=coyote-brush");
  const mobile = testInfo.project.name.includes("mobile");
  if (mobile) {
    await expect(page.getByText("$2,335–$2,919")).toBeVisible();
    await page.getByRole("button", { name: /Shape your ADU/ }).click();
    await expect(page.getByRole("radiogroup", { name: "ADU size", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Check feasibility" }).click();
  }
  const preview = page.getByRole("region", { name: "Free property preview" });
  await expect(preview.getByText("$2,335–$2,919")).toBeVisible();
  const locked = preview.locator('[data-locked-metric="true"]');
  await expect(locked).toHaveCount(4);
  for (const label of ["Build cost", "Annual net income", "Payback period", "Financed cash flow"]) {
    await expect(locked.filter({ hasText: label })).toHaveCount(1);
  }
  await expect(page.getByRole("button", { name: "Numbers & readiness" })).toHaveCount(0);
  for (const figure of ["$231K–$289K", "$19K /yr", "13.3 yrs"]) {
    await expect(preview.getByText(figure, { exact: true })).toHaveCount(0);
  }
  await preview.getByRole("button", { name: "See what’s behind the numbers" }).click();
  await expect(page.getByRole("button", { name: "Search your address" }).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByRole("region", { name: "Free property preview" }).locator('[data-locked-metric="true"]')).toHaveCount(4);
  await page.screenshot({ path: testInfo.outputPath("studio-paid-preview.png"), fullPage: true });
});
