import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import BuilderLeadPanel from "./BuilderLeadPanel";
import {
  calculateFeasibility,
  defaultAduConfig,
  defaultFinancialAssumptions,
  parcelPresets,
} from "@/lib/feasibility";

const parcel = parcelPresets[0];
const result = calculateFeasibility(
  parcel,
  defaultAduConfig,
  defaultFinancialAssumptions,
);

describe("BuilderLeadPanel mobile accessibility", () => {
  it("uses a 44px close target and iOS-safe form text sizes", () => {
    render(
      <BuilderLeadPanel
        open
        draft={{ name: "Alma Reyes", email: "alma@example.com", phone: "", message: "" }}
        onDraftChange={vi.fn()}
        parcelKey={parcel.id}
        parcel={parcel}
        config={defaultAduConfig}
        assumptions={defaultFinancialAssumptions}
        result={result}
        signedIn
        matches={{ status: "ready", count: 1 }}
        onClose={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue({ matchedCount: 1 })}
        onRequestSignIn={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Close builder connection form" }),
    ).toHaveClass("min-h-11", "min-w-11");

    for (const label of ["Name", "Email", "Phone (optional)", "Message (optional)"]) {
      expect(screen.getByLabelText(label)).toHaveClass("text-base", "sm:text-sm");
    }

    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Phone (optional)")).toHaveAttribute("type", "tel");
  });
});
