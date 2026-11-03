import { StrictMode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  calculateFeasibility,
  defaultAduConfig,
  defaultFinancialAssumptions,
  parcelPresets,
} from "@/lib/feasibility";
import type { AIProjectBrief, AIProjectBriefPreview } from "@/lib/ai-types";
import type { StorePriceDisplay } from "@/lib/commerce/store-price";
import { certificateKey } from "@/lib/certificate-key";
import { CERTIFICATE_PRICE_CENTS } from "@/lib/certificate-pricing";
import { CertificateCheckoutError } from "@/lib/certificate-checkout";
import type { CertificateReturnIntent, CertificateRecovery } from "@/lib/certificate-recovery";
import type { AuthModalProps } from "@/components/auth/AuthModal";
import CertificatePanel, { type CertificatePanelProps } from "./CertificatePanel";
import {
  clearCertificatePurchaseIntent,
  hasCertificatePurchaseIntent,
} from "@/lib/certificate-purchase-intent";
import {
  AgentPassError,
  clearAgentPass,
  clearAgentPassRedeemIntent,
  hasAgentPassRedeemIntent,
  rememberAgentPass,
  readAgentPass,
} from "@/lib/agent-pass";

const mocks = vi.hoisted(() => ({
  getIdToken: vi.fn(),
  refresh: vi.fn(),
  trackPurchase: vi.fn(),
  startCertificateCheckout: vi.fn(),
  redeemAgentPass: vi.fn(),
  intent: null as CertificateReturnIntent | null,
  recoveryStatus: "idle" as CertificateRecovery["status"],
  consumeOpen: vi.fn(),
  consumePurchase: vi.fn(),
  consumeCancellation: vi.fn(),
  acknowledgeCancellation: vi.fn(),
  access: {
    purchased: true,
    loading: false,
    analyticsOrderId: "order-safe-12345",
  },
  auth: {
    user: null as { uid: string; getIdToken: () => Promise<string> } | null,
    profile: null as { role: "user" | "builder" } | null,
    loading: false,
  },
}));

const authModal = vi.hoisted(() => ({
  props: null as AuthModalProps | null,
}));

const analyticsEvents = vi.hoisted(() => ({
  trackCertificatePaywallViewed: vi.fn(),
  trackCertificateCheckoutStarted: vi.fn(),
  trackCertificateCheckoutRedirected: vi.fn(),
  trackCertificateCheckoutCancelled: vi.fn(),
  trackCertificatePurchase: vi.fn(),
  trackCertificatePassRedeemed: vi.fn(),
  mapPurchaseChannel: vi.fn(() => "web_stripe"),
  mapFeasibilityVerdict: vi.fn(() => "eligible"),
}));

vi.mock("@/lib/analytics/events", () => analyticsEvents);

/** Forces a store-channel quote; `null` keeps the real web catalog price. */
const storePrice = vi.hoisted(() => ({ override: null as StorePriceDisplay | null }));

vi.mock("@/lib/commerce/store-price", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/commerce/store-price")>();
  return {
    ...actual,
    useStorePrice: (...args: Parameters<typeof actual.useStorePrice>) => {
      const real = actual.useStorePrice(...args);
      return storePrice.override ?? real;
    },
  };
});

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: mocks.auth.user,
    profile: mocks.auth.profile,
    loading: mocks.auth.loading,
  }),
}));

vi.mock("@/lib/analytics/adsConversion", () => ({
  trackPurchase: mocks.trackPurchase,
}));

vi.mock("@/components/auth/AuthModal", () => ({
  AuthModal: (props: AuthModalProps) => {
    authModal.props = props;
    if (!props.isOpen) return null;
    return (
      <div role="dialog" data-mode={props.initialMode} data-source={props.analyticsSource}>
        <button
          type="button"
          onClick={() => {
            // The auth context publishes the session before the modal reports it.
            const signedIn = { uid: "new-owner", getIdToken: mocks.getIdToken };
            mocks.auth.user = signedIn;
            props.onAuthenticated?.(
              signedIn as unknown as Parameters<NonNullable<AuthModalProps["onAuthenticated"]>>[0],
            );
            props.onClose("signed-in");
          }}
        >
          Complete authentication
        </button>
        <button type="button" onClick={() => props.onClose("dismissed")}>
          Dismiss authentication
        </button>
      </div>
    );
  },
}));

vi.mock("@/lib/certificate-checkout", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/certificate-checkout")>();
  return {
    ...actual,
    startCertificateCheckout: mocks.startCertificateCheckout,
  };
});

vi.mock("@/lib/agent-pass", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/agent-pass")>();
  return {
    ...actual,
    redeemAgentPass: mocks.redeemAgentPass,
  };
});

const brief: AIProjectBrief = {
  headline: "A workable backyard concept",
  summary: "The concept fits the recorded assumptions.",
  bestFit: "Keep the current 600 sf concept.",
  risks: [],
  permitTrack: {
    name: "Ministerial review",
    type: "ministerial",
    basis: "Typical administrative review.",
  },
  stages: [
    {
      name: "Plan review",
      description: "Review the application.",
      estWeeksLow: 4,
      estWeeksHigh: 7,
      status: "clear",
    },
  ],
  totalEstWeeksLow: 4,
  totalEstWeeksHigh: 7,
  recommendedNextSteps: ["Prepare the plan set.", "Submit for review.", "Track comments."],
  disclaimer: "Planning estimate only.",
};

const parcel = parcelPresets[0];
const result = calculateFeasibility(
  parcel,
  defaultAduConfig,
  defaultFinancialAssumptions,
);

