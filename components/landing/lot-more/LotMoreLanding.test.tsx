import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LotMoreLanding } from "./LotMoreLanding";
import { GUEST_LOOKUP_LIMIT, consumeGuestLookup } from "@/lib/guest-lookup";
import {
  calculateFeasibility,
  defaultAduConfig,
  defaultFinancialAssumptions,
  getParcelById,
  parcelPresets,
} from "@/lib/feasibility";
import { mergeScenarioPartial, parseScenarioParams } from "@/lib/scenario-url";
import { landingDemos, landingScenarios } from "@/lib/landing-demo";
import SanDiegoPage, { metadata as sanDiegoMetadata } from "@/app/san-diego/page";

const { push, stash } = vi.hoisted(() => ({ push: vi.fn(), stash: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/address-handoff", () => ({ stashAddressQuery: stash }));
vi.mock("next/dynamic", () => ({
  default: (loader: () => unknown) =>
    loader.toString().includes("LandingMemberNav")
      ? () => <nav aria-label="Member navigation" />
      : function TestAuthGate({
          onAuthenticated,
          onDismiss,
          initialMode,
          analyticsSource,
        }: {
          onAuthenticated: () => void;
          onDismiss: () => void;
          initialMode?: "sign-in" | "sign-up";
          analyticsSource?: string;
        }) {
          return (
            <div
              role="dialog"
              data-initial-mode={initialMode}
              data-analytics-source={analyticsSource}
            >
              <button onClick={onAuthenticated}>Complete sign in</button>
              <button onClick={onDismiss}>Dismiss sign in</button>
            </div>
          );
        },
}));

const scenarios = (["conservative", "market", "optimistic"] as const).map(
  (id) => {
    const result = calculateFeasibility(parcelPresets[0], defaultAduConfig, {
      ...defaultFinancialAssumptions,
      rentScenario: id,
    });
    return {
      id,
      costLow: result.costLow,
      costHigh: result.costHigh,
      rent: result.monthlyRent,
      noi: result.annualNoi,
      payback: result.paybackYears,
      expenseRatio: result.operatingExpenseRatio,
    };
  },
);

import { consumeEntrySource } from "@/lib/analytics/entry-source";

describe("landing address handoff", () => {
  it("renders the San Diego page with its own metadata, kicker, demo and provenance", () => {
    render(<SanDiegoPage />);
    expect(sanDiegoMetadata.alternates?.canonical).toBe("https://lotfoundry.net/san-diego");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Explore an ADU on your lot in 3D.");
    expect(screen.getByText("San Diego ADU feasibility · see what fits your lot")).toBeVisible();
    expect(screen.getByRole("link", { name: "Open the San Diego sample lot in the 3D studio" })).toHaveTextContent("$2,754");
    expect(screen.getByRole("link", { name: "Open the San Diego sample lot in the 3D studio" })).toHaveTextContent("Coyote Brush Court");
    fireEvent.click(screen.getByText("What’s behind these numbers?"));
    const note = "Rent bands start from HUD's FY2026 Fair Market Rent for a one-bedroom in San Diego County ($2,459/mo), plus the studio's standard 12% and 25% spreads. The lot follows San Diego's RS-1-7 minimums; the address is fictional, and coverage is modeled at 60% because the city limits floor area (0.60 FAR), not flat-lot coverage.";
    expect(landingDemos["san-diego"].note).toBe(note);
    expect(screen.getByText((_, element) => element?.tagName === "P" && element.textContent?.includes(note) === true)).toBeVisible();
    for (const city of ["seattle", "portland", "austin"] as const) {
      expect(landingDemos[city].note).toBe("Demo rent bands are curated assumptions.");
    }
  });
  it("uses one descriptive H1 while retaining the brand display", () => {
    render(<LotMoreLanding scenarios={scenarios} />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Explore an ADU on your lot in 3D.");
    expect(screen.getByText(/A LOT\s*MORE/).tagName).toBe("P");
  });

  it("opens the sample on its estimates page", () => {
    render(<LotMoreLanding scenarios={scenarios} />);
    const pages = screen.getByRole("radiogroup", { name: "Sample report pages" });
    expect(within(pages).getByRole("radio", { name: "The estimates", checked: true })).toBeVisible();
    expect(within(screen.getByRole("article", { name: "Sample feasibility report" })).getByRole("heading", { name: /A clearer\s*financial picture\./ })).toBeVisible();
  });

  it.each([false, true])("focuses the hero address from start links (motion allowed: %s)", (motionAllowed) => {
    render(<LotMoreLanding scenarios={scenarios} />);
    const input = document.getElementById("hero-address")!;
    const scroll = vi.fn();
    input.scrollIntoView = scroll;
    const focus = vi.spyOn(input, "focus");
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: motionAllowed }));
    for (const name of ["Start with my lot", "Explore your own numbers", "Explore my lot"]) {
      const link = screen.getByRole("link", { name });
      expect(link).toHaveAttribute("href", "#start");
      fireEvent.click(link);
      expect(input).toHaveFocus();
      expect(scroll).toHaveBeenLastCalledWith({ block: "center", behavior: motionAllowed ? "smooth" : "instant" });
      expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
    }
  });

  it.each(["seattle", "portland", "austin", "san-diego"] as const)("names the %s demo consistently and keeps the Seattle capture label", (city) => {
    render(<LotMoreLanding city={city} scenarios={landingScenarios(city)} />);
    const demo = landingDemos[city];
    const sample = screen.getByRole("link", { name: `Open the ${demo.city} sample lot in the 3D studio` });
    expect(sample).toHaveTextContent(`${demo.name} demo, ${demo.city} · market rent · open it in 3D`);
    expect(screen.getByText(`${demo.name.toUpperCase()} DEMO, ${demo.city.toUpperCase()} · 600 SQ FT · 1 BED CONCEPT`)).toBeVisible();
    expect(screen.getByText("Oak Street demo, Seattle", { selector: "span" })).toBeVisible();
    const footer = screen.getByRole("contentinfo");
    for (const item of Object.values(landingDemos)) {
      expect(within(footer).getByRole("link", { name: `${item.name} demo, ${item.city}` })).toHaveAttribute("href", `/${item.city.toLowerCase().replaceAll(" ", "-")}`);
    }
  });

  it("uses an upward arrow for back to top", () => {
    render(<LotMoreLanding scenarios={scenarios} />);
    const link = screen.getByRole("link", { name: "Back to top" });
    expect(link).toHaveAttribute("href", "#start");
    expect(link.querySelector("svg")).toHaveClass("lucide-arrow-up");
  });

  it("changes the concrete pillar lead with the selection", () => {
    render(<LotMoreLanding scenarios={scenarios} />);
    expect(screen.getByText("A 600 sq ft, one-bedroom concept.")).toBeVisible();
    fireEvent.click(screen.getByRole("radio", { name: "For income" }));
    expect(screen.getByText(`$${scenarios[1].rent.toLocaleString("en-US")}/mo estimated market rent in this demo.`)).toBeVisible();
    expect(screen.queryByText("A 600 sq ft, one-bedroom concept.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /For what/ }));
    expect(screen.getByText("One concept, many uses over time.")).toBeVisible();
  });

  it("starts at market rent and keeps the report and expanded NOI synchronized for every assumption", () => {
    render(<LotMoreLanding scenarios={scenarios} />);
    const group = screen.getByRole("radiogroup", { name: "Demo rent assumption" });
    expect(within(group).getByRole("radio", { name: "market" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Sample report pages" })).getByRole("radio", { name: "The estimates" }));
    fireEvent.click(screen.getByText("What’s behind these numbers?"));
    for (const item of scenarios) {
      fireEvent.click(within(group).getByRole("radio", { name: item.id }));
      expect(screen.getByText(new RegExp(`estimated annual net operating income is \\$${item.noi.toLocaleString("en-US")}`))).toBeVisible();
      expect(within(screen.getByRole("article", { name: "Sample feasibility report" })).getByText(`$${item.noi.toLocaleString("en-US")}`)).toBeVisible();
      expect(within(screen.getByRole("article", { name: "Sample feasibility report" })).getByText(`${item.id.toUpperCase()} DEMO ASSUMPTIONS`)).toBeVisible();
    }
  });

  it.each(["portland", "austin"] as const)("opens the matching %s demo with matching engine figures", (city) => {
    render(<LotMoreLanding city={city} scenarios={landingScenarios(city)} />);
    const name = city === "portland" ? "Portland" : "Austin";
    const sample = screen.getByRole("link", { name: `Open the ${name} sample lot in the 3D studio` });
    const restored = mergeScenarioPartial(parseScenarioParams(new URLSearchParams(sample.getAttribute("href")!.split("?")[1])));
    expect(restored.parcelId).toBe(city === "portland" ? "corner-lot" : "compact-lot");
    const result = calculateFeasibility(getParcelById(restored.parcelId), restored.config, restored.assumptions);
    expect(within(sample).getByText(`$${result.monthlyRent.toLocaleString("en-US")}`)).toBeVisible();
  });
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
  });

  // The member navigation carries the Firebase client SDK. Mounting it for a
  // signed-out visitor would put that download back on `/`, which is the cost
  // the route group split exists to avoid.
  it("keeps the auth island off the header until a browser has signed in", () => {
    const guest = render(<LotMoreLanding scenarios={scenarios} />);
    expect(
      screen.queryByRole("navigation", { name: "Member navigation" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login",
    );
    guest.unmount();

    window.localStorage.setItem("lf:member-session", "1");
    render(<LotMoreLanding scenarios={scenarios} />);
    expect(
      screen.getByRole("navigation", { name: "Member navigation" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Sign in" }),
    ).not.toBeInTheDocument();
  });

  it("hides builder registration in all navigation inside the Android app", () => {
    vi.stubGlobal("LotFoundryNative", { platform: "android" });
    render(<LotMoreLanding scenarios={scenarios} />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.queryByRole("link", { name: "Register as a builder" })).not.toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("exposes builder registration in desktop, footer, and mobile navigation", () => {
    render(<LotMoreLanding scenarios={scenarios} />);
    expect(
      screen.getAllByRole("link", { name: "Register as a builder" }),
    ).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    for (const link of screen.getAllByRole("link", {
      name: "Register as a builder",
    })) {
      expect(link).toHaveAttribute("href", "/signup?role=builder");
    }
    expect(
      screen.getAllByRole("link", { name: "Register as a builder" }),
    ).toHaveLength(3);
  });

  /** Spend the anonymous allowance, as a return visit that already looked once would. */
  function spendGuestAllowance() {
    for (let i = 0; i < GUEST_LOOKUP_LIMIT; i += 1) consumeGuestLookup();
  }

  // The account ask is the most expensive step in this funnel. A first-time
  // visitor must reach their own lot without meeting it.
  it("routes a first-time visitor straight to the studio with the trimmed address", () => {
    render(<LotMoreLanding scenarios={scenarios} />);
    fireEvent.change(
      screen.getAllByLabelText("Property address", { exact: true })[0],
      { target: { value: "  456 Pine St, Denver, CO  " } },
    );
    fireEvent.click(
      screen.getAllByRole("button", { name: "Explore my lot" })[0],
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(stash).toHaveBeenCalledExactlyOnceWith("456 Pine St, Denver, CO");
    expect(push).toHaveBeenCalledExactlyOnceWith("/studio");
    expect(consumeEntrySource()).toBe("landing_cta");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Bringing your lot into focus",
    );
  });

  it("waits for confirmed authentication once the free lookup is spent", () => {
    spendGuestAllowance();
    render(<LotMoreLanding scenarios={scenarios} />);
    fireEvent.change(
      screen.getAllByLabelText("Property address", { exact: true })[0],
      { target: { value: "  456 Pine St, Denver, CO  " } },
    );
    fireEvent.click(
      screen.getAllByRole("button", { name: "Explore my lot" })[0],
    );
    expect(stash).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    const authDialog = screen.getByRole("dialog");
    expect(authDialog).toHaveAttribute("data-initial-mode", "sign-up");
    expect(authDialog).toHaveAttribute("data-analytics-source", "guest_limit");
    fireEvent.click(screen.getByRole("button", { name: "Complete sign in" }));
    expect(stash).toHaveBeenCalledExactlyOnceWith("456 Pine St, Denver, CO");
    expect(push).toHaveBeenCalledExactlyOnceWith("/studio");
    expect(consumeEntrySource()).toBe("landing_cta");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Bringing your lot into focus",
    );
  });

  it("does not let a remembered session block an available guest lookup", () => {
    window.localStorage.setItem("lf:member-session", "1");
    render(<LotMoreLanding scenarios={scenarios} />);
    fireEvent.change(
      screen.getAllByLabelText("Property address", { exact: true })[0],
      { target: { value: "456 Pine St, Denver, CO" } },
    );
    fireEvent.click(
      screen.getAllByRole("button", { name: "Explore my lot" })[0],
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(stash).toHaveBeenCalledExactlyOnceWith("456 Pine St, Denver, CO");
    expect(push).toHaveBeenCalledExactlyOnceWith("/studio");
  });

  it("still resolves a remembered member when the guest allowance is spent", () => {
    window.localStorage.setItem("lf:member-session", "1");
    spendGuestAllowance();
    render(<LotMoreLanding scenarios={scenarios} />);
    fireEvent.change(screen.getAllByLabelText("Property address", { exact: true })[0], {
      target: { value: "456 Pine St, Denver, CO" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Explore my lot" })[0]);

    expect(screen.getByRole("dialog")).toHaveAttribute("data-initial-mode", "sign-in");
    expect(push).not.toHaveBeenCalled();
  });

  it("dismisses authentication without discarding the address or starting a lookup", () => {
    spendGuestAllowance();
    render(<LotMoreLanding scenarios={scenarios} />);
    fireEvent.change(
      screen.getAllByLabelText("Property address", { exact: true })[1],
      { target: { value: "456 Pine St, Denver, CO" } },
    );
    fireEvent.click(
      screen.getAllByRole("button", { name: "Explore my lot" })[1],
    );
    fireEvent.click(screen.getByRole("button", { name: "Dismiss sign in" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getAllByLabelText("Property address", { exact: true })[0],
    ).toHaveValue("456 Pine St, Denver, CO");
    expect(stash).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("links the Play listing from the footer", () => {
    render(<LotMoreLanding scenarios={scenarios} />);
    // Without this link the Android app is unreachable from the web.
    expect(
      screen.getByRole("link", { name: "Android app on Google Play" }),
    ).toHaveAttribute(
      "href",
      "https://play.google.com/store/apps/details?id=com.lotfoundry.app",
    );
  });

  it("links social media profiles from the footer", () => {
    render(<LotMoreLanding scenarios={scenarios} />);
    expect(screen.getByRole("link", { name: "YouTube" })).toHaveAttribute(
      "href",
      "https://www.youtube.com/@lotfoundry",
    );
    expect(screen.getByRole("link", { name: "Instagram" })).toHaveAttribute(
      "href",
      "https://www.instagram.com/lot_foundry",
    );
    expect(screen.getByRole("link", { name: "Facebook" })).toHaveAttribute(
      "href",
      "https://www.facebook.com/lotfoundry",
    );
    expect(screen.getByRole("link", { name: "X" })).toHaveAttribute(
      "href",
      "https://x.com/lot_foundry",
    );
  });

  it("gives every single-choice group a checked option and one keyboard tab stop", () => {
    render(<LotMoreLanding scenarios={scenarios} />);
    for (const group of screen.getAllByRole("radiogroup")) {
      const options = within(group).getAllByRole("radio");
      const selected = within(group).getByRole("radio", { checked: true });
      expect(options.filter((option) => option.tabIndex === 0)).toEqual([
        selected,
      ]);
      fireEvent.keyDown(selected, { key: "End" });
      expect(options.at(-1)).toHaveAttribute("aria-checked", "true");
      expect(options.at(-1)).toHaveFocus();
      fireEvent.keyDown(options.at(-1)!, { key: "ArrowRight" });
      expect(options[0]).toHaveAttribute("aria-checked", "true");
      expect(options[0]).toHaveFocus();
      fireEvent.keyDown(options[0], { key: "ArrowLeft" });
      expect(options.at(-1)).toHaveAttribute("aria-checked", "true");
      fireEvent.keyDown(options.at(-1)!, { key: "Home" });
      expect(options[0]).toHaveAttribute("aria-checked", "true");
    }
  });

  it("updates report content and demo numbers from their selected radio", () => {
    render(<LotMoreLanding scenarios={scenarios} />);
    fireEvent.click(
      within(
        screen.getByRole("radiogroup", { name: "Sample report pages" }),
      ).getByRole("radio", { name: "Next steps" }),
    );
    expect(
      screen.getByText(/Confirm property boundaries, setbacks/),
    ).toBeVisible();
    fireEvent.click(
      within(
        screen.getByRole("radiogroup", { name: "Demo rent assumption" }),
      ).getByRole("radio", { name: "optimistic" }),
    );
    expect(
      screen.getByText(
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(scenarios[2].rent),
      ),
    ).toBeVisible();
  });

  it("shows the engine's market-case result in the hero and opens the demo lot from it", () => {
    render(<LotMoreLanding scenarios={scenarios} />);
    const sample = screen.getByRole("link", {
      name: "Open the Seattle sample lot in the 3D studio",
    });
    const market = scenarios[1];
    const usd = (value: number) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(value);
    expect(new URLSearchParams(sample.getAttribute("href")!.split("?")[1]).get("rent")).toBe("market");
    expect(within(sample).getByText(/market rent/)).toBeVisible();
    expect(within(sample).getByText(usd(market.rent))).toBeVisible();
    expect(within(sample).getByText(String(market.payback))).toBeVisible();
    fireEvent.click(sample);
    expect(stash).toHaveBeenCalledExactlyOnceWith("");
    expect(consumeEntrySource()).toBe("landing_cta");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("reproduces the advertised market figures through the scenario parser", () => {
    render(<LotMoreLanding scenarios={scenarios} />);
    const href = screen
      .getByRole("link", { name: "Open the Seattle sample lot in the 3D studio" })
      .getAttribute("href")!;
    const merged = mergeScenarioPartial(
      parseScenarioParams(new URLSearchParams(href.split("?")[1])),
    );
    expect(merged.parcelId).toBe(parcelPresets[0].id);
    expect(merged.config).toMatchObject({
      footprint: 600,
      roof: "shed",
      finish: "cedar",
      includeOpenings: true,
    });
    expect(merged.assumptions.rentScenario).toBe("market");
    const market = scenarios[1];
    const result = calculateFeasibility(
      getParcelById(merged.parcelId),
      merged.config,
      merged.assumptions,
    );
    expect(result.monthlyRent).toBe(market.rent);
    expect(result.paybackYears).toBe(market.payback);
    expect(result.costLow).toBe(market.costLow);
    expect(result.costHigh).toBe(market.costHigh);
  });

  it("clears a typed address when the visitor chooses the explicit demo", () => {
    render(<LotMoreLanding scenarios={scenarios} />);
    fireEvent.change(
      screen.getAllByLabelText("Property address", { exact: true })[0],
      { target: { value: "456 Pine St, Denver, CO" } },
    );
    const example = screen.getByRole("link", {
      name: "Try the Oak Street demo",
    });
    expect(example).toHaveAttribute(
      "href",
      screen.getByRole("link", {
        name: "Open the Seattle sample lot in the 3D studio",
      }).getAttribute("href"),
    );
    fireEvent.click(example);
    expect(stash).toHaveBeenCalledExactlyOnceWith("");
    expect(consumeEntrySource()).toBe("landing_cta");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("updates maquette inspection readouts and interactive massing sandbox figures", () => {
    render(<LotMoreLanding scenarios={scenarios} />);
    expect(screen.getByText(/24′ × 25′ footprint · 1 bed/)).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: "Inspect Modeled Setback Buffer" }),
    );
    expect(screen.getByText(/5′ rear · 5′ side clearance/)).toBeVisible();

    fireEvent.click(screen.getByRole("radio", { name: /Today/ }));
    expect(
      screen.queryByText(/5′ rear · 5′ side clearance/),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /The possibility/ }));
    expect(screen.getByText(/5′ rear · 5′ side clearance/)).toBeVisible();

    const sandbox = screen.getByLabelText("Interactive massing preview");
    expect(within(sandbox).getByText("32% of lot")).toBeVisible();
    fireEvent.click(within(sandbox).getByRole("radio", { name: "800 sq ft" }));
    expect(within(sandbox).getByText("36% of lot")).toBeVisible();
    fireEvent.click(within(sandbox).getByRole("radio", { name: "Gable" }));
    expect(within(sandbox).getByRole("radio", { name: "Gable" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    const tryHref = screen
      .getByRole("link", { name: "Try the Oak Street demo" })
      .getAttribute("href")!;
    const params = new URLSearchParams(tryHref.split("?")[1]);
    expect(params.get("size")).toBe("800");
    expect(params.get("roof")).toBe("gable");
  });
});

