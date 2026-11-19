import { expect, test } from "@playwright/test";
import { EMAIL_SCENARIO } from "../test/fixtures/email-scenario";
import { buildScenarioShareUrl } from "../lib/scenario-url";
import { mockTestOwnerAuth } from "./fixtures/studio-auth";

test.setTimeout(90_000);

test("email capture appears on results and stays out of the design flow", async ({ page, isMobile }) => {
  await mockTestOwnerAuth(page);
  await page.route("**/api/studio/scenario-link/*", (route) => route.fulfill({ json: { scenario: EMAIL_SCENARIO } }));
  const url = new URL(buildScenarioShareUrl(EMAIL_SCENARIO, "d".repeat(48)));
  await page.goto(`${url.pathname}${url.search}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByText(EMAIL_SCENARIO.liveParcel!.address).first()).toBeVisible({ timeout: 30_000 });
  if (isMobile) {
    await expect(page.getByRole("button", { name: "Shape your ADU" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email address for your 3D lot link" })).toHaveCount(0);
    await page.getByRole("button", { name: "Shape your ADU" }).click();
    await expect(page.getByRole("textbox", { name: "Email address for your 3D lot link" })).toHaveCount(0);
    await page.getByRole("button", { name: "Check feasibility" }).click();
    await expect(page.getByRole("region", { name: "Save your layout link" })).toBeVisible();
  } else {
    await page.getByRole("navigation", { name: "Studio steps" }).getByRole("button", { name: /Rules & Fit/ }).click();
    await expect(page.getByRole("region", { name: "Free property preview" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Save your layout link" })).toBeVisible();
    await page.getByRole("navigation", { name: "Studio steps" }).getByRole("button", { name: /Design/ }).click();
    await expect(page.locator("summary").filter({ hasText: "Email this layout for later" })).toHaveCount(0);
    await expect(page.getByRole("textbox", { name: "Email address for your 3D lot link" })).toHaveCount(0);
  }
});

test("free lot link queues a real design and carries email into the account dialog", async ({ page }, testInfo) => {
  await mockTestOwnerAuth(page);
  const parcel = EMAIL_SCENARIO.liveParcel!;
  await page.route("**/api/geocode?**", (route) => route.fulfill({ json: { lat: parcel.lat, lng: parcel.lng, formattedAddress: parcel.address } }));
  await page.route("**/api/parcel?**", (route) => route.fulfill({ json: parcel }));
  let captured: Record<string, unknown> | undefined;
  await page.route("**/api/studio/email-scenario-link", async (route) => {
    captured = route.request().postDataJSON();
    await route.fulfill({ json: { ok: true, delivery: "queued", scenarioUrl: buildScenarioShareUrl(EMAIL_SCENARIO, "b".repeat(48)) } });
  });
  await page.goto("/privacy", { waitUntil: "domcontentloaded" });
  await page.evaluate((address) => window.sessionStorage.setItem("lf:pending-address", address), parcel.address);
  await page.goto("/studio?step=certificate", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(parcel.address).first()).toBeVisible({ timeout: 30_000 });
  const disclosure = page.locator("summary").filter({ hasText: "Email this layout for later" }).filter({ visible: true }).first();
  await expect(disclosure).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("textbox", { name: "Email address for your 3D lot link" })).not.toBeVisible();
  const purchase = page.getByRole("button", { name: /Continue to secure checkout/ }).filter({ visible: true }).first();
  await expect(purchase).toBeVisible();
  expect(await disclosure.evaluate((summary) => {
    const button = Array.from(document.querySelectorAll("button")).find((node) => node.textContent?.includes("Continue to secure checkout"));
    return Boolean(button && (button.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING));
  })).toBe(true);
  await disclosure.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("certificate-email-collapsed.png"), fullPage: true });
  await disclosure.click();
  const card = page.getByRole("region", { name: "Save your layout link" }).filter({ visible: true }).first();
  await expect(card).toBeVisible({ timeout: 15_000 });
  await expect(card.getByRole("checkbox")).not.toBeChecked();
  await card.getByRole("textbox", { name: "Email address for your 3D lot link" }).fill("layout-owner@example.test");
  await card.screenshot({ path: testInfo.outputPath("email-link-form.png") });
  await expect(card.getByRole("textbox", { name: "Email address for your 3D lot link" })).toHaveValue("layout-owner@example.test");
  await card.getByRole("button", { name: "Email My 3D Link" }).click();
  await expect(card.getByRole("status")).toContainText("couldn't email it right now");
  expect(captured).toMatchObject({ email: "layout-owner@example.test", marketingOptIn: false, address: parcel.address, scenario: { liveParcel: { address: parcel.address } } });
  expect(new URL(captured!.scenarioUrl as string).origin).toBe("https://lotfoundry.net");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("email-link-queued.png"), fullPage: true });
  // Web guests now check out anonymously, so the account dialog opens from the header (or after purchase).
  await page.getByRole("button", { name: /^Sign in$/i }).filter({ visible: true }).first().click();
  await expect(page.getByRole("dialog").getByLabel("Email", { exact: true })).toHaveValue("layout-owner@example.test");
});

test("emailed layout restores the real parcel without a guest lookup and survives auth", async ({ page }, testInfo) => {
  await mockTestOwnerAuth(page);
  let parcelLookups = 0;
  await page.route("**/api/parcel?**", async (route) => { parcelLookups++; await route.abort(); });
  await page.route("**/api/studio/scenario-link/*", (route) => route.fulfill({ json: { scenario: EMAIL_SCENARIO } }));
  const url = new URL(buildScenarioShareUrl(EMAIL_SCENARIO, "a".repeat(48)));
  url.searchParams.set("step", "certificate");
  await page.goto(`${url.pathname}${url.search}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByText(EMAIL_SCENARIO.liveParcel!.address).first()).toBeVisible({ timeout: 30_000 });
  const disclosure = page.locator("summary").filter({ hasText: "Email this layout for later" }).filter({ visible: true }).first();
  await expect(disclosure).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("textbox", { name: "Email address for your 3D lot link" })).not.toBeVisible();
  const purchase = page.getByRole("button", { name: /Continue to secure checkout/ }).filter({ visible: true }).first();
  await expect(purchase).toBeVisible();
  expect(await disclosure.evaluate((summary) => {
    const button = Array.from(document.querySelectorAll("button")).find((node) => node.textContent?.includes("Continue to secure checkout"));
    return Boolean(button && (button.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING));
  })).toBe(true);
  await disclosure.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("certificate-email-collapsed.png"), fullPage: true });
  await disclosure.click();
  const card = page.getByRole("region", { name: "Save your layout link" }).filter({ visible: true }).first();
  await expect(card).toBeVisible({ timeout: 15_000 });
  expect(parcelLookups).toBe(0);
  await expect.poll(() => new URL(page.url()).searchParams.get("layout")).toBe("a".repeat(48));
  await card.screenshot({ path: testInfo.outputPath("email-link-restored.png") });
  // Web guests now check out anonymously; an existing member signs in from the header.
  await page.getByRole("button", { name: /^Sign in$/i }).filter({ visible: true }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Email", { exact: true }).fill("studio-owner@example.test");
  await dialog.getByLabel("Password", { exact: true }).fill("Browser-fixture-only-123!");
  await dialog.locator('button[type="submit"]').click();
  await expect(dialog).not.toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(EMAIL_SCENARIO.liveParcel!.address).first()).toBeVisible({ timeout: 15_000 });
  expect(parcelLookups).toBe(0);
});

