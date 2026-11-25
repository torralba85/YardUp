import { expect, test, type Page } from "@playwright/test";
import { EMAIL_SCENARIO } from "../test/fixtures/email-scenario";
import { buildScenarioShareUrl } from "../lib/scenario-url";
import { mockTestOwnerAuth } from "./fixtures/studio-auth";

// A common laptop viewport. At this height the 2026-10-18 shell clipped every
// step: the step body grew to its tallest pane inside a locked `main`, so the
// rail's last controls (the certificate CTA among them) could not be scrolled
// to, the stage left a chalk gap under Tools, and the page itself scrolled.
test.use({ viewport: { width: 1366, height: 768 } });

test.skip(({ isMobile }) => isMobile, "Desktop shell only");

// A recorded decision keeps the fixed consent bar from covering the guide bar.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "lf-analytics-consent",
      JSON.stringify({ decision: "denied", version: 3, decidedAt: new Date().toISOString() }),
    );
  });
});

async function openStep(page: Page, label: RegExp) {
  await page.getByRole("navigation", { name: "Studio steps" }).getByRole("button", { name: label }).click();
}

async function stepGeometry(page: Page) {
  return page.evaluate(() => {
    const main = document.querySelector<HTMLElement>("#main-content")!;
    const step = main.querySelector<HTMLElement>(":scope > section")!;
    return {
      documentHeight: document.scrollingElement!.scrollHeight,
      viewportHeight: window.innerHeight,
      mainHeight: main.clientHeight,
      stepHeight: Math.round(step.getBoundingClientRect().height),
    };
  });
}

test("desktop Studio fits one viewport and every pane reaches its last control", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/studio?parcel=coyote-brush");
  const overview = page.getByTestId("studio-overview");
  await expect(overview).toBeVisible();

  for (const step of [/Your lot/, /Rules & fit/, /Design/, /Certificate/, /Builders/]) {
    await openStep(page, step);
    const geometry = await stepGeometry(page);
    expect(geometry.documentHeight, `${step} page scroll`).toBeLessThanOrEqual(geometry.viewportHeight);
    expect(geometry.stepHeight, `${step} step body`).toBeLessThanOrEqual(geometry.mainHeight);
  }

  // The planning guide stays on screen as the last row of the viewport.
  const overviewBox = (await overview.boundingBox())!;
  expect(overviewBox.y + overviewBox.height).toBeLessThanOrEqual(768);
});

test("Rules & Fit stage fills its column and the certificate CTA stays in view", async ({ page }) => {
  await page.goto("/studio?parcel=coyote-brush");
  await openStep(page, /Rules & fit/);

  const scene = page.getByRole("region", { name: "Parcel massing scene" });
  await expect(scene).toBeVisible();
  const gap = await scene.evaluate((el) => {
    const column = el.parentElement!;
    return Math.round(column.getBoundingClientRect().bottom - el.getBoundingClientRect().bottom);
  });
  expect(gap, "chalk left under the stage").toBeLessThanOrEqual(1);

  const cta = page.getByRole("region", { name: "Free property preview" }).getByRole("button", { name: "See what’s behind the numbers" });
  const ctaBox = (await cta.boundingBox())!;
  const overviewBox = (await page.getByTestId("studio-overview").boundingBox())!;
  expect(ctaBox.y).toBeGreaterThanOrEqual(0);
  expect(ctaBox.y + ctaBox.height).toBeLessThanOrEqual(overviewBox.y);

  // Opening Tools trades canvas height for the tools; nothing is pushed off-screen.
  await page.getByText("Tools", { exact: true }).click();
  // The site plan PDF is a certificate deliverable, so this free session sees the unlock.
  await expect(page.getByRole("button", { name: "Unlock site plan PDF" })).toBeVisible();
  const geometry = await stepGeometry(page);
  expect(geometry.documentHeight).toBeLessThanOrEqual(geometry.viewportHeight);
});

test("a signed-in real lot leaves no blank page below the Studio", async ({ page }) => {
  // The email card's sr-only label had no positioned ancestor, escaped the
  // clipped `main`, and stretched the page by hundreds of pixels of chalk.
  test.setTimeout(90_000);
  await mockTestOwnerAuth(page);
  await page.route("**/api/parcel?**", (route) => route.abort());
  await page.route("**/api/studio/scenario-link/*", (route) => route.fulfill({ json: { scenario: EMAIL_SCENARIO } }));
  const url = new URL(buildScenarioShareUrl(EMAIL_SCENARIO, "a".repeat(48)));
  url.searchParams.set("step", "certificate");
  await page.goto(`${url.pathname}${url.search}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByText(EMAIL_SCENARIO.liveParcel!.address).first()).toBeVisible({ timeout: 30_000 });
  await page.locator("summary").filter({ hasText: "Email this layout for later" }).click();
  const card = page.getByRole("region", { name: "Save your layout link" }).filter({ visible: true }).first();
  await expect(card).toBeVisible({ timeout: 15_000 });

  for (const step of [/Certificate/, /Rules & fit/]) {
    await openStep(page, step);
    if (String(step).includes("Certificate")) {
      await expect(page.locator("summary").filter({ hasText: "Email this layout for later" })).toBeVisible();
    } else {
      await expect(page.locator("summary").filter({ hasText: "Email this layout for later" })).toHaveCount(0);
      await expect(page.getByRole("region", { name: "Save your layout link" })).toBeVisible();
    }
    const geometry = await stepGeometry(page);
    expect(geometry.documentHeight, `${step} page scroll`).toBeLessThanOrEqual(geometry.viewportHeight);
  }
});

test("the builder connect form scrolls to its Submit button", async ({ page }) => {
  // The form rendered outside every scrolling pane, so the locked `main`
  // clipped Submit below the planning guide bar. Scroll with the wheel, as a
  // person would: scrollIntoView also moves overflow-hidden boxes and hides it.
  await page.goto("/studio?parcel=coyote-brush");
  await openStep(page, /Builders/);
  await page.getByRole("button", { name: "Connect with builders" }).click();
  const form = page.getByRole("region", { name: "Connect with local builders" });
  await expect(form).toBeVisible();

  const formBox = (await form.boundingBox())!;
  await page.mouse.move(formBox.x + formBox.width / 2, formBox.y + 40);
  await page.mouse.wheel(0, 2_000);

  // Signed out, Submit reads "Sign in to send"; its place in the form is the same.
  const submit = page.getByRole("button", { name: "Sign in to send" });
  await expect(submit).toBeInViewport();
  const submitBox = (await submit.boundingBox())!;
  const overviewBox = (await page.getByTestId("studio-overview").boundingBox())!;
  expect(submitBox.y + submitBox.height).toBeLessThanOrEqual(overviewBox.y);
  const geometry = await stepGeometry(page);
  expect(geometry.documentHeight).toBeLessThanOrEqual(geometry.viewportHeight);
  expect(geometry.stepHeight).toBeLessThanOrEqual(geometry.mainHeight);
});

test("the planning guide opens over the Studio without scrolling the page", async ({ page }) => {
  await page.goto("/studio?parcel=coyote-brush");
  const overview = page.getByTestId("studio-overview");
  await overview.getByText("Planning guide & methodology").click();
  const help = overview.getByRole("link", { name: "Help" });
  await expect(help).toBeInViewport();
  const geometry = await stepGeometry(page);
  expect(geometry.documentHeight).toBeLessThanOrEqual(geometry.viewportHeight);
});
