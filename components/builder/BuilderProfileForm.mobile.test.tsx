import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BuilderProfileForm from "./BuilderProfileForm";

describe("BuilderProfileForm mobile accessibility", () => {
  it("focuses and describes missing service coverage before saving", async () => {
    const onSave = vi.fn();
    render(<BuilderProfileForm defaults={{ companyName: "Field & Frame", contactEmail: "team@example.com" }} onSave={onSave} />);
    await userEvent.click(screen.getByRole("button", { name: "Save builder profile" }));
    const areas = screen.getByLabelText("Service areas");
    expect(areas).toHaveFocus();
    expect(areas).toHaveAttribute("aria-invalid", "true");
    expect(areas).toHaveAccessibleDescription(/Seattle WA/);
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
