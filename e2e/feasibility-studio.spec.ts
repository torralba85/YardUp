import { expect, test } from "@playwright/test";

test.describe("Public LotFoundry flows", () => {
  test("loads the landing page with the lot survey hero", async ({ page }, testInfo) => {
    await page.goto("/");

    await expect(page).toHaveTitle("California ADU Feasibility Check: Cost & Rent | LotFoundry");
    await expect(
      page.getByRole("heading", { level: 1, name: "Explore an ADU on your lot in 3D." }),
    ).toBeVisible();
    // The property illustration anchors the new landing hero.
    await expect(
      page.getByRole("radiogroup", { name: "Property illustration view" }),
    ).toBeVisible();
    // Always-rendered closing CTA heading (mode-independent).
    await expect(
      page.getByRole("heading", { name: /It starts with your address/i }),
    ).toBeVisible();
    // Survey-instrument search is the hero CTA.
    await expect(page.getByRole("button", { name: /Explore my lot/i }).first()).toBeVisible();

    await page.screenshot({
      path: testInfo.outputPath("landing-page.png"),
      fullPage: true,
    });
  });

  test("signup exposes homeowner and builder account choices", async ({ page }) => {
    await page.goto("/signup");

    await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();
    await expect(page.getByRole("radio", { name: /Homeowner/i })).toBeVisible();
    await expect(page.getByRole("radio", { name: /Builder/i })).toBeVisible();
    await page.getByRole("radio", { name: /Builder/i }).click();
    await expect(page.getByRole("button", { name: /Create account/i })).toBeVisible();
  });

  test("studio is open to guests", async ({ page, viewport }) => {
    await page.goto("/studio");

    // Guests are no longer redirected — mobile gets the five-reveal journey,
    // desktop gets the dashboard.
    await expect(page).toHaveURL(/\/studio/);
    if (viewport && viewport.width < 1024) {
      await expect(
        page.getByRole("heading", { name: /start with your address/i }),
      ).toBeVisible();
    } else {
      await expect(page.getByRole("navigation", { name: "Studio steps" })).toBeVisible();
      await expect(page.getByRole("button", { name: /Rules & Fit/i })).toBeVisible();
    }
  });

  test("builder dashboard requires sign in and preserves the next route", async ({ page }) => {
    await page.goto("/builder");

    await expect(page).toHaveURL(/\/login\?next=\/builder$/);
    await expect(page.getByRole("heading", { name: "Builder sign in" })).toBeVisible();
  });

  test("guest sees a locked planning preview instead of the permit breakdown", async ({ page, viewport }) => {
    // Desktop-only: the mobile journey surfaces permit caveats as the Check
    // reveal's verify items instead of the full permit guide panel (#130).
    test.skip(!viewport || viewport.width < 1024, "desktop-only");
    await page.goto("/studio");
    await page.getByRole("button", { name: /Rules & Fit/i }).click();
    await expect(page.getByRole("region", { name: "Free property preview" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Seattle ADU Starter Guide/i })).toHaveCount(0);
  });

  test("guest can browse Inspiration Gallery and apply a demo template", async ({ page, viewport }) => {
    test.setTimeout(60_000);
    // Desktop-only: the mobile journey keeps Shape to broad size/style
    // choices; the gallery is not part of the default mobile path (#130).
    test.skip(!viewport || viewport.width < 1024, "desktop-only");
    await page.goto("/studio");
    // Navigating via sidebar navigation button
    await page.getByRole("button", { name: /Design/i }).click();
    await page.getByText("Browse designs").click();
    await expect(page.getByRole("heading", { name: /A small home, considered/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("heading", { name: "Courtyard Studio" })).toBeVisible();

    // Click Apply on the first inspiration card (Courtyard Studio)
    const applyButton = page.getByRole("button", { name: /Apply to Studio/i }).first();
    await applyButton.click();

    // The applied template updates the active ADU config in the studio.
    await expect(page.getByRole("heading", { name: "Design your ADU", level: 2 }).first()).toBeVisible();
    await expect(page.getByRole("radio", { name: /Cedar/i })).toBeChecked();
    await expect(page.getByRole("radio", { name: /Shed/i })).toBeChecked();
  });

  test("Design keeps setup and secondary tools out of the initial workspace", async ({ page, isMobile }) => {
    test.setTimeout(60_000);
    test.skip(isMobile, "Desktop Design; mobile uses the existing journey");
    await page.goto("/studio?parcel=oak-street");
    await page.getByRole("navigation", { name: "Studio steps" }).getByRole("button", { name: /Design/ }).click();
    await expect(page.getByRole("heading", { name: "Design your ADU", exact: true })).toBeVisible();
    await expect(page.getByRole("radiogroup", { name: "ADU footprint size" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Search property address" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Reset", exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Courtyard Studio" })).not.toBeVisible();
    await expect(page.getByRole("region", { name: "Feasibility metrics" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Numbers & readiness" })).toHaveCount(0);
    await page.getByText("Tools", { exact: true }).click();
    await page.getByRole("button", { name: "Plan utilities" }).click();
    await expect(page.getByText(/Click the primary house in the 3D model/)).toBeVisible();
    await page.getByText("Tools", { exact: true }).click();
    await page.getByText("Tools", { exact: true }).click();
    await expect(page.getByRole("button", { name: "Plan utilities" })).toHaveAttribute("aria-pressed", "false");
    await page.getByText("Move or rotate ADU", { exact: true }).click();
    await page.getByRole("spinbutton", { name: "X position (ft)" }).fill("100");
    await page.getByRole("spinbutton", { name: "X position (ft)" }).press("Tab");
    await page.getByText("Tools", { exact: true }).click();
    await expect(page.getByText("Setback conflict.", { exact: true })).toBeVisible();
    await expect(page.getByRole("group", { name: "Interactive ADU placement model" })).toBeVisible();
  });

  test("back navigation steps through the journey instead of leaving the study", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "The five-reveal journey is the mobile layout only");

    await page.goto("/studio");
    await page.getByRole("radio", { name: /Seattle/i }).click();
    await page.getByRole("button", { name: "See the Seattle example" }).click();
    await expect(page.getByRole("heading", { name: /could earn/i })).toBeVisible();

    await page.getByRole("button", { name: /Shape your ADU/i }).click();
    // ShapeStep's own <h2> is "Pick a direction." — the word "Shape" only
    // appears in the section's aria-label and the rail's step chip, neither
    // of which is heading-role, so assert on the actual heading text.
    await expect(page.getByRole("heading", { name: /Pick a direction/i })).toBeVisible();

    await page.goBack();

    // The study survives: we land on the previous reveal, still inside the app.
    await expect(page.getByRole("heading", { name: /could earn/i })).toBeVisible();
  });
});
