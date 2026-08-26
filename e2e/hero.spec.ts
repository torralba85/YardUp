import { expect, test } from "@playwright/test";

test.describe("Landing survey hero", () => {
  test("shows the earn headline, address instrument, and aerial scene", async ({ page }) => {
    await page.goto("/");

    const hero = page.locator('section[aria-label="Lot survey"]');
    await expect(
      hero.getByRole("heading", { name: /see what your backyard can earn/i }),
    ).toBeVisible();
    await expect(hero.getByLabel(/property address/i)).toBeVisible();
    await expect(hero.getByRole("button", { name: /run feasibility/i })).toBeVisible();

    // The aerial poster is always present (no-JS/reduced motion floor);
    // the Remotion composition draws its own copy on top, so match by alt.
    await expect(hero.getByRole("img", { name: /aerial view of a suburban lot/i })).toBeVisible();
    await expect(hero.locator("video")).toHaveCount(0);

    const box = await hero.locator(".sticky").boundingBox();
    expect(box?.height ?? 0).toBeGreaterThan(560);
  });

  test("mounts the scroll-scrubbed Remotion player when motion is allowed", async ({ page }) => {
    await page.goto("/");
    const hero = page.locator('section[aria-label="Lot survey"]');
    await expect(hero.getByTestId("blue-hour-player")).toBeVisible();
  });

  test("leads the first viewport with the estimated-rent verdict plate", async ({ page }) => {
    await page.goto("/");
    const hero = page.locator('section[aria-label="Lot survey"]');
    const verdict = hero.getByRole("complementary", { name: /projected rent verdict/i });
    await expect(verdict).toBeAttached();
    await expect(verdict.getByText(/sample for cities we cover/i)).toBeAttached();

    // Anchored inside the first viewport.
    const box = await verdict.boundingBox();
    const height = page.viewportSize()?.height ?? 0;
    expect(box).not.toBeNull();
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(height + 2);
  });

  test("counts the rent verdict up as the survey scrubs to its end", async ({ page }) => {
    await page.goto("/");
    const hero = page.locator('section[aria-label="Lot survey"]');
    await hero.evaluate((element) => {
      const top = window.scrollY + element.getBoundingClientRect().top;
      const travel = element.clientHeight - window.innerHeight;
      window.scrollTo(0, top + travel * 0.98);
    });
    const verdict = hero.getByRole("complementary", { name: /projected rent verdict/i });
    await expect(verdict.getByText("$2,340")).toBeVisible();
    await expect(verdict.getByText(/feasible · estimate only/i)).toBeVisible();
  });

  test("asks a guest to sign in before handing the address off, without leaking it", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByLabel(/property address/i).fill("456 Pine St, Denver, CO");
    await page.getByRole("button", { name: /run feasibility/i }).click();

    // Real-address lookup spends metered provider quota, so handoff is gated on
    // sign-in (`a1d7529`). The gate itself is lazily loaded, so give the chunk
    // and Firebase time to come up before the modal appears.
    await expect(
      page.getByRole("dialog").filter({ hasText: /sign in|sign up|create account/i }),
    ).toBeVisible({ timeout: 15000 });

    // The guest stays put: no studio navigation without a session.
    await expect(page).toHaveURL(/\/$/);
    // Privacy rule: a guest's typed address must never land in the URL/history,
    // whether the handoff completes or is gated.
    expect(page.url()).not.toMatch(/456|Pine|Denver|[?&]q=/i);
  });

  test("keeps the landing page free of the Firebase SDK until a visitor acts", async ({
    page,
  }) => {
    const firebaseRequests: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (/firebase|firestore|identitytoolkit/i.test(url)) {
        firebaseRequests.push(url);
      }
    });

    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /see what your backyard can earn/i }),
    ).toBeVisible();

    // `app/(firebase)/layout.tsx` scopes the ~479 KB client SDK to that route
    // group precisely so the marketing landing never pays for it. Loading it
    // here would mean something on `/` reached for auth during render again.
    expect(firebaseRequests).toEqual([]);
  });

  test("keeps the still photograph and skips the player under reduced motion", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");
    const hero = page.locator('section[aria-label="Lot survey"]');
    await expect(hero.getByRole("img", { name: /aerial view of a suburban lot/i })).toBeVisible();
    await expect(hero.getByTestId("blue-hour-player")).toHaveCount(0);
    // No pin: the track collapses to a single viewport for reduced motion.
    const track = await hero.boundingBox();
    const viewport = page.viewportSize()?.height ?? 0;
    expect(track?.height ?? 0).toBeLessThanOrEqual(Math.max(viewport, 640) + 2);
    await context.close();
  });
});
