import { chromium } from "@playwright/test";

const baseUrl = (process.env.SIGNUP_CANARY_BASE_URL || "https://lotfoundry.net").replace(/\/+$/, "");
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const email = `lotfoundry-live-smoke+${suffix}@example.com`;
const password = `LfLive!${Date.now()}xQ`;
const displayName = "LotFoundry Live Smoke";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

const watchedHosts = new Set([
  "identitytoolkit.googleapis.com",
  "firestore.googleapis.com",
  "firebaseappcheck.googleapis.com",
  "recaptchaenterprise.googleapis.com",
]);

page.on("response", (response) => {
  try {
    const url = new URL(response.url());
    if (!watchedHosts.has(url.hostname)) return;
    console.log(`[live-signup][net] ${response.status()} ${url.hostname}${url.pathname}`);
  } catch {
    // Ignore malformed/non-HTTP response URLs.
  }
});

page.on("console", (message) => {
  if (message.type() !== "error" && message.type() !== "warning") return;
  const text = message.text().replace(/lotfoundry-live-smoke\+[^\s@]+@example\.com/gi, "[redacted-canary-email]");
  console.log(`[live-signup][console:${message.type()}] ${text.slice(0, 1200)}`);
});

page.on("pageerror", (error) => {
  console.log(`[live-signup][pageerror] ${error.message.slice(0, 1200)}`);
});

let signupSucceeded = false;
let cleanupSucceeded = false;

async function cleanupAccount() {
  await page.goto(`${baseUrl}/delete-account`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.getByRole("heading", { name: "Delete now" }).waitFor({ timeout: 60_000 });
  await page.getByRole("button", { name: "Delete account" }).click();
  await page.getByRole("button", { name: "Delete permanently" }).click();
  await page.waitForURL((url) => url.origin === new URL(baseUrl).origin && url.pathname === "/", {
    timeout: 60_000,
  });
  cleanupSucceeded = true;
  console.log("[live-signup] Disposable production account deleted.");
}

try {
  await page.goto(`${baseUrl}/signup`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.getByRole("heading", { name: "Create account" }).waitFor({ timeout: 60_000 });
  await page.getByLabel("Full name").fill(displayName);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();

  try {
    await page.waitForURL((url) => url.pathname === "/studio", { timeout: 35_000 });
  } catch (error) {
    const formText = (await page.locator("form").textContent().catch(() => ""))?.replace(/\s+/g, " ").trim();
    throw new Error(
      `Signup did not reach /studio. Current URL: ${page.url()}. Form status: ${formText || "unavailable"}`,
      { cause: error },
    );
  }

  signupSucceeded = true;
  console.log("[live-signup] Production signup reached /studio successfully.");
  await cleanupAccount();
  console.log("[live-signup] Live signup + profile persistence + account cleanup passed.");
} catch (error) {
  console.error(`[live-signup] ${error instanceof Error ? error.message : String(error)}`);
  if (signupSucceeded && !cleanupSucceeded) {
    try {
      await cleanupAccount();
      console.error("[live-signup] Cleanup succeeded after test failure.");
    } catch (cleanupError) {
      console.error(
        `[live-signup] Cleanup failed: ${
          cleanupError instanceof Error ? cleanupError.message : String(cleanupError)
        }`,
      );
    }
  }
  process.exitCode = 1;
} finally {
  await browser.close();
}
