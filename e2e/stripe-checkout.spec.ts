import { expect, test, type Page, type Request } from "@playwright/test";
import { mockTestOwnerAuth } from "./fixtures/studio-auth";

// Browser-side audit of the web certificate checkout. The Stripe API and the
// hosted Checkout page are both stubbed: no key, no Session, and no charge ever
// leaves the test. Server-side Session creation, the webhook, and fulfilment
// are covered by the Vitest route suites under app/api/stripe/.

const STRIPE_CHECKOUT_URL = "https://checkout.stripe.com/c/pay/cs_test_e2e_fixture";
const CERTIFICATE_ROUTE = "**/api/stripe/checkout-certificate";

async function signIn(page: Page) {
  await mockTestOwnerAuth(page);
  await page.goto("/login?next=/studio");
  await page.getByLabel("Email", { exact: true }).fill("studio-owner@example.test");
  await page.getByLabel("Password", { exact: true }).fill("Browser-fixture-only-123!");
  await page.locator('button[type="submit"]').click();
  await expect(page.getByRole("heading", { name: "Start with your property." })).toBeVisible();
}

function unlockButton(page: Page) {
  return page.getByRole("button", { name: /Unlock property certificate/ }).filter({ visible: true }).first();
}

async function openCertificateStep(page: Page, query = "parcel=oak-street&step=certificate") {
  await page.goto(`/studio?${query}`);
  await expect(unlockButton(page)).toBeVisible();
}

