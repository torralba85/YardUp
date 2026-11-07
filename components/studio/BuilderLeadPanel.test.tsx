import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { useState, type ComponentProps } from "react";
import {
  defaultAduConfig,
  defaultFinancialAssumptions,
  parcelPresets,
} from "@/lib/feasibility";
import BuilderLeadPanel, { type BuilderLeadDraft } from "./BuilderLeadPanel";

const result = {
  aduSqft: 600,
  totalFootprint: 1980,
  allowedFootprint: 2000,
  remainingCapacity: 20,
  coveragePercent: 39.6,
  maxCoveragePercent: 40,
  zoningStatus: "Compliant" as const,
  costLow: 220000,
  costHigh: 270000,
  costPerSqftLow: 367,
  costPerSqftHigh: 450,
  monthlyRent: 2050,
  annualNoi: 16605,
  paybackYears: 15.7,
  warnings: [],
  rentBasis: "Curated demo estimate",
  market: {
    source: "preset" as const,
    area: "Curated demo estimate",
    confidence: "medium" as const,
    verified: false,
  },
  operatingExpenseRatio: 0.325,
};

const janeDraft: BuilderLeadDraft = { name: "Jane Owner", email: "jane@example.com", phone: "", message: "" };

type PanelProps = ComponentProps<typeof BuilderLeadPanel>;

/** The Studio owns the draft; this stands in for it. */
function StatefulPanel({ initialDraft = janeDraft, ...props }: Partial<PanelProps> & { initialDraft?: BuilderLeadDraft }) {
  const [draft, setDraft] = useState(initialDraft);
  return <BaselinePanel draft={draft} onDraftChange={setDraft} {...props} />;
}

function BaselinePanel(props: Partial<PanelProps>) {
  return (
    <BuilderLeadPanel
      open
      draft={janeDraft}
      onDraftChange={vi.fn()}
      parcelKey="oak-street"
      parcel={parcelPresets[0]}
      config={defaultAduConfig}
      assumptions={defaultFinancialAssumptions}
      result={result}
      signedIn
      matches={{ status: "ready", count: 2 }}
      onClose={vi.fn()}
      onSubmit={vi.fn()}
      onRequestSignIn={vi.fn()}
      {...props}
    />
  );
}

function renderPanel(props: Partial<PanelProps> & { initialDraft?: BuilderLeadDraft } = {}) {
  return render(<StatefulPanel {...props} />);
}

