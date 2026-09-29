import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LotMoreLanding } from "./LotMoreLanding";
import { GUEST_LOOKUP_LIMIT, consumeGuestLookup } from "@/lib/guest-lookup";
import {
  calculateFeasibility,
  defaultAduConfig,
  defaultFinancialAssumptions,
  parcelPresets,
} from "@/lib/feasibility";

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
        }: {
          onAuthenticated: () => void;
          onDismiss: () => void;
        }) {
          return (
            <div role="dialog">
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
    fireEvent.click(screen.getByRole("button", { name: "Complete sign in" }));
    expect(stash).toHaveBeenCalledExactlyOnceWith("456 Pine St, Denver, CO");
    expect(push).toHaveBeenCalledExactlyOnceWith("/studio");
    expect(consumeEntrySource()).toBe("landing_cta");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Bringing your lot into focus",
    );
  });

  // A returning member still goes through the gate, which resolves their
  // existing session rather than prompting.
  it("routes a browser that has signed in before through the auth gate", () => {
    window.localStorage.setItem("lf:member-session", "1");
    render(<LotMoreLanding scenarios={scenarios} />);
    fireEvent.change(
      screen.getAllByLabelText("Property address", { exact: true })[0],
      { target: { value: "456 Pine St, Denver, CO" } },
    );
    fireEvent.click(
      screen.getAllByRole("button", { name: "Explore my lot" })[0],
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
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
    expect(sample).toHaveAttribute("href", "/studio?parcel=oak-street");
    expect(within(sample).getByText(usd(market.rent))).toBeVisible();
    expect(within(sample).getByText(String(market.payback))).toBeVisible();
    fireEvent.click(sample);
    expect(stash).toHaveBeenCalledExactlyOnceWith("");
    expect(consumeEntrySource()).toBe("landing_cta");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
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
    expect(example).toHaveAttribute("href", "/studio?parcel=oak-street");
    fireEvent.click(example);
    expect(stash).toHaveBeenCalledExactlyOnceWith("");
    expect(consumeEntrySource()).toBe("landing_cta");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