test("free link form fits a 320px phone with readable inputs and touch targets", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await mockTestOwnerAuth(page);
  await page.route("**/api/studio/scenario-link/*", (route) => route.fulfill({ json: { scenario: EMAIL_SCENARIO } }));
  const url = new URL(buildScenarioShareUrl(EMAIL_SCENARIO, "c".repeat(48)));
  url.searchParams.set("step", "certificate");
  await page.goto(`${url.pathname}${url.search}`, { waitUntil: "domcontentloaded" });
  const disclosure = page.locator("summary").filter({ hasText: "Email this layout for later" }).filter({ visible: true }).first();
  await expect(disclosure).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("textbox", { name: "Email address for your 3D lot link" })).not.toBeVisible();
  const purchase = page.getByRole("button", { name: /Continue to secure checkout/ }).filter({ visible: true }).first();
  await expect(purchase).toBeVisible();
  expect(await disclosure.evaluate((summary) => {
    const button = Array.from(document.querySelectorAll("button")).find((node) => node.textContent?.includes("Continue to secure checkout"));
    return Boolean(button && (button.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING));
  })).toBe(true);
  await disclosure.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("certificate-email-collapsed.png"), fullPage: true });
  await disclosure.click();
  const card = page.getByRole("region", { name: "Save your layout link" }).filter({ visible: true }).first();
  await expect(card).toBeVisible({ timeout: 30_000 });
  await card.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await card.getByRole("textbox").evaluate((input) => parseFloat(getComputedStyle(input).fontSize))).toBeGreaterThanOrEqual(16);
  const button = await card.getByRole("button", { name: "Email My 3D Link" }).boundingBox();
  expect(button!.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: testInfo.outputPath("email-link-320px.png"), fullPage: true });
});
