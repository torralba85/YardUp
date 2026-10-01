import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { useRadioGroup } from "./useRadioGroup";

function TestGroup({
  value,
  onChange,
  values = ["a", "b", "c"],
}: {
  value: string;
  onChange: (value: string) => void;
  values?: readonly string[];
}) {
  const { groupProps, getRadioProps } = useRadioGroup({ value, onChange, values });
  return (
    <div aria-label="Test group" {...groupProps}>
      {values.map((val) => (
        <button key={val} type="button" aria-label={val} {...getRadioProps(val)}>
          {val}
        </button>
      ))}
    </div>
  );
}

describe("useRadioGroup", () => {
  it("applies correct roles and aria-checked attributes", () => {
    const onChange = vi.fn();
    render(<TestGroup value="b" onChange={onChange} />);

    const group = screen.getByRole("radiogroup", { name: "Test group" });
    expect(group).toBeInTheDocument();

    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);

    expect(radios[0]).toHaveAttribute("aria-checked", "false");
    expect(radios[0]).toHaveAttribute("tabindex", "-1");

    expect(radios[1]).toHaveAttribute("aria-checked", "true");
    expect(radios[1]).toHaveAttribute("tabindex", "0");

    expect(radios[2]).toHaveAttribute("aria-checked", "false");
    expect(radios[2]).toHaveAttribute("tabindex", "-1");
  });

  it("handles roving tabindex when no value matches", () => {
    const onChange = vi.fn();
    render(<TestGroup value="x" onChange={onChange} />);

    const radios = screen.getAllByRole("radio");
    expect(radios[0]).toHaveAttribute("tabindex", "0");
    expect(radios[1]).toHaveAttribute("tabindex", "-1");
    expect(radios[2]).toHaveAttribute("tabindex", "-1");
  });

  it("navigates and selects with Arrow/Home/End keys with wrapping", async () => {
    const onChange = vi.fn();
    const { rerender } = render(<TestGroup value="b" onChange={onChange} />);

    const radios = screen.getAllByRole("radio");
    radios[1].focus();

    const user = userEvent.setup();

    // Arrow Right -> "c", and focus follows the selection.
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith("c");
    expect(document.activeElement).toBe(screen.getByRole("radio", { name: "c" }));
    rerender(<TestGroup value="c" onChange={onChange} />);

    // Arrow Right -> "a" (wrap)
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith("a");
    rerender(<TestGroup value="a" onChange={onChange} />);

    // Arrow Left -> "c" (wrap)
    await user.keyboard("{ArrowLeft}");
    expect(onChange).toHaveBeenLastCalledWith("c");
    rerender(<TestGroup value="c" onChange={onChange} />);

    // Arrow Up -> "b"
    await user.keyboard("{ArrowUp}");
    expect(onChange).toHaveBeenLastCalledWith("b");
    rerender(<TestGroup value="b" onChange={onChange} />);

    // Arrow Down -> "c"
    await user.keyboard("{ArrowDown}");
    expect(onChange).toHaveBeenLastCalledWith("c");
    rerender(<TestGroup value="c" onChange={onChange} />);

    // Home -> "a"
    await user.keyboard("{Home}");
    expect(onChange).toHaveBeenLastCalledWith("a");
    rerender(<TestGroup value="a" onChange={onChange} />);

    // End -> "c"
    await user.keyboard("{End}");
    expect(onChange).toHaveBeenLastCalledWith("c");
  });
});
