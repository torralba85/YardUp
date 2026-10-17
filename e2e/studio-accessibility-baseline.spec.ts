import { expect, test, type Page } from "@playwright/test";

// T08 browser reproductions derived from Gemini's audit coverage outline.
// The actual selectors and assertions were verified against the source by Codex.
async function openShape(page: Page) {
  await page.goto("/studio", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /reveal my backyard/i }).click();
  await page.getByRole("button", { name: /shape your adu/i }).click();
  await expect(page.getByRole("heading", { name: /pick a direction/i })).toBeVisible();
}

test.describe("T08 mobile accessibility verification", () => {
  test.skip(({ viewport }) => !viewport || viewport.width >= 640, "Names retain visibility below sm");

  test("U4: camera actions retain names at phone widths", async ({ page }, testInfo) => {
    await openShape(page);
    const scene = page.getByRole("group", { name: "Interactive ADU placement model", exact: true });
    await expect(scene).toBeVisible();
    const cameraActions = page.getByRole("radiogroup", { name: "Camera view" }).getByRole("radio");
    await expect(cameraActions).toHaveCount(3);
    await page.screenshot({ path: testInfo.outputPath("shape-camera-controls.png"), fullPage: true });
    await expect(cameraActions.nth(0)).toHaveAccessibleName("Frame lot");
    await expect(cameraActions.nth(1)).toHaveAccessibleName("Frame ADU");
    await expect(cameraActions.nth(2)).toHaveAccessibleName("Plan");
  });

  test("T04: size radio group implements arrow-key selection", async ({ page }) => {
    await openShape(page);
    const choices = page.getByRole("radiogroup", { name: "ADU size", exact: true });
    const studio = choices.getByRole("radio", { name: /^Studio/ });
    const oneBedroom = choices.getByRole("radio", { name: /^1 Bedroom/ });
    await studio.click();
    await expect(studio).toHaveAttribute("aria-checked", "true");
    await studio.press("ArrowDown");
    await expect(oneBedroom).toHaveAttribute("aria-checked", "true");
    await expect(oneBedroom).toBeFocused();
  });
});