describe("BuilderLeadPanel", () => {
  it("requires consent before submit", async () => {
    const submit = vi.fn();
    renderPanel({ onSubmit: submit });

    await userEvent.click(screen.getByRole("button", { name: /Submit snapshot/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/Consent is required/i);
    expect(submit).not.toHaveBeenCalled();
  });

  it("shows the result beside Submit, after the fields", async () => {
    // The form is taller than most screens; a message at its top was out of view.
    renderPanel();

    const submitButton = screen.getByRole("button", { name: /Submit snapshot/i });
    await userEvent.click(submitButton);

    const alert = screen.getByRole("alert");
    const consent = screen.getByRole("checkbox", { name: /18 or older/i });
    expect(consent.compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(alert.compareDocumentPosition(submitButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("says how many builders the snapshot goes to", () => {
    renderPanel({ matches: { status: "ready", count: 2 } });
    expect(screen.getByText("Goes to 2 builders who serve this area.")).toBeInTheDocument();
  });

  it("submits validated contact and snapshot, then replaces the form so it cannot be sent twice", async () => {
    const submit = vi.fn().mockResolvedValue({ matchedCount: 1 });
    const close = vi.fn();
    renderPanel({ onSubmit: submit, onClose: close });

    await userEvent.click(screen.getByRole("checkbox", { name: /18 or older/i }));
    await userEvent.click(screen.getByRole("button", { name: /Submit snapshot/i }));

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent(/Sent to 1 local builder/i);
    expect(status).toHaveFocus();
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({
        contact: expect.objectContaining({ email: "jane@example.com" }),
        snapshot: expect.objectContaining({ parcelCity: "Seattle" }),
      }),
    );
    expect(screen.queryByRole("button", { name: /Submit snapshot/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Email" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("asks a guest to sign in instead of failing after they fill it in", async () => {
    const submit = vi.fn();
    const requestSignIn = vi.fn();
    renderPanel({ signedIn: false, matches: { status: "guest" }, onSubmit: submit, onRequestSignIn: requestSignIn });

    expect(screen.getByText("Sign in or create a free account to send it.")).toBeInTheDocument();
    const send = screen.getByRole("button", { name: "Sign in to send" });

    // Validation still comes first, so the form is ready to send after sign-in.
    await userEvent.click(send);
    expect(screen.getByRole("alert")).toHaveTextContent(/Consent is required/i);
    expect(requestSignIn).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("checkbox", { name: /18 or older/i }));
    await userEvent.click(send);
    expect(requestSignIn).toHaveBeenCalledTimes(1);
    expect(submit).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows that no builder serves the area instead of the form", async () => {
    const close = vi.fn();
    renderPanel({ matches: { status: "ready", count: 0 }, onClose: close });

    expect(screen.getByText("No builders are registered for this area yet.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Submit snapshot/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Name" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("keeps the form usable while the builder check is loading or failed", () => {
    const { rerender } = renderPanel({ matches: { status: "loading" } });
    expect(screen.getByText("Checking which builders serve this area…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Submit snapshot/i })).toBeEnabled();

    rerender(
      <BuilderLeadPanel
        open
        draft={janeDraft}
        onDraftChange={vi.fn()}
        parcelKey="oak-street"
        parcel={parcelPresets[0]}
        config={defaultAduConfig}
        assumptions={defaultFinancialAssumptions}
        result={result}
        signedIn
        matches={{ status: "error" }}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        onRequestSignIn={vi.fn()}
      />,
    );
    expect(screen.queryByText(/Checking which builders/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Submit snapshot/i })).toBeEnabled();
  });

  it("starts focus at the form's heading", () => {
    renderPanel();
    expect(screen.getByRole("heading", { name: "Connect with local builders" })).toHaveFocus();
  });

  it("titles the project summary for the homeowner and labels optional fields", () => {
    renderPanel();
    expect(screen.getByRole("region", { name: "Project details shared with builders" })).toBeInTheDocument();
    expect(screen.getByLabelText("Phone (optional)")).toBeInTheDocument();
    expect(screen.getByLabelText("Message (optional)")).toBeInTheDocument();
  });

  it("marks the field that needs fixing, explains it there and moves focus to it", async () => {
    renderPanel({ initialDraft: { ...janeDraft, name: "" } });
    await userEvent.click(screen.getByRole("checkbox", { name: /18 or older/i }));
    await userEvent.click(screen.getByRole("button", { name: /Submit snapshot/i }));

    const name = screen.getByRole("textbox", { name: "Name" });
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Name is required.");
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAttribute("aria-describedby", alert.id);
    expect(name).toHaveFocus();
    expect(screen.getByRole("textbox", { name: "Email" })).not.toHaveAttribute("aria-invalid");
  });

  it("asks for an area code on a short phone number", async () => {
    const submit = vi.fn();
    renderPanel({ onSubmit: submit });
    await userEvent.type(screen.getByRole("textbox", { name: "Phone (optional)" }), "555-0123");
    await userEvent.click(screen.getByRole("checkbox", { name: /18 or older/i }));
    await userEvent.click(screen.getByRole("button", { name: /Submit snapshot/i }));

    const phone = screen.getByRole("textbox", { name: "Phone (optional)" });
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a phone number with area code, or leave it blank.");
    expect(phone).toHaveAttribute("aria-invalid", "true");
    expect(phone).toHaveFocus();
    expect(submit).not.toHaveBeenCalled();
  });

  it("reports what the person types to the Studio, which keeps the draft", async () => {
    const onDraftChange = vi.fn();
    render(<BaselinePanel onDraftChange={onDraftChange} />);
    await userEvent.type(screen.getByRole("textbox", { name: "Message (optional)" }), "H");
    expect(onDraftChange).toHaveBeenLastCalledWith({ ...janeDraft, message: "H" });
  });

  it("does not keep consent in the draft", async () => {
    const onDraftChange = vi.fn();
    render(<BaselinePanel onDraftChange={onDraftChange} />);
    await userEvent.click(screen.getByRole("checkbox", { name: /18 or older/i }));
    expect(onDraftChange).not.toHaveBeenCalled();
  });
});
