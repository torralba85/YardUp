import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { parcelPresets } from "@/lib/feasibility";
import FindStep from "./FindStep";

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@googlemaps/js-api-loader", () => ({
  setOptions: vi.fn(),
  importLibrary: vi.fn(),
}));

describe("FindStep", () => {
  const defaultProps = {
    onSelect: vi.fn(),
    onSubmitText: vi.fn(),
    parcelLoading: false,
    parcelError: null,
    selectedPresetId: null,
    onPresetSelect: vi.fn(),
    onReveal: vi.fn(),
  };

  it("renders demo lots within a group and allows clicking to select", async () => {
    const user = userEvent.setup();
    const onPresetSelect = vi.fn();
    render(<FindStep {...defaultProps} onPresetSelect={onPresetSelect} />);

    const group = screen.getByRole("radiogroup", { name: "Demo lots" });
    expect(group).toBeInTheDocument();

    const seattleButton = screen.getByRole("radio", { name: parcelPresets[0].city.split(",")[0] });
    expect(seattleButton).toHaveAttribute("aria-checked", "false");
    expect(seattleButton).toHaveAttribute("tabindex", "0");

    await user.click(seattleButton);
    expect(onPresetSelect).toHaveBeenCalledWith(parcelPresets[0].id);
  });

  it("supports roving tabindex and arrow-key navigation across demo lots", async () => {
    const user = userEvent.setup();
    const onPresetSelect = vi.fn();
    const { rerender } = render(
      <FindStep
        {...defaultProps}
        selectedPresetId={parcelPresets[0].id}
        onPresetSelect={onPresetSelect}
      />,
    );

    const firstButton = screen.getByRole("radio", { name: parcelPresets[0].city.split(",")[0] });
    const secondButton = screen.getByRole("radio", { name: parcelPresets[1].city.split(",")[0] });

    expect(firstButton).toHaveAttribute("aria-checked", "true");
    expect(firstButton).toHaveAttribute("tabindex", "0");
    expect(secondButton).toHaveAttribute("aria-checked", "false");
    expect(secondButton).toHaveAttribute("tabindex", "-1");

    firstButton.focus();
    expect(firstButton).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(onPresetSelect).toHaveBeenCalledWith(parcelPresets[1].id);

    // Simulate state update
    rerender(
      <FindStep
        {...defaultProps}
        selectedPresetId={parcelPresets[1].id}
        onPresetSelect={onPresetSelect}
      />,
    );
    expect(secondButton).toHaveAttribute("aria-checked", "true");
    expect(secondButton).toHaveAttribute("tabindex", "0");
    expect(firstButton).toHaveAttribute("tabindex", "-1");
  });
});
