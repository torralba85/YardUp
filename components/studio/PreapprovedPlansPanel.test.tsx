import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PreapprovedPlansPanel, { PreapprovedPlansSection, type PlanModelLink } from "./PreapprovedPlansPanel";
import type { PreapprovedPlanReference } from "@/lib/preapproved-plans";

const fits = { title: "Fits at this placement", detail: "", tone: "clear" } as const;

function Harness({ initial, parcel = { city: "Sacramento", state: "CA" }, model }: {
  initial?: PreapprovedPlanReference;
  parcel?: { city: string; state?: string };
  model?: PlanModelLink;
}) {
  const [selected, setSelected] = useState<PreapprovedPlanReference | null>(initial ?? null);
  return <PreapprovedPlansSection parcel={parcel} selected={selected} onSelect={setSelected} onRemove={() => setSelected(null)} model={model} />;
}

const openCatalog = () => fireEvent.click(screen.getByText("Pre-approved plans", { exact: true }));

describe("pre-approved plan browser", () => {
  it("previews how many plans the lot's authority has before the catalog is opened", () => {
    render(<Harness parcel={{ city: "San Diego, CA 92117" }} />);
    expect(screen.getByText("6 plans for San Diego, CA")).toBeInTheDocument();
  });

  it("requires confirmation, then uses, replaces and removes a plan", () => {
    render(<Harness />);
    openCatalog();
    const first = screen.getByRole("article", { name: "Shelf Ready Studio" });
    expect(within(first).getByRole("button", { name: "Use this plan" })).toBeDisabled();
    expect(screen.getByText("Confirm the permitting authority above to use a plan.")).toBeVisible();
    fireEvent.click(screen.getByRole("checkbox", { name: /confirm Sacramento, CA/ }));
    fireEvent.click(within(first).getByRole("button", { name: "Use this plan" }));
    const summary = screen.getByRole("region", { name: "Selected plan reference" });
    expect(summary).toHaveTextContent("Shelf Ready Studio");
    expect(summary).toHaveTextContent("367 sq ft · Studio · Sacramento, CA");
    expect(within(summary).getByRole("heading", { name: "Shelf Ready Studio" })).toHaveFocus();
    expect(within(first).getByRole("button", { name: "In use" })).toBeDisabled();
    fireEvent.click(within(screen.getByRole("article", { name: "Shelf Ready One-bedroom" })).getByRole("button", { name: "Use this plan instead" }));
    expect(screen.getByRole("region", { name: "Selected plan reference" })).toHaveTextContent("Shelf Ready One-bedroom");
    fireEvent.click(screen.getByRole("button", { name: "Remove plan" }));
    expect(screen.queryByRole("region", { name: "Selected plan reference" })).not.toBeInTheDocument();
  });

  it("offers only the lot's own state and keeps county plans behind an explicit authority choice", () => {
    render(<PreapprovedPlansPanel parcel={{ city: "San Diego, CA 92117" }} selected={null} onSelect={() => {}} onRemove={() => {}} />);
    const authority = screen.getByRole("combobox", { name: "Permitting authority for this lot" });
    expect(authority).toHaveValue("ca-san-diego");
    const options = within(authority).getAllByRole("option").map(option => option.textContent);
    expect(options).toContain("Unincorporated San Diego County, CA");
    expect(options).not.toContain("Seattle, WA");
    fireEvent.click(screen.getByRole("checkbox", { name: /confirm San Diego, CA/ }));
    fireEvent.change(authority, { target: { value: "ca-san-diego-county" } });
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getAllByRole("button", { name: "Use this plan" }).every(button => button.hasAttribute("disabled"))).toBe(true);
  });

  it("lists every state when the lot's state is unknown", () => {
    render(<PreapprovedPlansPanel parcel={{ city: "Springfield" }} selected={null} onSelect={() => {}} onRemove={() => {}} />);
    const authority = screen.getByRole("combobox", { name: "Permitting authority for this lot" });
    expect(authority).toHaveValue("");
    expect(within(authority).getAllByRole("option").map(option => option.textContent)).toContain("Seattle, WA");
    expect(screen.getByText(/Don't see yours\?/)).toBeVisible();
  });

  it("restores the selected county authority instead of confirming a conflicting postal city", () => {
    render(<PreapprovedPlansPanel parcel={{ city: "San Diego, CA 92117" }} selected={{ planId: "san-diego-county-plan-f", jurisdictionId: "ca-san-diego-county" }} onSelect={() => {}} onRemove={() => {}} />);
    expect(screen.getByRole("combobox", { name: "Permitting authority for this lot" })).toHaveValue("ca-san-diego-county");
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("removes a plan, and says why, when its authority confirmation is withdrawn or changed", () => {
    const onRemove = vi.fn();
    const { unmount } = render(<PreapprovedPlansPanel parcel={{ city: "Sacramento", state: "CA" }} selected={{ planId: "sacramento-studio-367", jurisdictionId: "ca-sacramento" }} onSelect={() => {}} onRemove={onRemove} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onRemove).toHaveBeenCalledOnce();
    expect(screen.getByRole("status")).toHaveTextContent("Plan removed until the permitting authority is confirmed.");
    unmount();
    render(<PreapprovedPlansPanel parcel={{ city: "Sacramento", state: "CA" }} selected={{ planId: "sacramento-studio-367", jurisdictionId: "ca-sacramento" }} onSelect={() => {}} onRemove={onRemove} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Permitting authority for this lot" }), { target: { value: "ca-san-diego" } });
    expect(onRemove).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("status")).toHaveTextContent("Plan removed: it belongs to a different permitting authority.");
  });

  it("compares the model with the plan's real footprint and offers it, then reports the fit once used", () => {
    const onSizeToPlan = vi.fn();
    const model = { config: { width: 20, length: 20, footprint: 400 }, fit: fits, onSizeToPlan };
    const { rerender } = render(<Harness initial={{ planId: "sacramento-one-bedroom-559", jurisdictionId: "ca-sacramento" }} model={model} />);
    const summary = screen.getByRole("region", { name: "Selected plan reference" });
    expect(summary).toHaveTextContent("Your 3D model is 20 × 20 ft, 400 sq ft; this plan is 20′-0″ × 30′-0″.");
    fireEvent.click(within(summary).getByRole("button", { name: "Use the plan's footprint" }));
    expect(onSizeToPlan).toHaveBeenCalledOnce();
    const onUndoSize = vi.fn();
    const onViewModel = vi.fn();
    rerender(<Harness initial={{ planId: "sacramento-one-bedroom-559", jurisdictionId: "ca-sacramento" }}
      model={{ ...model, config: { width: 30, length: 20, footprint: 600 }, onUndoSize, onViewModel }} />);
    expect(summary).toHaveTextContent("3D model uses this plan's footprint: 20′-0″ × 30′-0″ (600 sq ft).");
    expect(summary).toHaveTextContent("Fits at this placement");
    fireEvent.click(within(summary).getByRole("button", { name: "View on your lot" }));
    fireEvent.click(within(summary).getByRole("button", { name: "Undo size change" }));
    expect(onViewModel).toHaveBeenCalledOnce();
    expect(onUndoSize).toHaveBeenCalledOnce();
  });

  it("checks a non-rectangular plan's full outer outline beside the area-matched model", () => {
    const blocked = { title: "Doesn't fit at this placement", detail: "", tone: "blocked" } as const;
    render(<Harness initial={{ planId: "san-diego-county-plan-b", jurisdictionId: "ca-san-diego-county" }} parcel={{ city: "San Diego, CA" }}
      model={{ config: { width: 26.5, length: 45, footprint: 1192.5 }, fit: fits, outlineFit: blocked, onSizeToPlan: () => {} }} />);
    const summary = screen.getByRole("region", { name: "Selected plan reference" });
    expect(summary).toHaveTextContent("3D model: 26.5 × 45 ft, 1,193 sq ft, this plan's floor area in its outer proportions.");
    expect(summary).toHaveTextContent("Full outer outline, 32′-0″ × 54′-0″:");
    expect(summary).toHaveTextContent("Doesn't fit at this placement");
    expect(summary).toHaveTextContent(/isn't rectangular/);
  });

  it("retains unknown/withdrawn references with an unavailable notice and no invented title, link or sizing", () => {
    render(<Harness initial={{ planId: "retired-plan", jurisdictionId: "ca-sacramento" }} model={{ config: { width: 20, length: 30, footprint: 600 }, fit: fits, onSizeToPlan: () => {} }} />);
    const summary = screen.getByRole("region", { name: "Selected plan reference" });
    expect(summary).toHaveTextContent("Plan unavailable");
    expect(summary).toHaveTextContent("retired-plan");
    expect(within(summary).queryByRole("link")).not.toBeInTheDocument();
    expect(within(summary).queryByRole("button", { name: /Size 3D model/ })).not.toBeInTheDocument();
  });

  it("shows unverified availability without claiming that no program exists", () => {
    render(<PreapprovedPlansPanel parcel={{ city: "Seattle, WA" }} selected={null} onSelect={() => {}} onRemove={() => {}} />);
    expect(screen.getByText("Availability needs verification")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Use this plan" })).not.toBeInTheDocument();
  });
});
