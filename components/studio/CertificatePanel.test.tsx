import { StrictMode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

const mocks = vi.hoisted(() => ({
  getIdToken: vi.fn(),
  refresh: vi.fn(),
  trackPurchase: vi.fn(),
  startCertificateCheckout: vi.fn(),
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
    mocks.getIdToken.mockReset().mockResolvedValue("test-token");
    mocks.refresh.mockReset();
    mocks.trackPurchase.mockReset();
    mocks.startCertificateCheckout.mockReset();
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

  it("explains the current site-fit issue and reusable property value before purchase", () => {
    mocks.access.purchased = false;
    const overLimitResult = { ...result, remainingCapacity: -380 };

    render(<CertificatePanel {...createProps({ result: overLimitResult })} />);

    expect(
      screen.getByRole("heading", {
        name: /unlock the complete record for .* one-time \$29/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("380 sf over modeled coverage allowance")).toBeInTheDocument();
    expect(
      screen.getByText(/reduce the adu footprint by at least 380 sf/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/one purchase unlocks this property/i)).toBeInTheDocument();
    expect(screen.getByText("Recommended next actions")).toBeInTheDocument();
    expect(screen.queryByText(/site plan and 3d view/i)).not.toBeInTheDocument();
  });

  describe("paywall offer", () => {
    beforeEach(() => {
      mocks.access.purchased = false;
    });

    function includedRows() {
      const list = screen.getByRole("list", { name: "Included in your certificate" });
      return within(list).getAllByRole("listitem");
    }

    it("leads with new property analysis, keeping export as the last convenience", () => {
      render(<CertificatePanel {...createProps()} />);

      const titles = includedRows().map(
        (row) => within(row).getByRole("heading", { level: 4 }).textContent,
      );
      expect(titles).toEqual([
        "Property-specific risk review",
        "Typical local approval path",
        "Approval timeline",
        "Recommended next actions",
        "Printable, shareable property record",
      ]);
      // Free-estimate figures are no longer the pitch.
      expect(screen.queryByText(/cost, rent, noi, and payback summary/i)).not.toBeInTheDocument();
    });

    it("previews locked sections without fabricating counts before a brief exists", () => {
      render(<CertificatePanel {...createProps()} />);

      for (const row of includedRows().slice(0, 4)) {
        expect(row.textContent).not.toMatch(/\d/);
      }
      expect(screen.getByText("Findings ranked for this lot, with what to verify")).toBeInTheDocument();
    });

    it("shows honest counts from an already generated brief preview", () => {
      render(<CertificatePanel {...createProps({ projectBriefPreview: briefPreview })} />);

      expect(screen.getByText("4 ranked risks to verify")).toBeInTheDocument();
      expect(screen.getByText("6-stage permit path")).toBeInTheDocument();
      expect(screen.getByText("12–18 week typical approval timeline")).toBeInTheDocument();
      expect(screen.getByText("3 recorded next steps")).toBeInTheDocument();
      // The locked detail itself stays locked.
      expect(screen.queryByText("Rear setback")).not.toBeInTheDocument();
    });

    it("falls back to descriptive rows when a preview count is zero", () => {
      const empty = { ...briefPreview, locked: { riskCount: 0, stageCount: 0, nextStepCount: 0 } };
      render(<CertificatePanel {...createProps({ projectBriefPreview: empty })} />);

      expect(screen.queryByText(/^0 /)).not.toBeInTheDocument();
      expect(screen.getByText("Findings ranked for this lot, with what to verify")).toBeInTheDocument();
    });

    it("names the exact web price, one-time purchase and permanent unlock at the CTA", () => {
      render(<CertificatePanel {...createProps()} />);

      expect(
        screen.getByRole("button", { name: "Unlock property certificate — $29" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText("One-time $29 · No subscription · Unlocks this property permanently"),
      ).toBeInTheDocument();
      // Planning disclaimer is preserved.
      expect(screen.getByText(/not a permit, appraisal/i)).toBeInTheDocument();
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

    it("never routes a builder account from the purchase prompt into homeowner checkout", async () => {
      mocks.auth.user = null;
      mocks.auth.profile = { role: "builder" };
      render(<CertificatePanel {...createProps()} />);

      fireEvent.click(screen.getByRole("button", { name: /continue to secure checkout/i }));
      fireEvent.click(screen.getByRole("button", { name: "Complete authentication" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      await new Promise((resolve) => setTimeout(resolve, 0));
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
    expect(screen.getByText("Payment Issue")).toBeInTheDocument();
  });
});