test.describe("web certificate checkout", () => {
  test("an unresolved Checkout return offers recovery instead of another purchase", async ({ page }, testInfo) => {
    test.setTimeout(60000);
    await signIn(page);
    await page.goto("/studio?parcel=oak-street&cert=oak-street&checkout=returned");
    await expect(page.getByText("Checking certificate access. Your access record may still be arriving.").filter({ visible: true }).first()).toBeVisible();
    await expect(unlockButton(page)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Check again" }).filter({ visible: true }).first()).toBeVisible({ timeout: 40000 });
    await expect(page.getByText(/This does not mean your payment failed/).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "My Certificates" }).filter({ visible: true }).first()).toHaveAttribute("href", "/certificates");
    await page.screenshot({ path: testInfo.outputPath("certificate-access-unverified.png"), fullPage: true });
    await page.getByRole("button", { name: "Check again" }).filter({ visible: true }).first().click();
    await expect(page.getByText("Checking certificate access. Your access record may still be arriving.").filter({ visible: true }).first()).toBeVisible();
    await expect(unlockButton(page)).toHaveCount(0);
  });
  test("a signed-in buyer is sent to Stripe with a well-formed checkout request", async ({ page }) => {
    await signIn(page);

    let checkoutRequest: Request | null = null;
    await page.route(CERTIFICATE_ROUTE, async (route) => {
      checkoutRequest = route.request();
      await route.fulfill({ json: { url: STRIPE_CHECKOUT_URL } });
    });
    await page.route("https://checkout.stripe.com/**", (route) =>
      route.fulfill({ contentType: "text/html", body: "<title>Stripe Checkout (stub)</title><h1>Stub checkout</h1>" }),
    );

    await openCertificateStep(page);
    await unlockButton(page).click();

    await page.waitForURL(STRIPE_CHECKOUT_URL);
    await expect(page.getByRole("heading", { name: "Stub checkout" })).toBeVisible();

    expect(checkoutRequest).not.toBeNull();
    const request = checkoutRequest as unknown as Request;
    expect(request.method()).toBe("POST");
    expect(request.headers()["authorization"]).toMatch(/^Bearer .+/);
    const body = request.postDataJSON() as Record<string, unknown>;
    expect(typeof body.certKey).toBe("string");
    expect((body.certKey as string).length).toBeGreaterThan(0);
    expect(typeof body.parcelName).toBe("string");
    // A stable attempt id is what keeps a double click from minting two Sessions.
    expect(typeof body.checkoutAttemptId).toBe("string");
    expect((body.checkoutAttemptId as string).length).toBeGreaterThan(0);
    // The scenario query rides along so Stripe returns the buyer to the same lot.
    expect(body.returnSearch).toEqual(expect.stringContaining("parcel=oak-street"));
  });

  test("a retried checkout reuses the same attempt id", async ({ page }) => {
    await signIn(page);

    const attemptIds: string[] = [];
    await page.route(CERTIFICATE_ROUTE, async (route) => {
      attemptIds.push(String(route.request().postDataJSON()?.checkoutAttemptId));
      await route.fulfill({ status: 502, json: { error: "Could not start checkout. Please try again." } });
    });

    await openCertificateStep(page);
    await unlockButton(page).click();
    await expect(page.getByText("Could not start checkout. Please try again.").first()).toBeVisible();
    await expect(unlockButton(page)).toBeEnabled();
    await unlockButton(page).click();
    await expect.poll(() => attemptIds.length).toBe(2);
    expect(attemptIds[0]).toBe(attemptIds[1]);
  });

  test("a checkout failure is reported and leaves the buyer on the paywall", async ({ page }) => {
    await signIn(page);
    await page.route(CERTIFICATE_ROUTE, (route) =>
      route.fulfill({ status: 503, json: { error: "Payments are not available." } }),
    );

    await openCertificateStep(page);
    await unlockButton(page).click();

    await expect(page.getByText("Payments are not available.").first()).toBeVisible();
    await expect(page).toHaveURL(/\/studio\?/);
    await expect(unlockButton(page)).toBeEnabled();
  });

  test("an invalid Checkout URL stays on the paywall instead of navigating", async ({ page }) => {
    await signIn(page);
    await page.route(CERTIFICATE_ROUTE, (route) =>
      route.fulfill({ json: { url: "not-a-checkout-url" } }),
    );

    await openCertificateStep(page);
    await unlockButton(page).click();

    await expect(page.getByText("Could not start checkout. Please try again.").first()).toBeVisible();
    await expect(page).toHaveURL(/\/studio\?/);
    await expect(unlockButton(page)).toBeEnabled();
  });

  test("a network failure reaching the checkout API is reported", async ({ page }) => {
    await signIn(page);
    await page.route(CERTIFICATE_ROUTE, (route) => route.abort("connectionrefused"));

    await openCertificateStep(page);
    await unlockButton(page).click();

    await expect(
      page.getByText("Could not reach the payment service. Check your connection and try again.").first(),
    ).toBeVisible();
    await expect(unlockButton(page)).toBeEnabled();
  });

  test("returning from a cancelled Stripe checkout shows a calm notice once", async ({ page }) => {
    await signIn(page);
    await openCertificateStep(page, "parcel=oak-street&step=certificate&checkout=cancelled");

    const notice = page.getByText("Checkout cancelled. Your property analysis is still here whenever you're ready.");
    await expect(notice.first()).toBeVisible();
    // The one-shot marker is stripped so a reload never re-reports it.
    await expect(page).not.toHaveURL(/checkout=cancelled/);
    await page.reload();
    await expect(page.getByRole("navigation", { name: /Studio steps|Journey progress/ }).first()).toBeVisible();
    await expect(page).not.toHaveURL(/checkout=cancelled/);
    await expect(notice).toHaveCount(0);
  });

  test("retrying checkout keeps the old cancellation cleared across responsive remounts", async ({ page }) => {
    await signIn(page);
    await page.route(CERTIFICATE_ROUTE, (route) =>
      route.fulfill({ status: 502, json: { error: "Could not start checkout. Please try again." } }),
    );
    await openCertificateStep(page, "parcel=oak-street&step=certificate&checkout=cancelled");
    const notice = page.getByText("Checkout cancelled. Your property analysis is still here whenever you're ready.");
    await expect(notice.first()).toBeVisible();
    await unlockButton(page).click();
    await expect(page.getByText("Could not start checkout. Please try again.").first()).toBeVisible();
    await expect(notice).toHaveCount(0);

    const desktop = (page.viewportSize()?.width ?? 0) >= 1024;
    await page.setViewportSize(desktop ? { width: 390, height: 844 } : { width: 1440, height: 900 });
    await expect(unlockButton(page)).toBeVisible();
    await expect(notice).toHaveCount(0);
  });

  test("a guest sees the price, then creates an account before any checkout request", async ({ page }) => {
    let checkoutCalls = 0;
    await page.route(CERTIFICATE_ROUTE, async (route) => {
      checkoutCalls += 1;
      await route.fulfill({ status: 401, json: { error: "unauthorized" } });
    });

    await page.goto("/studio?parcel=oak-street&step=certificate");
    const cta = page.getByRole("button", { name: /Continue to secure checkout/ }).filter({ visible: true }).first();
    await expect(cta).toBeVisible();
    await cta.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // Purchase intent opens the account step in sign-up mode, not "Welcome back".
    await expect(dialog.getByText("Save your property")).toBeVisible();
    expect(checkoutCalls).toBe(0);
  });

  test("a guest who buys on a real address lands in Checkout after signing in", async ({ page }) => {
    // Public synthetic lot. Signing in swaps /studio to the signed-in gate,
    // remounting the Studio; the purchase must survive that remount.
    const lot = {
      address: "1421 NE 88th St", city: "Seattle, WA 98115", state: "WA", zip: "98115",
      lat: 47.69217, lng: -122.31232, source: "fallback", zoning: "R-1 (estimated)",
      boundaryGeoJson: null, lotArea: 5000, lotWidth: 40, lotLength: 125,
      existingHouseSqft: 0, maxLotCoveragePercent: 40,
      setbacks: { front: 20, rear: 20, side: 5 },
    };
    await mockTestOwnerAuth(page);
    await page.route("**/api/geocode?**", (route) =>
      route.fulfill({ json: { lat: lot.lat, lng: lot.lng, formattedAddress: "1421 NE 88th St, Seattle, WA 98115" } }),
    );
    await page.route("**/api/parcel?**", (route) => route.fulfill({ json: lot }));
    const checkoutBodies: Record<string, unknown>[] = [];
    await page.route(CERTIFICATE_ROUTE, async (route) => {
      checkoutBodies.push(route.request().postDataJSON() as Record<string, unknown>);
      await route.fulfill({ json: { url: STRIPE_CHECKOUT_URL } });
    });
    await page.route("https://checkout.stripe.com/**", (route) =>
      route.fulfill({ contentType: "text/html", body: "<title>Stripe Checkout (stub)</title><h1>Stub checkout</h1>" }),
    );

    // The landing's address handoff, as a guest.
    await page.goto("/privacy");
    await page.evaluate(() => window.sessionStorage.setItem("lf:pending-address", "1421 NE 88th St, Seattle, WA"));
    await page.goto("/studio?step=certificate");
    const cta = page.getByRole("button", { name: /Continue to secure checkout/ }).filter({ visible: true }).first();
    await expect(cta).toBeVisible();
    await expect(page.getByText("1421 NE 88th St").first()).toBeVisible();
    await cta.click();

    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Already have an account? Sign in" }).click();
    await dialog.getByLabel("Email", { exact: true }).fill("studio-owner@example.test");
    await dialog.getByLabel("Password", { exact: true }).fill("Browser-fixture-only-123!");
    await dialog.locator('button[type="submit"]').click();

    await page.waitForURL(STRIPE_CHECKOUT_URL);
    await expect(page.getByRole("heading", { name: "Stub checkout" })).toBeVisible();
    expect(checkoutBodies).toHaveLength(1);
    expect(checkoutBodies[0].certKey).toBe("1421-ne-88th-st-seattle-wa-98115");
  });
});
