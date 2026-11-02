import { expect, test } from "@playwright/test";

// Since the 2026-11-01 funnel change the free preview shows build cost, annual
// net income (rounded to $1K) and payback; financed cash flow stays in the
// certificate.
test("free Studio shows rent, cost and payback while financed cash flow stays paid", async ({ page }, testInfo) => {
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
  await expect(locked).toHaveCount(1);
  await expect(locked).toContainText("Financed cash flow");
  await expect(page.getByRole("button", { name: "Numbers & readiness" })).toHaveCount(0);
  for (const figure of ["$231K–$289K", "$19K /yr", "13.3 yrs"]) {
    await expect(preview.getByText(figure, { exact: true })).toBeVisible();
  }
  await preview.getByRole("button", { name: "See what’s behind the numbers" }).click();
  await expect(page.getByRole("button", { name: "Continue to secure checkout — $29" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Free property preview" }).locator('[data-locked-metric="true"]')).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath("studio-paid-preview.png"), fullPage: true });
});
