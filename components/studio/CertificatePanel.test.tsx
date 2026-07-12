import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  calculateFeasibility,
  defaultAduConfig,
  defaultFinancialAssumptions,
  parcelPresets,
} from "@/lib/feasibility";
import type { AIProjectBrief } from "@/lib/ai-types";
import { certificateKey } from "@/lib/certificate-key";
import CertificatePanel, { type CertificatePanelProps } from "./CertificatePanel";

const mocks = vi.hoisted(() => ({
  getIdToken: vi.fn(),
  refresh: vi.fn(),
  access: {
    purchased: true,
    loading: false,
  },
  auth: {
    user: null as { uid: string; getIdToken: () => Promise<string> } | null,
  },
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: mocks.auth.user }),
}));

vi.mock("@/lib/certificate-access", () => ({
  useCertificateAccess: () => ({ ...mocks.access, refresh: mocks.refresh }),
}));

vi.mock("@/components/auth/AuthModal", () => ({
  AuthModal: () => null,
}));

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
    mocks.access.purchased = true;
    mocks.access.loading = false;
    mocks.auth.user = { uid: "owner-1", getIdToken: mocks.getIdToken };
    window.history.replaceState(null, "", "/");
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
});
