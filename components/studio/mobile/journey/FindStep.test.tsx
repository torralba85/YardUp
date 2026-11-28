import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
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

  it("offers only the San Diego example, not out-of-market demo lots", () => {
    render(<FindStep {...defaultProps} />);
    expect(screen.queryByRole("radiogroup", { name: "Demo lots" })).not.toBeInTheDocument();
    for (const city of ["Seattle", "Portland", "Austin"]) {
      expect(screen.queryByRole("button", { name: new RegExp(city) })).not.toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "See a San Diego example" })).toBeInTheDocument();
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