function createProps(
  overrides: Partial<CertificatePanelProps> = {},
): CertificatePanelProps {
  return {
    recovery: {
      get access() { return { ...mocks.access, refresh: mocks.refresh }; },
      get intent() { return mocks.intent; },
      get status() { return mocks.access.purchased ? "granted" : mocks.recoveryStatus; },
      retry: mocks.refresh,
      consumeOpen: mocks.consumeOpen,
      consumePurchase: mocks.consumePurchase,
      consumeCancellation: mocks.consumeCancellation,
      acknowledgeCancellation: mocks.acknowledgeCancellation,
    },
    parcel,
    result,
    feasibilityStatus: "eligible",
    parcelName: `${parcel.address}, ${parcel.city}`,
    onOpenCertificate: vi.fn(),
    projectBrief: null,
    projectBriefLoading: false,
    projectBriefError: null,
    onGenerateProjectBrief: vi.fn().mockResolvedValue(brief),
    ...overrides,
  };
}

/** Mount unpurchased-settled, then resolve the grant — a real unlock. */
function renderWithUnlock(props: CertificatePanelProps) {
  mocks.access.purchased = false;
  mocks.access.loading = false;
  const view = render(<CertificatePanel {...props} />);
  mocks.access.purchased = true;
  view.rerender(<CertificatePanel {...props} />);
  return view;
}

const briefPreview: AIProjectBriefPreview = {
  headline: "A workable backyard concept",
  summary: "The concept fits the recorded assumptions.",
  permitTrack: { name: "Ministerial review", type: "ministerial" },
  totalEstWeeksLow: 12,
  totalEstWeeksHigh: 18,
  firstRisk: { label: "Rear setback", level: "medium", explanation: "Confirm the rear line." },
  locked: { riskCount: 4, stageCount: 6, nextStepCount: 3 },
  disclaimer: "Planning estimate only.",
};

/** The only parameter keys any certificate funnel event may carry. */
const BOUNDED_ANALYTICS_KEYS = new Set([
  "auth_state",
  "currency",
  "feasibility_status",
  "purchase_channel",
  "transaction_id",
  "value",
]);

const originalLocation = window.location;

/** Replace `window.location` so `assign` can be observed instead of navigating. */
function stubLocationAssign() {
  const assign = vi.fn();
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: {
      ...originalLocation,
      assign,
      search: originalLocation.search,
      pathname: originalLocation.pathname,
    },
  });
  return assign;
}

