import { test as setup } from "@playwright/test";
import path from "path";

export const authFile = path.join(__dirname, ".auth/user.json");

setup("authenticate", async ({ page }) => {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;

  if (!email || !password) {
    throw new Error("TEST_EMAIL and TEST_PASSWORD env vars must be set to run e2e tests");
  }

  await page.goto("/login?next=/studio");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  // Wait until the studio heading is visible — confirms auth succeeded and studio loaded
  await page
    .getByRole("heading", { name: "Feasibility Studio" })
    .waitFor({ timeout: 30_000 });

  await page.context().storageState({ path: authFile });
});
