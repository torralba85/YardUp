import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  calculateFeasibility,
  defaultAduConfig,
  defaultFinancialAssumptions,
  parcelPresets,
} from "@/lib/feasibility";
import type { AIProjectBrief } from "@/lib/ai-types";
import CertificatePanel, { type CertificatePanelProps } from "./CertificatePanel";

const mocks = vi.hoisted(() => ({
  getIdToken: vi.fn(),
  refresh: vi.fn(),
  access: {
    purchased: true,
    loading: false,
  },
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: { uid: "owner-1", getIdToken: mocks.getIdToken } }),
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

describe("CertificatePanel", () => {
  beforeEach(() => {
    mocks.getIdToken.mockReset().mockResolvedValue("test-token");
    mocks.refresh.mockReset();
    mocks.access.purchased = true;
    mocks.access.loading = false;
  });

  it("prepares the combined AI brief before automatically opening an unlocked certificate", async () => {
    const onGenerateProjectBrief = vi.fn().mockResolvedValue(brief);
    const onOpenCertificate = vi.fn();
    const props = createProps({ onGenerateProjectBrief, onOpenCertificate });

    render(<CertificatePanel {...props} />);

    await waitFor(() => {
      expect(onGenerateProjectBrief).toHaveBeenCalledWith("test-token");
      expect(onOpenCertificate).toHaveBeenCalledTimes(1);
    });
    expect(onGenerateProjectBrief).toHaveBeenCalledTimes(1);
  });

  it("opens the deterministic certificate with an inline error when token lookup fails", async () => {
    mocks.getIdToken.mockRejectedValueOnce(new Error("auth unavailable"));
    const onGenerateProjectBrief = vi.fn().mockResolvedValue(brief);
    const onOpenCertificate = vi.fn();
    const props = createProps({ onGenerateProjectBrief, onOpenCertificate });

    render(<CertificatePanel {...props} />);

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
    const { rerender } = render(<CertificatePanel {...props} />);

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
