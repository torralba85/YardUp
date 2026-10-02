import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  calculateFeasibility,
  defaultAduConfig,
  defaultFinancialAssumptions,
  parcelPresets,
} from "@/lib/feasibility";
import type { AIProjectBrief } from "@/lib/ai-types";
import { certificateKey } from "@/lib/certificate-key";
import { CERTIFICATE_PRICE_CENTS } from "@/lib/certificate-pricing";
import { CertificateCheckoutError } from "@/lib/certificate-checkout";
import CertificatePanel, { type CertificatePanelProps } from "./CertificatePanel";

const mocks = vi.hoisted(() => ({
  getIdToken: vi.fn(),
  refresh: vi.fn(),
  trackPurchase: vi.fn(),
  startCertificateCheckout: vi.fn(),
  access: {
    purchased: true,
    loading: false,
    analyticsOrderId: "order-safe-12345",
  },
  auth: {
    user: null as { uid: string; getIdToken: () => Promise<string> } | null,
  },
}));

const analyticsEvents = vi.hoisted(() => ({
  trackCertificatePaywallViewed: vi.fn(),
  trackCertificateCheckoutStarted: vi.fn(),
  trackCertificatePurchase: vi.fn(),
  mapPurchaseChannel: vi.fn(() => "web_stripe"),
  mapFeasibilityVerdict: vi.fn(() => "eligible"),
}));

vi.mock("@/lib/analytics/events", () => analyticsEvents);

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: mocks.auth.user }),
}));

vi.mock("@/lib/certificate-access", () => ({
  useCertificateAccess: () => ({ ...mocks.access, refresh: mocks.refresh }),
}));

vi.mock("@/lib/analytics/adsConversion", () => ({
  trackPurchase: mocks.trackPurchase,
}));

vi.mock("@/components/auth/AuthModal", () => ({
  AuthModal: () => null,
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
    parcel,
    result,
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

describe("CertificatePanel", () => {
  beforeEach(() => {
    mocks.getIdToken.mockReset().mockResolvedValue("test-token");
    mocks.refresh.mockReset();
    mocks.trackPurchase.mockReset();
    mocks.startCertificateCheckout.mockReset();
    mocks.access.purchased = true;
    mocks.access.loading = false;
    mocks.auth.user = { uid: "owner-1", getIdToken: mocks.getIdToken };
    window.history.replaceState(null, "", "/");
  });

  it("uses a contextual eyebrow without changing the desktop step label by default", () => {
    const props = createProps();
    const { rerender } = render(<CertificatePanel {...props} />);

    expect(screen.getByText("Step 4 · Certificate")).toBeInTheDocument();

    rerender(<CertificatePanel {...props} eyebrow="Certificate of Feasibility" />);

    expect(screen.getByText("Certificate of Feasibility")).toBeInTheDocument();
    expect(screen.queryByText("Step 4 · Certificate")).not.toBeInTheDocument();
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
    expect(screen.getByText("Recommended next steps")).toBeInTheDocument();
    expect(screen.queryByText(/site plan and 3d view/i)).not.toBeInTheDocument();
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
    window.history.replaceState(null, "", `/?cert=${certificateKey(parcel)}`);
    const onGenerateProjectBrief = vi.fn().mockResolvedValue(brief);
    const onOpenCertificate = vi.fn();
    const props = createProps({ onGenerateProjectBrief, onOpenCertificate });

    render(<CertificatePanel {...props} />);

    await waitFor(() => expect(onOpenCertificate).toHaveBeenCalledTimes(1));
    expect(onGenerateProjectBrief).toHaveBeenCalledTimes(1);
    // The marker must be stripped so a reload cannot re-arm the unlock.
    expect(window.location.search).toBe("");
  });

  it("accepts the legacy cert=1 checkout marker", async () => {
    window.history.replaceState(null, "", "/?cert=1");
    const onOpenCertificate = vi.fn();
    const props = createProps({ projectBrief: brief, onOpenCertificate });

    render(<CertificatePanel {...props} />);

    await waitFor(() => expect(onOpenCertificate).toHaveBeenCalledTimes(1));
    expect(window.location.search).toBe("");
  });

  it("ignores a checkout marker stamped for a different parcel", async () => {
    window.history.replaceState(null, "", "/?cert=some-other-lot");
    const onGenerateProjectBrief = vi.fn().mockResolvedValue(brief);
    const onOpenCertificate = vi.fn();
    const props = createProps({ onGenerateProjectBrief, onOpenCertificate });

    render(<CertificatePanel {...props} />);

    expect(await screen.findByText(/certificate unlocked/i)).toBeInTheDocument();
    expect(onOpenCertificate).not.toHaveBeenCalled();
    expect(onGenerateProjectBrief).not.toHaveBeenCalled();
    expect(window.location.search).toBe("");
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
    window.history.replaceState(null, "", `/?cert=${certificateKey(parcel)}`);
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
    window.history.replaceState(null, "", `/?cert=${certificateKey(parcel)}`);
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

    const button = screen.getByRole("button", { name: /unlock complete certificate/i });
    fireEvent.click(button);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not connect to payment processor. Please try again.",
    );
    expect(screen.getByText("Payment Issue")).toBeInTheDocument();
  });
});
