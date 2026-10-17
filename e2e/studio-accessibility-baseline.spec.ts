import { expect, test, type Page } from "@playwright/test";

// T08 browser reproductions derived from Gemini's audit coverage outline.
// The actual selectors and assertions were verified against the source by Codex.
async function openShape(page: Page) {
  await page.goto("/studio");
  await page.getByRole("button", { name: /reveal my backyard/i }).click();
  await page.getByRole("button", { name: /shape your adu/i }).click();
  await expect(page.getByRole("heading", { name: /pick a direction/i })).toBeVisible();
}

test.describe("T08 mobile accessibility defects at 56293db", () => {
  test.skip(({ viewport }) => !viewport || viewport.width >= 640, "Names disappear below sm");

  test("U4: camera actions retain names at phone widths", async ({ page }, testInfo) => {
    await openShape(page);
    const scene = page.getByRole("group", { name: "Interactive ADU placement model", exact: true });
    await expect(scene).toBeVisible();
    const cameraActions = scene.locator("button[aria-pressed]");
    await expect(cameraActions).toHaveCount(3);
    await page.screenshot({ path: testInfo.outputPath("shape-camera-controls.png"), fullPage: true });
    // Setup failures above remain real failures. Only the known name defect is expected.
    test.fail(true, "U4: current camera text is hidden below sm and there is no aria-label");
    await expect(cameraActions.nth(0)).toHaveAccessibleName("Overview");
    await expect(cameraActions.nth(1)).toHaveAccessibleName("ADU");
    await expect(cameraActions.nth(2)).toHaveAccessibleName("Setbacks");
  });

  test("T04: size radio group implements arrow-key selection", async ({ page }) => {
    await openShape(page);
    const choices = page.getByRole("radiogroup", { name: "ADU size", exact: true });
    const studio = choices.getByRole("radio", { name: /^Studio/ });
    const oneBedroom = choices.getByRole("radio", { name: /^1 Bedroom/ });
    await studio.click();
    await expect(studio).toHaveAttribute("aria-checked", "true");
    await studio.press("ArrowDown");
    test.fail(true, "Custom role=radio buttons lack arrow-key selection behavior");
    await expect(oneBedroom).toHaveAttribute("aria-checked", "true");
    await expect(oneBedroom).toBeFocused();
  });
});
