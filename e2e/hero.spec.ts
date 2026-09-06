import { expect, test } from "@playwright/test";

test.describe("A lot more landing", () => {
  test("keeps address entry private and preserves it between the two forms", async ({
    page,
  }) => {
    const paidRequests: string[] = [];
    page.on("request", (request) => {
      if (/\/api\/(suggest|parcel|geocode)/.test(request.url()))
        paidRequests.push(request.url());
    });
    await page.goto("/");
    const hero = page.getByRole("region", {
      name: "Explore your lot",
      exact: true,
    });
    await hero.getByRole("button", { name: "Explore my lot" }).click();
    await expect(hero.getByRole("alert")).toHaveText(
      "Enter an address to explore your lot.",
    );
    await expect(
      hero.getByLabel("Property address", { exact: true }),
    ).toBeFocused();
    await hero
      .getByLabel("Property address", { exact: true })
      .fill("456 Pine St, Denver, CO");
    await expect(page.locator("#closing-address")).toHaveValue(
      "456 Pine St, Denver, CO",
    );
    await hero.getByRole("button", { name: "Explore my lot" }).click();
    const dialog = page
      .getByRole("dialog")
      .filter({ hasText: /sign in|sign up|create account/i });
    await expect(dialog).toBeVisible({ timeout: 15000 });
    expect(page.url()).not.toMatch(/456|Pine|Denver|[?&]q=/i);
    expect(paidRequests).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(
      hero.getByRole("button", { name: "Explore my lot" }),
    ).toBeFocused();
    await expect(
      hero.getByLabel("Property address", { exact: true }),
    ).toHaveValue("456 Pine St, Denver, CO");
  });

  test("transforms the example using keyboard controls, including reduced motion", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const controls = page.getByRole("group", {
      name: "Property illustration view",
    });
    await controls.getByRole("button", { name: /Today/ }).focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("img", { name: /existing house and an empty yard/ }),
    ).toBeVisible();
    await expect(
      controls.getByRole("button", { name: /Today/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("img", { name: /proposed footprint outlined/ }),
    ).toBeVisible();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("img", { name: /orange backyard home/ }).first(),
    ).toBeVisible();
    await expect(
      controls.getByRole("button", { name: /The possibility/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("canvas, video")).toHaveCount(0);
  });

  test("updates income and payback together while keeping demo context visible", async ({
    page,
  }) => {
    await page.goto("/");
    const numbers = page.locator("#numbers");
    await expect(numbers.getByText("$2,050", { exact: false })).toBeVisible();
    await expect(numbers.getByText("15.1", { exact: false })).toBeVisible();
    await numbers.getByRole("button", { name: "market", exact: true }).click();
    await expect(numbers.getByText("$2,350", { exact: false })).toBeVisible();
    await expect(numbers.getByText("13.2", { exact: false })).toBeVisible();
    await expect(numbers.getByText(/SEATTLE DEMO/)).toBeVisible();
    await numbers.locator("summary").click();
    await expect(
      numbers.getByText(
        /curated Seattle demo, calculated by the studio engine/,
      ),
    ).toBeVisible();
    await expect(
      numbers.getByText(/annual net operating income is \$19,035/),
    ).toBeVisible();
  });

  test("supports intent selection, report inspection, and honest purchase copy", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "For income", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "A backyard with earning potential." }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "The estimates", exact: true })
      .click();
    const report = page.getByRole("article", {
      name: "Sample feasibility report",
    });
    await expect(report.getByText("$2,050", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Next steps", exact: true }).click();
    await expect(report.getByText(/Confirm property boundaries/)).toBeVisible();
    await expect(
      page.getByText(/Complete certificate .* one-time/),
    ).toBeVisible();
    await page
      .getByText("Does this mean I can build?", { exact: true })
      .click();
    await expect(
      page.getByText(
        /It does not grant a permit or guarantee a buildable design/,
      ),
    ).toBeVisible();
  });

  test("does not load Firebase or metered APIs on initial render", async ({
    page,
  }) => {
    const requests: string[] = [];
    page.on("request", (request) => {
      if (
        /firebase|firestore|identitytoolkit|\/api\/(suggest|parcel|geocode)/i.test(
          request.url(),
        )
      )
        requests.push(request.url());
    });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /A LOT MORE/ }),
    ).toBeVisible();
    await expect(page.locator("#hero-address")).toBeVisible();
    expect(requests).toEqual([]);
  });

  test("mobile navigation closes on Escape and restores focus", async ({
    page,
    viewport,
  }) => {
    test.skip(!viewport || viewport.width > 800, "mobile navigation only");
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    const menu = page.getByRole("navigation", { name: "Mobile navigation" });
    await menu.getByRole("link", { name: "The report", exact: true }).focus();
    await page.keyboard.press("Escape");
    await expect(menu).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
  });
});
