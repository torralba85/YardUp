import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AIProjectBrief, AIProjectBriefResponse } from "@/lib/ai-types";
import AIProjectBriefPanel from "./AIProjectBriefPanel";

const auth = vi.hoisted(() => ({
  getIdToken: vi.fn().mockResolvedValue("test-token"),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: { getIdToken: auth.getIdToken }, loading: false }),
}));

vi.mock("@/components/auth/AuthModal", () => ({
  AuthModal: () => null,
}));

const brief: AIProjectBrief = {
  headline: "A workable backyard concept with two review items",
  summary: "The current concept fits the recorded coverage assumptions.",
  bestFit: "Keep the 600 sf one-bedroom concept and confirm utility routing.",
  risks: [
    { label: "Utility route", level: "medium", explanation: "Confirm the sewer path." },
    { label: "Coverage", level: "low", explanation: "The concept remains below the cap." },
  ],
  permitTrack: {
    name: "Washington ministerial ADU review",
    type: "ministerial",
    basis: "Typical local administrative review for an ADU concept.",
  },
  stages: [
    {
      name: "Pre-application check",
      description: "Confirm the submittal set.",
      estWeeksLow: 1,
      estWeeksHigh: 2,
      status: "review",
    },
    {
      name: "Plan review",
      description: "Jurisdiction review of the application.",
      estWeeksLow: 4,
      estWeeksHigh: 7,
      status: "clear",
    },
  ],
  totalEstWeeksLow: 5,
  totalEstWeeksHigh: 9,
  recommendedNextSteps: ["Confirm utilities.", "Prepare the plan set.", "Submit for review."],
  disclaimer: "AI-assisted planning estimate only; not an approval guarantee.",
};

const fullResponse: AIProjectBriefResponse = { tier: "full", brief };

function previewResponseWith(
  locked: { riskCount: number; stageCount: number; nextStepCount: number },
): AIProjectBriefResponse {
  return {
    tier: "preview",
    preview: {
      headline: brief.headline,
      summary: brief.summary,
      permitTrack: { name: brief.permitTrack.name, type: brief.permitTrack.type },
      totalEstWeeksLow: brief.totalEstWeeksLow,
      totalEstWeeksHigh: brief.totalEstWeeksHigh,
      firstRisk: brief.risks[0],
      locked,
      disclaimer: brief.disclaimer,
    },
  };
}

const previewResponse = previewResponseWith({ riskCount: 2, stageCount: 2, nextStepCount: 3 });

describe("AIProjectBriefPanel", () => {
  it("uses one action to request the combined parcel and timeline brief", async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn().mockResolvedValue(fullResponse);
    render(
      <AIProjectBriefPanel
        response={null}
        loading={false}
        error={null}
        onGenerate={onGenerate}
        onViewCertificate={vi.fn()}
      />,
    );

    const region = screen.getByRole("region", { name: "AI parcel and timeline brief" });
    const action = within(region).getByRole("button", {
      name: "Generate AI parcel and timeline brief",
    });
    expect(within(region).getAllByRole("button")).toHaveLength(1);

    await user.click(action);
    expect(onGenerate).toHaveBeenCalledTimes(1);
    expect(onGenerate).toHaveBeenCalledWith("test-token");
  });

  it("renders the merged parcel assessment and approval stages as one artifact", () => {
    render(
      <AIProjectBriefPanel
        response={fullResponse}
        loading={false}
        error={null}
        onGenerate={vi.fn()}
        onViewCertificate={vi.fn()}
      />,
    );

    expect(screen.getByText(brief.headline)).toBeInTheDocument();
    expect(screen.getByText("Parcel readout")).toBeInTheDocument();
    expect(screen.getByText("Typical approval path")).toBeInTheDocument();
    expect(screen.getByText("Pre-application check")).toBeInTheDocument();
    expect(screen.getByText("Recorded next steps")).toBeInTheDocument();
    expect(screen.getByText(/5–9/)).toBeInTheDocument();
  });

  it("renders the preview tier with the locked contents and certificate unlock CTA", async () => {
    const user = userEvent.setup();
    const onViewCertificate = vi.fn();
    render(
      <AIProjectBriefPanel
        response={previewResponse}
        loading={false}
        error={null}
        onGenerate={vi.fn()}
        onViewCertificate={onViewCertificate}
      />,
    );

    // The narrative hook is visible…
    expect(screen.getByText(brief.headline)).toBeInTheDocument();
    expect(screen.getByText("Preview")).toBeInTheDocument();
    expect(screen.getByText(brief.permitTrack.name)).toBeInTheDocument();
    expect(screen.getByText(/5–9/)).toBeInTheDocument();
    expect(screen.getByText("Utility route")).toBeInTheDocument();

    // …but the paid depth is locked behind honest counts, not rendered.
    expect(screen.queryByText("Parcel readout")).not.toBeInTheDocument();
    expect(screen.queryByText("Pre-application check")).not.toBeInTheDocument();
    expect(screen.queryByText("Recorded next steps")).not.toBeInTheDocument();
    expect(screen.queryByText(brief.permitTrack.basis)).not.toBeInTheDocument();
    expect(
      screen.getByText(/2 ranked risks · 2 permit stages with week-by-week timing · 3 recorded next steps/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Unlock with the certificate/ }));
    expect(onViewCertificate).toHaveBeenCalledTimes(1);
  });

  it("pluralizes the locked contents line by count", () => {
    render(
      <AIProjectBriefPanel
        response={previewResponseWith({ riskCount: 1, stageCount: 1, nextStepCount: 1 })}
        loading={false}
        error={null}
        onGenerate={vi.fn()}
        onViewCertificate={vi.fn()}
      />,
    );

    expect(
      screen.getByText(
        /1 ranked risk · 1 permit stage with week-by-week timing · 1 recorded next step/,
      ),
    ).toBeInTheDocument();
  });

  it("uses a layout-matched loading state and an inline error state", () => {
    const { rerender } = render(
      <AIProjectBriefPanel
        response={null}
        loading
        error={null}
        onGenerate={vi.fn()}
        onViewCertificate={vi.fn()}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Building the parcel and timeline brief",
    );
    expect(
      screen.getByRole("button", { name: "Generate AI parcel and timeline brief" }),
    ).toBeDisabled();

    rerender(
      <AIProjectBriefPanel
        response={null}
        loading={false}
        error="The combined brief is unavailable."
        onGenerate={vi.fn()}
        onViewCertificate={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("The combined brief is unavailable.");
  });
});
