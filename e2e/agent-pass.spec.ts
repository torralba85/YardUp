import { expect, test } from "@playwright/test";
import { EMAIL_SCENARIO } from "../test/fixtures/email-scenario";
import { buildScenarioShareUrl } from "../lib/scenario-share-url";
import { mockTestOwnerAuth } from "./fixtures/studio-auth";

test("a remembered agent code can be removed and replaced on desktop and mobile", async ({ page }, testInfo) => {
  await mockTestOwnerAuth(page);
  await page.route("**/api/studio/scenario-link/*", (route) => route.fulfill({ json: { scenario: EMAIL_SCENARIO } }));
  const url = new URL(buildScenarioShareUrl(EMAIL_SCENARIO, "d".repeat(48)));
  url.searchParams.set("step", "certificate");
  url.searchParams.set("pass", "OLD-CODE");
  await page.goto(`${url.pathname}${url.search}`, { waitUntil: "domcontentloaded" });
  const change = page.getByRole("button", { name: "Change agent code" }).filter({ visible: true }).first();
  await expect(change).toBeVisible({ timeout: 30_000 });
  await change.click();
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem("lf:agent-pass"))).toBeNull();
  const disclosure = page.locator("summary").filter({ hasText: "Have an agent code?", visible: true }).first();
  await disclosure.click();
  const input = page.getByLabel("Agent code", { exact: true }).filter({ visible: true }).first();
  await input.fill("NEW-CODE");
  await page.screenshot({ path: testInfo.outputPath("replace-agent-code.png"), fullPage: true });
  await page.getByRole("button", { name: "Create a free account to apply it" }).filter({ visible: true }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem("lf:agent-pass"))).toBe("NEW-CODE");
});
