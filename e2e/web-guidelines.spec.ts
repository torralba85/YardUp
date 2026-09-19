import { expect, test } from "@playwright/test";
import { mockTestOwnerAuth } from "./fixtures/studio-auth";

for (const route of ["/login", "/signup", "/forgot-password"]) {
  test(`${route} skip link focuses the main landmark`, async ({ page }) => {
    await mockTestOwnerAuth(page);
    await page.goto(route);
    await page.getByRole("link", { name: "Skip to content" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("main")).toBeFocused();
  });
}

test("feedback explains validation and restores the draft after reload", async ({ page }) => {
  await mockTestOwnerAuth(page);
  await page.goto("/feedback");
  const message = page.getByLabel("What happened, or what should we build?");
  await page.getByRole("button", { name: "Send feedback" }).click();
  await expect(message).toBeFocused();
  await expect(message).toHaveAttribute("aria-invalid", "true");
  await expect(message).toHaveCSS("box-shadow", /rgb\(196, 55, 8\).*2px/);
  await expect(page.locator("#feedback-message-error")).toContainText("10 characters");
  await message.fill("Please make the map legend clearer.");
  await page.reload();
  await expect(message).toHaveValue("Please make the map legend clearer.");
});

test("desktop upload keyboard focus is visible and reset can be cancelled", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "desktop Studio layout");
  await mockTestOwnerAuth(page);
  await page.goto("/studio?parcel=oak-street");
  await page.getByRole("navigation", { name: "Studio steps" }).getByRole("button", { name: /Design/ }).click();
  await page.locator("summary").filter({ hasText: "Browse designs" }).click();
  await page.locator("summary").filter({ hasText: "Match your own home" }).click();
  await page.getByRole("checkbox", { name: /agree to send this photo to OpenAI/ }).check();
  const upload = page.getByLabel(/Choose house photo/);
  await upload.focus();
  // The 2px ring sits outside a 2px offset, producing a 4px shadow spread.
  await expect(upload.locator("..")).toHaveCSS("box-shadow", /rgb\(196, 55, 8\) 0px 0px 0px 4px/);
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Reset Project" }).click();
  await expect(upload).toBeVisible();
  await page.getByRole("link", { name: "Skip to content" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
});