describe("CertificatePanel", () => {
  beforeEach(() => {
    clearCertificatePurchaseIntent();
    clearAgentPass();
    clearAgentPassRedeemIntent();
    window.sessionStorage.clear();
    mocks.getIdToken.mockReset().mockResolvedValue("test-token");
    mocks.refresh.mockReset();
    mocks.trackPurchase.mockReset();
    mocks.startCertificateCheckout.mockReset();
    mocks.redeemAgentPass.mockReset().mockResolvedValue(undefined);
    mocks.intent = null;
    mocks.recoveryStatus = "idle";
    mocks.consumeOpen.mockReset().mockReturnValueOnce(true).mockReturnValue(false);
    mocks.consumePurchase.mockReset().mockReturnValueOnce(true).mockReturnValue(false);
    mocks.consumeCancellation.mockReset().mockReturnValueOnce(true).mockReturnValue(false);
    mocks.acknowledgeCancellation.mockReset().mockImplementation(() => { mocks.intent = null; });
    mocks.access.purchased = true;
    mocks.access.loading = false;
    mocks.auth.user = { uid: "owner-1", getIdToken: mocks.getIdToken };
    mocks.auth.profile = null;
    mocks.auth.loading = false;
    authModal.props = null;
    storePrice.override = null;
    for (const fn of Object.values(analyticsEvents)) fn.mockClear();
    window.history.replaceState(null, "", "/");
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });

  it("uses a contextual eyebrow without changing the desktop step label by default", () => {
    const props = createProps();
    const { rerender } = render(<CertificatePanel {...props} />);

    expect(screen.getByText("Step 4 · Certificate")).toBeInTheDocument();

    rerender(<CertificatePanel {...props} eyebrow="Certificate of Feasibility" />);

    expect(screen.getByText("Certificate of Feasibility")).toBeInTheDocument();
    expect(screen.queryByText("Step 4 · Certificate")).not.toBeInTheDocument();
  });

  it("offers access retry instead of another Purchase after recovery remains unverified", () => {
    mocks.access.purchased = false;
    mocks.intent = { kind: "checkout", certKey: certificateKey(parcel) };
    mocks.recoveryStatus = "unverified";
    render(<CertificatePanel {...createProps()} />);
    expect(screen.getByText(/This does not mean your payment failed/)).toBeVisible();
    expect(screen.queryByRole("button", { name: /Unlock property certificate/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Certificate access unverified" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Check again" }));
    expect(mocks.refresh).toHaveBeenCalled();
    expect(mocks.startCertificateCheckout).not.toHaveBeenCalled();
    expect(analyticsEvents.trackCertificatePaywallViewed).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "My Certificates" })).toHaveAttribute("href", "/certificates");
  });

  it("keeps a coverage conflict and permanent property access visible before purchase", () => {
    mocks.access.purchased = false;
    render(<CertificatePanel {...createProps({ result: { ...result, remainingCapacity: -380 } })} />);
    expect(screen.getByText(/This concept exceeds the modeled size allowance/)).toBeInTheDocument();
    expect(screen.getByText(/Unlocks this property permanently/)).toBeInTheDocument();
  });

  describe("agent pass", () => {
    beforeEach(() => { mocks.access.purchased = false; });

    it("lets buyers replace a failed remembered code and keeps the replacement", async () => {
      rememberAgentPass("OLD-CODE");
      mocks.redeemAgentPass.mockRejectedValueOnce(new AgentPassError("This code has expired."));
      render(<CertificatePanel {...createProps()} />);
      fireEvent.click(screen.getByRole("button", { name: "Get this certificate free" }));
      await screen.findByText("This code has expired.");
      fireEvent.click(screen.getByRole("button", { name: "Change agent code" }));
      expect(readAgentPass()).toBeNull();
      fireEvent.click(screen.getByText("Have an agent code?"));
      fireEvent.change(screen.getByLabelText("Agent code"), { target: { value: "NEW-CODE" } });
      fireEvent.click(screen.getByRole("button", { name: "Apply code" }));
      await waitFor(() => expect(mocks.redeemAgentPass).toHaveBeenLastCalledWith(expect.objectContaining({ code: "NEW-CODE" })));
      expect(readAgentPass()).toBe("NEW-CODE");
    });

    it.each(["pass", "checkout"])("prevents competing purchases while %s is pending", async (operation) => {
      rememberAgentPass("SMITH-ELM");
      let finish!: (value: never) => void;
      const pending = new Promise((resolve) => { finish = resolve; });
      const request = operation === "pass" ? mocks.redeemAgentPass : mocks.startCertificateCheckout;
      request.mockReturnValueOnce(pending);
      render(<CertificatePanel {...createProps()} />);
      const claim = screen.getByRole("button", { name: "Get this certificate free" });
      const buy = screen.getByRole("button", { name: /Unlock property certificate/ });
      fireEvent.click(operation === "pass" ? claim : buy);
      await waitFor(() => expect(request).toHaveBeenCalledOnce());
      expect(claim).toBeDisabled();
      expect(buy).toBeDisabled();
      fireEvent.click(operation === "pass" ? buy : claim);
      expect(operation === "pass" ? mocks.startCertificateCheckout : mocks.redeemAgentPass).not.toHaveBeenCalled();
      finish({ kind: "already_purchased" } as never);
      await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
    });

    it("offers a linked agent code and claims it in place without a purchase conversion", async () => {
      rememberAgentPass("smith-elm");
      render(<CertificatePanel {...createProps()} />);
      expect(screen.getByText("Agent code SMITH-ELM")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Get this certificate free" }));
      await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
      expect(mocks.redeemAgentPass).toHaveBeenCalledWith(expect.objectContaining({
        code: "SMITH-ELM",
        certKey: certificateKey(parcel),
        idToken: "test-token",
      }));
      expect(analyticsEvents.trackCertificatePassRedeemed).toHaveBeenCalledWith({ feasibility_status: "eligible" });
      expect(mocks.startCertificateCheckout).not.toHaveBeenCalled();
      expect(analyticsEvents.trackCertificatePurchase).not.toHaveBeenCalled();
      expect(mocks.trackPurchase).not.toHaveBeenCalled();
    });

    it("puts a linked code's free claim above the price, and a typed code below it", () => {
      rememberAgentPass("SMITH-ELM");
      const { unmount } = render(<CertificatePanel {...createProps()} />);
      const claim = screen.getByRole("button", { name: "Get this certificate free" });
      const buy = screen.getByRole("button", { name: "Unlock property certificate — $29" });
      expect(claim.compareDocumentPosition(buy) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      unmount();

      clearAgentPass();
      render(<CertificatePanel {...createProps()} />);
      const typed = screen.getByText("Have an agent code?");
      const buyAgain = screen.getByRole("button", { name: "Unlock property certificate — $29" });
      expect(buyAgain.compareDocumentPosition(typed) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("shows the server's reason when a code does not apply", async () => {
      rememberAgentPass("SMITH-ELM");
      mocks.redeemAgentPass.mockRejectedValue(new AgentPassError("This code has expired."));
      render(<CertificatePanel {...createProps()} />);
      fireEvent.click(screen.getByRole("button", { name: "Get this certificate free" }));
      expect(await screen.findByRole("alert")).toHaveTextContent("This code has expired.");
      expect(mocks.refresh).not.toHaveBeenCalled();
      expect(analyticsEvents.trackCertificatePassRedeemed).not.toHaveBeenCalled();
    });

    it("carries a guest's claim through account creation, then redeems", async () => {
      mocks.auth.user = null;
      rememberAgentPass("SMITH-ELM");
      const props = createProps();
      const { rerender } = render(<CertificatePanel {...props} />);
      fireEvent.click(screen.getByRole("button", { name: "Create a free account to claim it" }));
      expect(screen.getByRole("dialog")).toHaveAttribute("data-mode", "sign-up");
      expect(hasAgentPassRedeemIntent(certificateKey(parcel))).toBe(true);
      expect(mocks.redeemAgentPass).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole("button", { name: "Complete authentication" }));
      rerender(<CertificatePanel {...props} />);
      await waitFor(() => expect(mocks.redeemAgentPass).toHaveBeenCalledTimes(1));
      expect(hasAgentPassRedeemIntent()).toBe(false);
      expect(mocks.startCertificateCheckout).not.toHaveBeenCalled();
    });

    it("forgets a guest's claim when they dismiss the account step", () => {
      mocks.auth.user = null;
      rememberAgentPass("SMITH-ELM");
      render(<CertificatePanel {...createProps()} />);
      fireEvent.click(screen.getByRole("button", { name: "Create a free account to claim it" }));
      fireEvent.click(screen.getByRole("button", { name: "Dismiss authentication" }));
      expect(hasAgentPassRedeemIntent()).toBe(false);
    });

    it("accepts a typed code and rejects a malformed one before calling the server", async () => {
      render(<CertificatePanel {...createProps()} />);
      fireEvent.click(screen.getByText("Have an agent code?"));
      const field = screen.getByLabelText("Agent code");
      fireEvent.change(field, { target: { value: "!!" } });
      fireEvent.click(screen.getByRole("button", { name: "Apply code" }));
      expect(await screen.findByRole("alert")).toHaveTextContent("Enter the code exactly as your agent shared it.");
      expect(mocks.redeemAgentPass).not.toHaveBeenCalled();
      fireEvent.change(field, { target: { value: " smith-elm " } });
      fireEvent.click(screen.getByRole("button", { name: "Apply code" }));
      await waitFor(() => expect(mocks.redeemAgentPass).toHaveBeenCalledWith(expect.objectContaining({ code: "SMITH-ELM" })));
    });

    it("is not offered to builders, in store shells, or once the certificate is unlocked", () => {
      rememberAgentPass("SMITH-ELM");
      mocks.auth.profile = { role: "builder" };
      const { rerender } = render(<CertificatePanel {...createProps()} />);
      expect(screen.queryByText("Agent code SMITH-ELM")).not.toBeInTheDocument();

      mocks.auth.profile = null;
      storePrice.override = { channel: "google-play", amount: "", amountCompact: "", unitAmount: "", exact: false, loading: false } as StorePriceDisplay;
      rerender(<CertificatePanel {...createProps()} />);
      expect(screen.queryByText("Agent code SMITH-ELM")).not.toBeInTheDocument();

      storePrice.override = null;
      mocks.access.purchased = true;
      rerender(<CertificatePanel {...createProps()} />);
      expect(screen.queryByText("Agent code SMITH-ELM")).not.toBeInTheDocument();
    });

    it("labels a $0 agent-pass grant as complimentary", () => {
      mocks.access.purchased = true;
      render(<CertificatePanel {...createProps({ recovery: { ...createProps().recovery, get access() { return { ...mocks.access, amount: 0, refresh: mocks.refresh }; } } as CertificateRecovery })} />);
      expect(screen.getByText("Complimentary")).toBeInTheDocument();
      expect(screen.queryByText("Purchased")).not.toBeInTheDocument();
    });
  });

  describe("paywall offer", () => {
    beforeEach(() => { mocks.access.purchased = false; });

    it("shows unblurred baseline metrics while keeping financed cash flow locked", () => {
      const { container } = render(<CertificatePanel {...createProps()} />);
      expect(container.querySelectorAll('[data-locked-metric="true"]')).toHaveLength(1);
      expect(screen.getByText("$231K–$289K")).toBeInTheDocument();
      expect(screen.getByText(`${result.paybackYears} yrs`)).toBeInTheDocument();
      expect(screen.queryByText("Methodology & data sources")).not.toBeInTheDocument();
    });

    it("keeps generated risks, counts and timelines behind the certificate", () => {
      render(<CertificatePanel {...createProps({ projectBriefPreview: briefPreview })} />);
      for (const text of ["Rear setback", "4 ranked risks to verify", "6-stage permit path", "12–18 week typical approval timeline"]) {
        expect(screen.queryByText(text)).not.toBeInTheDocument();
      }
      expect(screen.getByText(/local permit steps, items to verify, a scope checklist, and a site plan PDF/)).toBeInTheDocument();
    });

    it("uses one transaction CTA for the blurred preview", async () => {
      mocks.startCertificateCheckout.mockResolvedValue({ kind: "redirect", url: "https://checkout.stripe.test/s" });
      const assign = stubLocationAssign();
      render(<CertificatePanel {...createProps()} />);
      fireEvent.click(screen.getByRole("button", { name: "Unlock property certificate — $29" }));
      await waitFor(() => expect(assign).toHaveBeenCalledWith("https://checkout.stripe.test/s"));
      expect(mocks.startCertificateCheckout).toHaveBeenCalledTimes(1);
      expect(analyticsEvents.trackCertificateCheckoutStarted).toHaveBeenCalledTimes(1);
    });

    it("names the exact web price, permanent unlock and estimate limits", () => {
      render(<CertificatePanel {...createProps()} />);
      expect(screen.getByRole("button", { name: "Unlock property certificate — $29" })).toBeInTheDocument();
      expect(screen.getByText("One-time $29 · No subscription · Unlocks this property permanently")).toBeInTheDocument();
      expect(screen.getByText(/Not permit approval or guaranteed income/)).toBeInTheDocument();
    });

    it("reports the rendered verdict, not the raw zoning status, on paywall analytics", () => {
      mocks.access.purchased = false;
      render(
        <CertificatePanel
          {...createProps({
            result: { ...result, zoningStatus: "Compliant" },
            feasibilityStatus: "review_needed",
          })}
        />,
      );

      expect(analyticsEvents.trackCertificatePaywallViewed).toHaveBeenCalledWith(
        expect.objectContaining({ feasibility_status: "review_needed" }),
      );
    });

    it("makes the guest transaction explicit and opens certificate sign-up first", () => {
      mocks.auth.user = null;
      render(<CertificatePanel {...createProps()} />);

      fireEvent.click(
        screen.getByRole("button", { name: "Continue to secure checkout — $29" }),
      );

      expect(screen.getByRole("dialog")).toHaveAttribute("data-mode", "sign-up");
      expect(screen.getByRole("dialog")).toHaveAttribute(
        "data-source",
        "certificate_purchase",
      );
    });

    it("quotes the Play-billed amount instead of the Stripe price in the Android app", () => {
      storePrice.override = {
        channel: "google-play",
        amount: "$28.99",
        amountCompact: "$28.99",
        unitAmount: "$28.99",
        exact: true,
        loading: false,
        error: null,
      };
      render(<CertificatePanel {...createProps()} />);

      expect(
        screen.getByRole("button", { name: "Unlock property certificate — $28.99" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText("One-time $28.99 · No subscription · Unlocks this property permanently"),
      ).toBeInTheDocument();
      expect(screen.queryByText(/\$29\b/)).not.toBeInTheDocument();
    });

    it("names no price where the store quotes its own sheet", async () => {
      storePrice.override = {
        channel: "app-store",
        amount: "At checkout",
        amountCompact: "At checkout",
        unitAmount: "At checkout",
        exact: false,
        loading: false,
        error: null,
      };
      mocks.startCertificateCheckout.mockResolvedValueOnce({ kind: "granted", demo: false });
      render(<CertificatePanel {...createProps()} />);

      expect(
        screen.getByText("One-time purchase · No subscription · Unlocks this property permanently"),
      ).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Unlock property certificate" }));

      await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
      expect(analyticsEvents.trackCertificateCheckoutRedirected).not.toHaveBeenCalled();
    });

    it("keeps the purchased state free of the offer and reassurance", () => {
      mocks.access.purchased = true;
      render(<CertificatePanel {...createProps()} />);

      expect(screen.getByText(/certificate unlocked/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "View complete certificate" })).toBeInTheDocument();
      expect(screen.queryByRole("list", { name: "Included in your certificate" })).not.toBeInTheDocument();
      expect(screen.queryByText(/no subscription/i)).not.toBeInTheDocument();
    });
  });

  describe("checkout funnel analytics", () => {
    beforeEach(() => {
      mocks.access.purchased = false;
    });

    it("records the CTA, then the Stripe redirect immediately before navigating", async () => {
      const assign = stubLocationAssign();
      mocks.startCertificateCheckout.mockResolvedValueOnce({
        kind: "redirect",
        url: "https://checkout.stripe.com/c/pay/cs_live_123",
      });
      render(<CertificatePanel {...createProps()} />);

      fireEvent.click(screen.getByRole("button", { name: /unlock property certificate/i }));

      await waitFor(() =>
        expect(assign).toHaveBeenCalledWith("https://checkout.stripe.com/c/pay/cs_live_123"),
      );
      const started = analyticsEvents.trackCertificateCheckoutStarted;
      expect(started).toHaveBeenCalledTimes(1);
      expect(started.mock.invocationCallOrder[0]).toBeLessThan(
        mocks.startCertificateCheckout.mock.invocationCallOrder[0],
      );
      const redirected = analyticsEvents.trackCertificateCheckoutRedirected;
      expect(redirected).toHaveBeenCalledTimes(1);
      expect(redirected).toHaveBeenCalledWith({
        value: CERTIFICATE_PRICE_CENTS / 100,
        currency: "USD",
        purchase_channel: "web_stripe",
        feasibility_status: "eligible",
      });
      expect(redirected.mock.invocationCallOrder[0]).toBeGreaterThan(
        mocks.startCertificateCheckout.mock.invocationCallOrder[0],
      );
      expect(redirected.mock.invocationCallOrder[0]).toBeLessThan(
        assign.mock.invocationCallOrder[0],
      );
    });

    it("continues the pending guest purchase after authentication", async () => {
      mocks.auth.user = null;
      const assign = stubLocationAssign();
      mocks.startCertificateCheckout.mockResolvedValueOnce({
        kind: "redirect",
        url: "https://checkout.stripe.com/c/pay/cs_live_after_auth",
      });
      render(<CertificatePanel {...createProps()} />);

      fireEvent.click(screen.getByRole("button", { name: /continue to secure checkout/i }));
      fireEvent.click(screen.getByRole("button", { name: "Complete authentication" }));

      await waitFor(() =>
        expect(assign).toHaveBeenCalledWith(
          "https://checkout.stripe.com/c/pay/cs_live_after_auth",
        ),
      );
      expect(mocks.getIdToken).toHaveBeenCalledTimes(1);
      expect(mocks.startCertificateCheckout).toHaveBeenCalledTimes(1);
      expect(analyticsEvents.trackCertificateCheckoutStarted).toHaveBeenCalledTimes(1);
      expect(analyticsEvents.trackCertificateCheckoutRedirected).toHaveBeenCalledTimes(1);
    });

    it("resumes the purchase when sign-in remounts the Studio for a real address", async () => {
      mocks.auth.user = null;
      const assign = stubLocationAssign();
      mocks.startCertificateCheckout.mockResolvedValueOnce({
        kind: "redirect",
        url: "https://checkout.stripe.com/c/pay/cs_live_after_remount",
      });
      const livePanel = render(<CertificatePanel {...createProps()} />);

      fireEvent.click(screen.getByRole("button", { name: /continue to secure checkout/i }));
      // Signing in swaps the Studio for SignedInStudioGate: this panel unmounts
      // before the session publishes, and a fresh one mounts afterwards.
      livePanel.unmount();
      expect(mocks.startCertificateCheckout).not.toHaveBeenCalled();
      expect(hasCertificatePurchaseIntent(certificateKey(parcel))).toBe(true);

      mocks.auth.user = { uid: "new-owner", getIdToken: mocks.getIdToken };
      mocks.auth.profile = { role: "user" };
      render(<CertificatePanel {...createProps()} />);

      await waitFor(() =>
        expect(assign).toHaveBeenCalledWith(
          "https://checkout.stripe.com/c/pay/cs_live_after_remount",
        ),
      );
      expect(mocks.startCertificateCheckout).toHaveBeenCalledTimes(1);
      expect(hasCertificatePurchaseIntent()).toBe(false);
    });

    it("forgets the purchase when the account step is dismissed", async () => {
      mocks.auth.user = null;
      const { rerender } = render(<CertificatePanel {...createProps()} />);

      fireEvent.click(screen.getByRole("button", { name: /continue to secure checkout/i }));
      fireEvent.click(screen.getByRole("button", { name: "Dismiss authentication" }));
      expect(hasCertificatePurchaseIntent()).toBe(false);

      // A later sign-in from elsewhere (e.g. the header) must not start Checkout.
      mocks.auth.user = { uid: "new-owner", getIdToken: mocks.getIdToken };
      rerender(<CertificatePanel {...createProps()} />);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(mocks.startCertificateCheckout).not.toHaveBeenCalled();
    });

    it("never routes a builder account from the purchase prompt into homeowner checkout", async () => {
      mocks.auth.user = null;
      mocks.auth.profile = { role: "builder" };
      render(<CertificatePanel {...createProps()} />);

      fireEvent.click(screen.getByRole("button", { name: /continue to secure checkout/i }));
      fireEvent.click(screen.getByRole("button", { name: "Complete authentication" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(hasCertificatePurchaseIntent()).toBe(false);
      expect(mocks.getIdToken).not.toHaveBeenCalled();
      expect(mocks.startCertificateCheckout).not.toHaveBeenCalled();
      expect(analyticsEvents.trackCertificateCheckoutStarted).not.toHaveBeenCalled();
    });

    it("waits for the new session's profile before resuming checkout", async () => {
      mocks.auth.user = null;
      const assign = stubLocationAssign();
      mocks.startCertificateCheckout.mockResolvedValueOnce({
        kind: "redirect",
        url: "https://checkout.stripe.com/c/pay/cs_live_after_profile",
      });
      const { rerender } = render(<CertificatePanel {...createProps()} />);

      fireEvent.click(screen.getByRole("button", { name: /continue to secure checkout/i }));
      mocks.auth.loading = true;
      fireEvent.click(screen.getByRole("button", { name: "Complete authentication" }));
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(mocks.startCertificateCheckout).not.toHaveBeenCalled();

      mocks.auth.loading = false;
      mocks.auth.profile = { role: "user" };
      rerender(<CertificatePanel {...createProps()} />);

      await waitFor(() =>
        expect(assign).toHaveBeenCalledWith(
          "https://checkout.stripe.com/c/pay/cs_live_after_profile",
        ),
      );
      expect(mocks.startCertificateCheckout).toHaveBeenCalledTimes(1);
    });

    it("does not start a duplicate checkout after auth for a recovery intent", async () => {
      mocks.auth.user = null;
      mocks.intent = { kind: "checkout", certKey: certificateKey(parcel) };
      mocks.recoveryStatus = "checking";
      render(<CertificatePanel {...createProps()} />);

      fireEvent.click(
        screen.getByRole("button", { name: "Sign in to verify certificate access" }),
      );
      expect(screen.getByRole("dialog")).toHaveAttribute("data-mode", "sign-in");
      fireEvent.click(screen.getByRole("button", { name: "Complete authentication" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(mocks.startCertificateCheckout).not.toHaveBeenCalled();
      expect(analyticsEvents.trackCertificateCheckoutStarted).not.toHaveBeenCalled();
    });

    it("does not record a redirect when the checkout API fails", async () => {
      mocks.startCertificateCheckout.mockRejectedValueOnce(
        new CertificateCheckoutError("Payments are temporarily unavailable."),
      );
      render(<CertificatePanel {...createProps()} />);

      fireEvent.click(screen.getByRole("button", { name: /unlock property certificate/i }));

      expect(await screen.findByText("Payments are temporarily unavailable.")).toBeInTheDocument();
      expect(analyticsEvents.trackCertificateCheckoutStarted).toHaveBeenCalledTimes(1);
      expect(analyticsEvents.trackCertificateCheckoutRedirected).not.toHaveBeenCalled();
    });

    it("does not count checkout as started when session verification fails", async () => {
      mocks.getIdToken.mockRejectedValueOnce(new Error("auth unavailable"));
      render(<CertificatePanel {...createProps()} />);

      fireEvent.click(screen.getByRole("button", { name: /unlock property certificate/i }));

      expect(await screen.findByText("Could not start checkout. Please try again.")).toBeInTheDocument();
      expect(mocks.startCertificateCheckout).not.toHaveBeenCalled();
      expect(analyticsEvents.trackCertificateCheckoutStarted).not.toHaveBeenCalled();
      expect(analyticsEvents.trackCertificateCheckoutRedirected).not.toHaveBeenCalled();
    });

    it("does not report a redirect or grant for a malformed successful API response", async () => {
      const assign = stubLocationAssign();
      const actual = await vi.importActual<typeof import("@/lib/certificate-checkout")>("@/lib/certificate-checkout");
      mocks.startCertificateCheckout.mockImplementationOnce(actual.startCertificateCheckout);
      const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ url: "not-a-checkout-url" }), { status: 200 }),
      );
      try {
        render(<CertificatePanel {...createProps()} />);
        fireEvent.click(screen.getByRole("button", { name: /unlock property certificate/i }));
        expect(await screen.findByText("Could not start checkout. Please try again.")).toBeInTheDocument();
        expect(analyticsEvents.trackCertificateCheckoutStarted).toHaveBeenCalledTimes(1);
        expect(analyticsEvents.trackCertificateCheckoutRedirected).not.toHaveBeenCalled();
        expect(assign).not.toHaveBeenCalled();
        expect(mocks.refresh).not.toHaveBeenCalled();
      } finally {
        fetch.mockRestore();
      }
    });

    it("does not record a redirect for a demo or already-purchased grant", async () => {
      mocks.startCertificateCheckout.mockResolvedValueOnce({ kind: "granted", demo: true });
      render(<CertificatePanel {...createProps()} />);

      fireEvent.click(screen.getByRole("button", { name: /unlock property certificate/i }));

      await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
      expect(analyticsEvents.trackCertificateCheckoutRedirected).not.toHaveBeenCalled();
    });

    it("records a verified cancellation intent once and reassures without an error", async () => {
      mocks.intent = { kind: "cancel", certKey: null };

      const view = render(
        <StrictMode>
          <CertificatePanel {...createProps()} />
        </StrictMode>,
      );

      expect(
        await screen.findByText(
          "Checkout cancelled. Your property analysis is still here whenever you're ready.",
        ),
      ).toBeInTheDocument();
      expect(analyticsEvents.trackCertificateCheckoutCancelled).toHaveBeenCalledTimes(1);
      expect(analyticsEvents.trackCertificateCheckoutCancelled).toHaveBeenCalledWith({
        purchase_channel: "web_stripe",
      });

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.queryByText("Payment Issue")).not.toBeInTheDocument();

      // A reload after processing carries no marker, so nothing fires again.
      view.unmount();
      mocks.intent = null;
      render(<CertificatePanel {...createProps()} />);
      expect(analyticsEvents.trackCertificateCheckoutCancelled).toHaveBeenCalledTimes(1);
    });

    it("ignores checkout markers other than the cancellation stamp", () => {
      window.history.replaceState(null, "", "/studio?checkout=paid");

      render(<CertificatePanel {...createProps()} />);

      expect(analyticsEvents.trackCertificateCheckoutCancelled).not.toHaveBeenCalled();
      expect(screen.queryByText(/checkout cancelled/i)).not.toBeInTheDocument();
    });

    it("clears the cancellation notice when the buyer tries again", async () => {
      mocks.intent = { kind: "cancel", certKey: null };
      mocks.startCertificateCheckout.mockResolvedValueOnce({ kind: "granted", demo: true });
      render(<CertificatePanel {...createProps()} />);
      expect(await screen.findByText(/checkout cancelled/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /unlock property certificate/i }));

      await waitFor(() => expect(screen.queryByText(/checkout cancelled/i)).not.toBeInTheDocument());
      expect(mocks.acknowledgeCancellation).toHaveBeenCalledTimes(1);
    });

    it("keeps a retried cancellation cleared when the Certificate panel remounts", async () => {
      mocks.intent = { kind: "cancel", certKey: null };
      mocks.startCertificateCheckout.mockRejectedValueOnce(new Error("Fixture failure"));
      const view = render(<CertificatePanel {...createProps()} />);
      expect(await screen.findByText(/checkout cancelled/i)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /unlock property certificate/i }));
      await screen.findByText("Could not start checkout. Please try again.");
      view.unmount();
      render(<CertificatePanel {...createProps()} />);
      expect(screen.queryByText(/checkout cancelled/i)).not.toBeInTheDocument();
      expect(analyticsEvents.trackCertificateCheckoutCancelled).toHaveBeenCalledTimes(1);
    });

    it("sends only bounded parameters on every certificate funnel event", async () => {
      mocks.intent = { kind: "cancel", certKey: null };
      const assign = stubLocationAssign();
      mocks.startCertificateCheckout.mockResolvedValueOnce({
        kind: "redirect",
        url: "https://checkout.stripe.com/c/pay/cs_live_123",
      });
      render(<CertificatePanel {...createProps({ projectBriefPreview: briefPreview })} />);

      fireEvent.click(screen.getByRole("button", { name: /unlock property certificate/i }));
      await waitFor(() => expect(assign).toHaveBeenCalled());

      const calls = [
        ...analyticsEvents.trackCertificatePaywallViewed.mock.calls,
        ...analyticsEvents.trackCertificateCheckoutStarted.mock.calls,
        ...analyticsEvents.trackCertificateCheckoutRedirected.mock.calls,
        ...analyticsEvents.trackCertificateCheckoutCancelled.mock.calls,
      ] as unknown as Array<[Record<string, unknown>]>;
      expect(calls.length).toBeGreaterThanOrEqual(3);
      for (const [params] of calls) {
        for (const key of Object.keys(params)) {
          expect(BOUNDED_ANALYTICS_KEYS).toContain(key);
        }
        const serialized = JSON.stringify(params);
        expect(serialized).not.toContain(parcel.address);
        expect(serialized).not.toContain("owner-1");
        expect(serialized).not.toContain("cs_live_123");
        expect(serialized).not.toContain(certificateKey(parcel));
      }
    });
  });

  it("prepares the combined AI brief before automatically opening a newly unlocked certificate", async () => {
    const onGenerateProjectBrief = vi.fn().mockResolvedValue(brief);
    const onOpenCertificate = vi.fn();
    const props = createProps({ onGenerateProjectBrief, onOpenCertificate });

    renderWithUnlock(props);

    await waitFor(() => {
      expect(onGenerateProjectBrief).toHaveBeenCalledWith("test-token");
      expect(onOpenCertificate).toHaveBeenCalledTimes(1);
    });
    expect(onGenerateProjectBrief).toHaveBeenCalledTimes(1);
  });

  it("does not regenerate or auto-open an existing grant read passively on a fresh visit", async () => {
    const onGenerateProjectBrief = vi.fn().mockResolvedValue(brief);
    const onOpenCertificate = vi.fn();
    const props = createProps({ onGenerateProjectBrief, onOpenCertificate });

    render(<CertificatePanel {...props} />);

    expect(await screen.findByText(/certificate unlocked/i)).toBeInTheDocument();
    expect(onGenerateProjectBrief).not.toHaveBeenCalled();
    expect(onOpenCertificate).not.toHaveBeenCalled();
  });

  it("auto-opens once when returning from Stripe checkout with the grant already written", async () => {
    mocks.intent = { kind: "checkout", certKey: certificateKey(parcel) };
    const onGenerateProjectBrief = vi.fn().mockResolvedValue(brief);
    const onOpenCertificate = vi.fn();
    const props = createProps({ onGenerateProjectBrief, onOpenCertificate });

    render(<CertificatePanel {...props} />);

    await waitFor(() => expect(onOpenCertificate).toHaveBeenCalledTimes(1));
    expect(onGenerateProjectBrief).toHaveBeenCalledTimes(1);
    // The marker must be stripped so a reload cannot re-arm the unlock.

  });

  it("opens a verified existing Certificate without treating it as a new Purchase", async () => {
    mocks.intent = { kind: "open", certKey: certificateKey(parcel) };
    const onOpenCertificate = vi.fn();
    const props = createProps({ projectBrief: brief, onOpenCertificate });

    render(<CertificatePanel {...props} />);

    await waitFor(() => expect(onOpenCertificate).toHaveBeenCalledTimes(1));

  });

  it("does not open a Certificate while recovery is unverified for the active Parcel", async () => {
    mocks.intent = { kind: "open", certKey: "some-other-lot" };
    mocks.access.purchased = false;
    mocks.recoveryStatus = "checking";
    const onGenerateProjectBrief = vi.fn().mockResolvedValue(brief);
    const onOpenCertificate = vi.fn();
    const props = createProps({ onGenerateProjectBrief, onOpenCertificate });

    render(<CertificatePanel {...props} />);

    expect(await screen.findByText(/Your access record may still be arriving/)).toBeInTheDocument();
    expect(onOpenCertificate).not.toHaveBeenCalled();
    expect(onGenerateProjectBrief).not.toHaveBeenCalled();

  });

  it("does not treat pre-auth renders as an in-session unlock", async () => {
    // Fresh load: Firebase auth has not resolved yet, so the access hook
    // reports a settled not-purchased read for the guest uid.
    mocks.auth.user = null;
    mocks.access.purchased = false;
    mocks.access.loading = false;
    const onGenerateProjectBrief = vi.fn().mockResolvedValue(brief);
    const onOpenCertificate = vi.fn();
    const props = createProps({ onGenerateProjectBrief, onOpenCertificate });
    const { rerender } = render(<CertificatePanel {...props} />);

    // Auth resolves for a returning purchaser; their grant loads passively.
    mocks.auth.user = { uid: "owner-1", getIdToken: mocks.getIdToken };
    mocks.access.loading = true;
    rerender(<CertificatePanel {...props} />);
    mocks.access.purchased = true;
    mocks.access.loading = false;
    rerender(<CertificatePanel {...props} />);

    expect(await screen.findByText(/certificate unlocked/i)).toBeInTheDocument();
    expect(onOpenCertificate).not.toHaveBeenCalled();
    expect(onGenerateProjectBrief).not.toHaveBeenCalled();
  });

  it("opens the deterministic certificate with an inline error when token lookup fails", async () => {
    mocks.getIdToken.mockRejectedValueOnce(new Error("auth unavailable"));
    const onGenerateProjectBrief = vi.fn().mockResolvedValue(brief);
    const onOpenCertificate = vi.fn();
    const props = createProps({ onGenerateProjectBrief, onOpenCertificate });

    renderWithUnlock(props);

    expect(await screen.findByRole("alert")).toHaveTextContent(/verify your session/i);
    expect(onGenerateProjectBrief).not.toHaveBeenCalled();
    expect(onOpenCertificate).toHaveBeenCalledWith(
      "We could not verify your session. Please try again.",
    );
    expect(onOpenCertificate).toHaveBeenCalledTimes(1);
  });

  it("does not reopen the same certificate after a loading refresh flicker", async () => {
    const onOpenCertificate = vi.fn();
    const props = createProps({ projectBrief: brief, onOpenCertificate });
    const { rerender } = renderWithUnlock(props);

    await waitFor(() => expect(onOpenCertificate).toHaveBeenCalledTimes(1));

    mocks.access.purchased = false;
    mocks.access.loading = true;
    rerender(<CertificatePanel {...props} />);

    mocks.access.purchased = true;
    mocks.access.loading = false;
    rerender(<CertificatePanel {...props} />);

    await waitFor(() => expect(onOpenCertificate).toHaveBeenCalledTimes(1));
  });

  it("reports the Ads conversion and GA4 purchase once when returning from Stripe checkout", async () => {
    mocks.intent = { kind: "checkout", certKey: certificateKey(parcel) };
    const props = createProps({ projectBrief: brief });

    render(<CertificatePanel {...props} />);

    await waitFor(() =>
      expect(mocks.trackPurchase).toHaveBeenCalledWith({
        value: CERTIFICATE_PRICE_CENTS / 100,
        transactionId: "order-safe-12345",
      }),
    );
    expect(mocks.trackPurchase).toHaveBeenCalledTimes(1);
    expect(analyticsEvents.trackCertificatePurchase).toHaveBeenCalledWith({
      transaction_id: "order-safe-12345",
      value: CERTIFICATE_PRICE_CENTS / 100,
      currency: "USD",
      purchase_channel: "web_stripe",
    });
  });

  it("does not report a conversion for a grant read passively on a fresh visit", async () => {
    const props = createProps({ projectBrief: brief });

    render(<CertificatePanel {...props} />);

    expect(await screen.findByText(/certificate unlocked/i)).toBeInTheDocument();
    expect(mocks.trackPurchase).not.toHaveBeenCalled();
  });

  it("reports the conversion only once across a loading refresh flicker", async () => {
    mocks.intent = { kind: "checkout", certKey: certificateKey(parcel) };
    const props = createProps({ projectBrief: brief });
    const { rerender } = render(<CertificatePanel {...props} />);

    await waitFor(() => expect(mocks.trackPurchase).toHaveBeenCalledTimes(1));

    mocks.access.purchased = false;
    mocks.access.loading = true;
    rerender(<CertificatePanel {...props} />);

    mocks.access.purchased = true;
    mocks.access.loading = false;
    rerender(<CertificatePanel {...props} />);

    await waitFor(() => expect(mocks.trackPurchase).toHaveBeenCalledTimes(1));
  });

  it("displays checkout error banner directly in EstimateSummaryPanel above CTA", async () => {
    mocks.access.purchased = false;
    mocks.startCertificateCheckout.mockRejectedValueOnce(
      new CertificateCheckoutError("Could not connect to payment processor. Please try again."),
    );
    const props = createProps();
    render(<CertificatePanel {...props} />);

    const button = screen.getByRole("button", { name: /unlock property certificate/i });
    fireEvent.click(button);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not connect to payment processor. Please try again.",
    );
    expect(screen.getByRole("button", { name: /unlock property certificate/i })).toBeEnabled();
  });

  it("says it is opening secure checkout while the session is created, not that it is preparing a certificate", async () => {
    mocks.access.purchased = false;
    let finishCheckout: (outcome: { kind: "redirect"; url: string }) => void = () => {};
    mocks.startCertificateCheckout.mockReturnValueOnce(
      new Promise((resolve) => {
        finishCheckout = resolve;
      }),
    );
    stubLocationAssign();
    render(<CertificatePanel {...createProps()} />);

    fireEvent.click(screen.getByRole("button", { name: /unlock property certificate/i }));

    const busy = await screen.findByRole("button", { name: "Opening secure checkout" });
    expect(busy).toHaveAttribute("aria-busy", "true");
    expect(busy).toBeDisabled();
    expect(screen.queryByRole("button", { name: /preparing certificate/i })).not.toBeInTheDocument();

    finishCheckout({ kind: "redirect", url: "https://checkout.stripe.com/c/pay/cs_test_1" });
    await waitFor(() => expect(window.location.assign).toHaveBeenCalledTimes(1));
  });
});
