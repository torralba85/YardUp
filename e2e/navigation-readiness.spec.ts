import { expect, test } from "@playwright/test";

test("sign-in stays usable while an unrelated external frame is stalled", async ({ page }) => {
  let releaseFrame!: () => void;
  const pendingFrame = new Promise<void>((resolve) => { releaseFrame = resolve; });
  let sawFrame!: () => void;
  const frameRequested = new Promise<void>((resolve) => { sawFrame = resolve; });
  await page.route("https://stalled.example.test/frame", async (route) => {
    sawFrame();
    await pendingFrame;
    await route.fulfill({ contentType: "text/html", body: "<html></html>" });
  });
  await page.route("**/login", async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(
      "</body>",
      '<iframe title="Stalled external frame" src="https://stalled.example.test/frame" hidden></iframe></body>',
    );
    await route.fulfill({ response, body });
  });

  try {
    await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 5_000 });
    await frameRequested;
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    const email = page.getByLabel("Email", { exact: true });
    await email.fill("checkout-test@example.test");
    await expect(email).toHaveValue("checkout-test@example.test");
    expect(await page.evaluate(() => document.readyState)).toBe("interactive");
  } finally {
    releaseFrame();
  }
});
