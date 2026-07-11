import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  calculateFeasibility,
  defaultAduConfig,
  defaultFinancialAssumptions,
  parcelPresets,
} from "@/lib/feasibility";
import type { AIProjectBrief } from "@/lib/ai-types";
import CertificatePanel from "./CertificatePanel";

const mocks = vi.hoisted(() => ({
  getIdToken: vi.fn().mockResolvedValue("test-token"),
  refresh: vi.fn(),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: { uid: "owner-1", getIdToken: mocks.getIdToken } }),
}));

vi.mock("@/lib/certificate-access", () => ({
  useCertificateAccess: () => ({ purchased: true, loading: false, refresh: mocks.refresh }),
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

describe("CertificatePanel", () => {
  it("prepares the combined AI brief before automatically opening an unlocked certificate", async () => {
    const parcel = parcelPresets[0];
    const result = calculateFeasibility(
      parcel,
      defaultAduConfig,
      defaultFinancialAssumptions,
    );
    const onGenerateProjectBrief = vi.fn().mockResolvedValue(brief);
    const onOpenCertificate = vi.fn();

    render(
      <CertificatePanel
        parcel={parcel}
        result={result}
        parcelName={`${parcel.address}, ${parcel.city}`}
        onOpenCertificate={onOpenCertificate}
        projectBrief={null}
        projectBriefLoading={false}
        projectBriefError={null}
        onGenerateProjectBrief={onGenerateProjectBrief}
      />,
    );

    await waitFor(() => {
      expect(onGenerateProjectBrief).toHaveBeenCalledWith("test-token");
      expect(onOpenCertificate).toHaveBeenCalledTimes(1);
    });
    expect(onGenerateProjectBrief).toHaveBeenCalledTimes(1);
  });
});
