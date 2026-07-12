import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AIProjectBrief } from "@/lib/ai-types";
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

describe("AIProjectBriefPanel", () => {
  it("uses one action to request the combined parcel and timeline brief", async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn().mockResolvedValue(brief);
    render(
      <AIProjectBriefPanel
        brief={null}
        loading={false}
        error={null}
        onGenerate={onGenerate}
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
        brief={brief}
        loading={false}
        error={null}
        onGenerate={vi.fn()}
      />,
    );

    expect(screen.getByText(brief.headline)).toBeInTheDocument();
    expect(screen.getByText("Parcel readout")).toBeInTheDocument();
    expect(screen.getByText("Typical approval path")).toBeInTheDocument();
    expect(screen.getByText("Pre-application check")).toBeInTheDocument();
    expect(screen.getByText("Recorded next steps")).toBeInTheDocument();
    expect(screen.getByText(/5–9/)).toBeInTheDocument();
  });

  it("uses a layout-matched loading state and an inline error state", () => {
    const { rerender } = render(
      <AIProjectBriefPanel
        brief={null}
        loading
        error={null}
        onGenerate={vi.fn()}
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
        brief={null}
        loading={false}
        error="The combined brief is unavailable."
        onGenerate={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("The combined brief is unavailable.");
  });
});
