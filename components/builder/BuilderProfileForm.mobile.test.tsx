import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BuilderProfileForm from "./BuilderProfileForm";

describe("BuilderProfileForm mobile accessibility", () => {
  it("saves separate city, county and statewide coverage without splitting a city-state pair", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<BuilderProfileForm defaults={{ companyName: "Field & Frame", contactEmail: "team@example.com" }} onSave={onSave} />);
    await userEvent.type(screen.getByLabelText("Service areas"), "Seattle");
    await userEvent.selectOptions(screen.getByLabelText("Service state"), "WA");
    await userEvent.click(screen.getByRole("button", { name: "Add service area" }));
    await userEvent.selectOptions(screen.getByLabelText("Coverage type"), "county");
    await userEvent.type(screen.getByLabelText("Service areas"), "Los Angeles County");
    await userEvent.selectOptions(screen.getByLabelText("Service state"), "CA");
    await userEvent.click(screen.getByRole("button", { name: "Add service area" }));
    await userEvent.selectOptions(screen.getByLabelText("Coverage type"), "state");
    await userEvent.selectOptions(screen.getByLabelText("Service state"), "NV");
    await userEvent.click(screen.getByRole("button", { name: "Save builder profile" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ serviceAreas: [
      { city: "Seattle", state: "WA", key: "seattle-wa" },
      { city: "", county: "Los Angeles", state: "CA", scope: "county", key: "county-los angeles-ca" },
      { city: "", state: "NV", scope: "state", key: "state-nv" },
    ] }));
  });

  it("focuses the state selector when statewide coverage has no selected state", async () => {
    render(<BuilderProfileForm defaults={{ companyName: "Example", contactEmail: "team@example.com" }} onSave={vi.fn()} />);
    await userEvent.selectOptions(screen.getByLabelText("Coverage type"), "state");
    await userEvent.click(screen.getByRole("button", { name: "Save builder profile" }));
    expect(screen.getByLabelText(/Service state/)).toHaveFocus();
    expect(screen.getByLabelText(/Service state/)).toHaveAccessibleDescription(/selected state/);
  });
  it("focuses and describes missing service coverage before saving", async () => {
    const onSave = vi.fn();
    render(<BuilderProfileForm defaults={{ companyName: "Field & Frame", contactEmail: "team@example.com" }} onSave={onSave} />);
    await userEvent.click(screen.getByRole("button", { name: "Save builder profile" }));
    const areas = screen.getByLabelText("Service areas");
    expect(areas).toHaveFocus();
    expect(areas).toHaveAttribute("aria-invalid", "true");
    expect(areas).toHaveAccessibleDescription(/selected state/);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("uses iOS-safe field text and a 44px submit target", () => {
    render(
      <BuilderProfileForm
        defaults={{ companyName: "Field & Frame", contactEmail: "team@example.com" }}
        onSave={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    for (const label of [
      /Company name/,
      /Contact email/,
      "Phone (optional)",
      "License number (optional)",
      "Service areas",
    ]) {
      expect(screen.getByLabelText(label)).toHaveClass("text-base", "sm:text-sm");
    }

    expect(screen.getByLabelText(/Contact email/)).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Phone (optional)")).toHaveAttribute("type", "tel");
    expect(screen.getByRole("button", { name: "Save builder profile" })).toHaveClass(
      "min-h-11",
    );
  });
});
