import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { demoPresets, parcelPresets } from "@/lib/feasibility";
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

    // San Diego leads the demos (the Studio default), so it holds the group's tab stop.
    const sanDiegoButton = screen.getByRole("radio", { name: demoPresets[0].city.split(",")[0] });
    expect(demoPresets[0].id).toBe("coyote-brush");
    expect(sanDiegoButton).toHaveAttribute("aria-checked", "false");
    expect(sanDiegoButton).toHaveAttribute("tabindex", "0");

    await user.click(sanDiegoButton);
    expect(onPresetSelect).toHaveBeenCalledWith("coyote-brush");
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

  it("shows 'See a San Diego example' when the input is empty, selects coyote-brush, and calls onReveal", async () => {
    const user = userEvent.setup();
    const onReveal = vi.fn();
    const onSubmitText = vi.fn();
    const onPresetSelect = vi.fn();
    render(
      <FindStep
        {...defaultProps}
        onPresetSelect={onPresetSelect}
        onReveal={onReveal}
        onSubmitText={onSubmitText}
      />,
    );

    expect(
      screen.getByText(
        /Enter an address to look up available parcel and zoning information/i,
      ),
    ).toBeInTheDocument();

    const cta = screen.getByRole("button", { name: "See a San Diego example" });
    await user.click(cta);
    expect(onPresetSelect).toHaveBeenCalledWith("coyote-brush");
    expect(onReveal).toHaveBeenCalledTimes(1);
    expect(onSubmitText).not.toHaveBeenCalled();
  });

  it("keeps a demo lot that arrived by link and names it on the CTA", async () => {
    const user = userEvent.setup();
    const onReveal = vi.fn();
    const onPresetSelect = vi.fn();
    render(
      <FindStep
        {...defaultProps}
        selectedPresetId="oak-street"
        presetChosen
        onPresetSelect={onPresetSelect}
        onReveal={onReveal}
      />,
    );

    await user.click(screen.getByRole("button", { name: "See the Seattle example" }));
    expect(onPresetSelect).not.toHaveBeenCalled();
    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  it("names a demo lot picked from the list instead of promising San Diego", async () => {
    const user = userEvent.setup();
    const onReveal = vi.fn();
    const onPresetSelect = vi.fn();
    const { rerender } = render(
      <FindStep {...defaultProps} selectedPresetId="oak-street" onPresetSelect={onPresetSelect} onReveal={onReveal} />,
    );
    await user.click(screen.getByRole("radio", { name: "Portland" }));
    rerender(
      <FindStep {...defaultProps} selectedPresetId={onPresetSelect.mock.calls[0][0]} onPresetSelect={onPresetSelect} onReveal={onReveal} />,
    );

    await user.click(screen.getByRole("button", { name: "See the Portland example" }));
    expect(onPresetSelect).toHaveBeenCalledTimes(1);
    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  it("changes CTA to 'Check my lot' when text is typed and submits the typed query", async () => {
    const user = userEvent.setup();
    const onReveal = vi.fn();
    const onSubmitText = vi.fn();
    render(<FindStep {...defaultProps} onReveal={onReveal} onSubmitText={onSubmitText} />);

    const input = screen.getByRole("searchbox", { name: /search property address/i });
    await user.type(input, "5124 35th St, San Diego, CA");

    const cta = screen.getByRole("button", { name: "Check my lot" });
    await user.click(cta);
    expect(onSubmitText).toHaveBeenCalledWith("5124 35th St, San Diego, CA");
    expect(onReveal).not.toHaveBeenCalled();
  });

  it("disables typed address submission while parcelLoading is true", async () => {
    const user = userEvent.setup();
    render(<FindStep {...defaultProps} parcelLoading />);

    const demoCta = screen.getByRole("button", { name: "See a San Diego example" });
    expect(demoCta).toBeEnabled();

    await user.type(
      screen.getByRole("searchbox", { name: /search property address/i }),
      "5124 35th St, San Diego, CA",
    );
    expect(screen.getByRole("button", { name: "Check my lot" })).toBeDisabled();
  });
});
