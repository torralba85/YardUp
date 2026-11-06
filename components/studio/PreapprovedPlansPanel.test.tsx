import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PreapprovedPlansPanel from "./PreapprovedPlansPanel";
import type { PreapprovedPlanReference } from "@/lib/preapproved-plans";

function Harness({ initial }: { initial?: PreapprovedPlanReference }) {
  const [selected, setSelected] = useState<PreapprovedPlanReference | null>(initial ?? null);
  return <PreapprovedPlansPanel parcel={{ city: "Sacramento", state: "CA" }} selected={selected} onSelect={setSelected} onRemove={() => setSelected(null)} />;
}

describe("pre-approved plan browser", () => {
  it("requires confirmation, selects/replaces/removes a reference and explains its independence", () => {
    render(<Harness />);
    const first = screen.getByRole("article", { name: "Shelf Ready Studio" });
    expect(within(first).getByRole("button", { name: "Select plan" })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /confirm Sacramento, CA/ }));
    fireEvent.click(within(first).getByRole("button", { name: "Select plan" }));
    expect(screen.getByRole("region", { name: "Selected plan reference" })).toHaveTextContent("Shelf Ready Studio");
    const next = screen.getByRole("article", { name: "Shelf Ready One-bedroom" });
    fireEvent.click(within(next).getByRole("button", { name: "Replace selected plan" }));
    expect(screen.getByRole("region", { name: "Selected plan reference" })).toHaveTextContent("Shelf Ready One-bedroom");
    expect(screen.getByText(/Selecting a plan does not change your 3D model/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Remove plan reference" }));
    expect(screen.queryByRole("region", { name: "Selected plan reference" })).not.toBeInTheDocument();
  });
  it("allows browsing another city without attaching that city's plan", () => {
    const onSelect = vi.fn();
    render(<PreapprovedPlansPanel parcel={{ city: "San Diego, CA 92117" }} selected={null} onSelect={onSelect} onRemove={() => {}} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /confirm San Diego, CA/ }));
    fireEvent.change(screen.getByRole("combobox", { name: "Browse plans for" }), { target: { value: "ca-sacramento" } });
    expect(screen.getAllByRole("button", { name: "Select plan" }).every(button => button.hasAttribute("disabled"))).toBe(true);
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByText(/Browse freely; select a plan only for your confirmed permitting authority/)).toBeVisible();
  });
  it("does not infer a county from a city and requires reconfirmation when authority changes", () => {
    render(<PreapprovedPlansPanel parcel={{ city: "San Diego, CA 92117" }} selected={null} onSelect={() => {}} onRemove={() => {}} />);
    expect(screen.getByRole("combobox", { name: "Permitting authority for this lot" })).toHaveValue("ca-san-diego");
    fireEvent.click(screen.getByRole("checkbox", { name: /confirm San Diego, CA/ }));
    fireEvent.change(screen.getByRole("combobox", { name: "Permitting authority for this lot" }), { target: { value: "ca-san-diego-county" } });
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });
  it("restores the selected county authority instead of confirming a conflicting postal city", () => {
    render(<PreapprovedPlansPanel parcel={{ city: "San Diego, CA 92117" }} selected={{ planId: "san-diego-county-plan-f", jurisdictionId: "ca-san-diego-county" }} onSelect={() => {}} onRemove={() => {}} />);
    expect(screen.getByRole("combobox", { name: "Permitting authority for this lot" })).toHaveValue("ca-san-diego-county");
    expect(screen.getByRole("checkbox")).toBeChecked();
  });
  it("removes a reference if its authority confirmation is withdrawn", () => {
    const onRemove = vi.fn();
    render(<PreapprovedPlansPanel parcel={{ city: "Sacramento", state: "CA" }} selected={{ planId: "sacramento-studio-367", jurisdictionId: "ca-sacramento" }} onSelect={() => {}} onRemove={onRemove} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("removes an attached plan when the homeowner changes the confirmed authority", () => {
    const onRemove = vi.fn();
    render(<PreapprovedPlansPanel parcel={{ city: "Sacramento", state: "CA" }} selected={{ planId: "sacramento-studio-367", jurisdictionId: "ca-sacramento" }} onSelect={() => {}} onRemove={onRemove} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Permitting authority for this lot" }), { target: { value: "ca-san-diego" } });
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("retains unknown/withdrawn references with an unavailable notice and no invented title or URL", () => {
    render(<Harness initial={{ planId: "retired-plan", jurisdictionId: "ca-sacramento" }} />);
    const summary = screen.getByRole("region", { name: "Selected plan reference" });
    expect(summary).toHaveTextContent("Plan unavailable");
    expect(summary).toHaveTextContent("retired-plan");
    expect(within(summary).queryByRole("link")).not.toBeInTheDocument();
  });
  it("shows unverified availability without claiming that no program exists", () => {
    render(<Harness />);
    fireEvent.change(screen.getByRole("combobox", { name: "Browse plans for" }), { target: { value: "wa-seattle" } });
    expect(screen.getByText("Availability needs verification")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Select plan" })).not.toBeInTheDocument();
  });
});
