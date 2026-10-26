import { expect, test } from "@playwright/test";
import { EMAIL_SCENARIO } from "../test/fixtures/email-scenario";
import { buildScenarioShareUrl } from "../lib/scenario-share-url";
import { parseScenarioParams } from "../lib/scenario-url";
import { getScenePlacement } from "../lib/site-fit";
import { mockTestOwnerAuth } from "./fixtures/studio-auth";

test.setTimeout(90_000);

for (const fallback of [false, true]) {
  test(`snap to fit updates the shared placement${fallback ? " without WebGL" : ""}`, async ({ page, isMobile }, testInfo) => {
    await mockTestOwnerAuth(page);
    if (fallback) await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, context: string, ...args: unknown[]) {
        if (context.includes("webgl")) return null;
        return Reflect.apply(original, this, [context, ...args]);
      } as typeof original;
    });
    const scenario = { ...EMAIL_SCENARIO, pose: { x: 0, z: 0, rotationDeg: 0 } };
    await page.route("**/api/studio/scenario-link/*", route => route.fulfill({ json: { scenario } }));
    const url = new URL(buildScenarioShareUrl(scenario, "e".repeat(48)));
    await page.goto(`${url.pathname}${url.search}`, { waitUntil: "domcontentloaded" });
    if (isMobile) await page.getByRole("button", { name: "Shape your ADU" }).click();
    const snap = page.getByRole("button", { name: "Snap to fit", exact: true }).filter({ visible: true }).first();
    await expect(snap).toBeVisible({ timeout: 30_000 });
    await snap.click();
    await expect(page.getByRole("status").filter({ hasText: "Placed within the modeled setbacks" })).toBeVisible();
    await expect.poll(() => {
      const restored = parseScenarioParams(new URL(page.url()).searchParams);
      return restored.pose && getScenePlacement(scenario.liveParcel!, scenario.config, restored.pose).status;
    }).toBe("fits");
    expect(await snap.evaluate(node => node.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("snap-to-fit.png"), fullPage: true });
  });
}

test("shared builder layout requests sign-in without exposing the parcel", async ({ page }, testInfo) => {
  await mockTestOwnerAuth(page);
  await page.goto("/studio?lead=example-request", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Sign in to open this shared builder layout.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
  await expect(page.getByText(EMAIL_SCENARIO.liveParcel!.address)).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("private-layout-sign-in.png"), fullPage: true });
});
