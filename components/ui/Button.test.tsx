import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "./Button";
import { HAPTIC_PATTERNS } from "@/lib/haptics";

function stubVibrate() {
  const vibrate = vi.fn(() => true);
  Object.defineProperty(navigator, "vibrate", {
    configurable: true,
    writable: true,
    value: vibrate,
  });
  return vibrate;
}

function restoreVibrate() {
  Object.defineProperty(navigator, "vibrate", {
    configurable: true,
    writable: true,
    value: undefined,
  });
}

describe("Button", () => {
  it("renders a button that defaults to type=button", () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAttribute("type", "button");
  });

  it("honors an explicit type", () => {
    render(<Button type="submit">Go</Button>);
    expect(screen.getByRole("button", { name: "Go" })).toHaveAttribute("type", "submit");
  });

  it("uses the 3px control radius and the spec's 48px default metrics", () => {
    // A LOT MORE retired the pill-radius system; every control is 3px
    // (docs/design/design-system.md 4.4). The default size is the §6 button:
    // min-height 48px, padding 12px 19px, 14px/700.
    render(<Button>Continue</Button>);
    const button = screen.getByRole("button", { name: "Continue" });
    expect(button).toHaveClass("rounded-control", "min-h-12", "px-[19px]", "py-3", "text-sm", "font-bold");
    expect(button).not.toHaveClass("rounded-full", "h-11");
  });

  it("never lets a compact size drop below the 44px touch target", () => {
    for (const size of ["xs", "sm"] as const) {
      const { unmount } = render(<Button size={size}>Compact</Button>);
      expect(screen.getByRole("button", { name: "Compact" })).toHaveClass("min-h-11");
      unmount();
    }
  });

  it("applies the commit (carbon) variant for money actions", () => {
    // Money commits are carbon, not green: money-green is retired and green now
    // means eligible/verified status only (docs/design/design-system.md 2.6).
    render(<Button variant="commit">Generate certificate</Button>);
    const button = screen.getByRole("button", { name: "Generate certificate" });
    expect(button).toHaveClass("bg-lot-ink", "text-lot-chalk");
    expect(button).not.toHaveClass("bg-status-eligible");
  });

  it("applies the primary (clay) variant by default", () => {
    render(<Button>Primary</Button>);
    expect(screen.getByRole("button", { name: "Primary" })).toHaveClass("bg-lot-orange");
  });

  it("applies the selected variant for the current choice", () => {
    render(
      <Button variant="selected" role="tab" aria-selected="true">
        Selected
      </Button>,
    );
    const selected = screen.getByRole("tab", { name: "Selected" });
    expect(selected).toHaveAttribute("aria-selected", "true");
    expect(selected).toHaveClass(
      "border-lot-ink",
      "bg-lot-ink",
      "text-lot-chalk",
    );
  });

  it("applies the destructive variant for irreversible actions", () => {
    render(<Button variant="destructive">Delete permanently</Button>);
    expect(screen.getByRole("button", { name: "Delete permanently" })).toHaveClass(
      "bg-status-blocked",
      "hover:bg-status-blocked-hover",
      "focus-visible:ring-status-blocked",
    );
  });

  it("uses accessible clay ink for ghost actions and focus", () => {
    render(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole("button", { name: "Ghost" })).toHaveClass(
      "text-lot-ink",
      "hover:bg-lot-surface",
      "focus-visible:ring-lot-orange-ink",
    );
  });

  it("marks itself busy and disabled while loading", () => {
    render(<Button loading>Working</Button>);
    const button = screen.getByRole("button", { name: "Working" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
  });

  it("does not fire onClick while loading", () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Working
      </Button>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Working" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("fires onClick when enabled", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Click" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("stretches full width when requested", () => {
    render(<Button fullWidth>Wide</Button>);
    expect(screen.getByRole("button", { name: "Wide" })).toHaveClass("w-full");
  });

  it("lets compact recorded-fact controls replace the size step's default text metrics", () => {
    render(
      <Button
        size="md"
        className="lf-kicker-dense text-[10px] leading-[14px]"
      >
        Compact
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Compact" });
    expect(button).toHaveClass("lf-kicker-dense", "text-[10px]", "leading-[14px]");
    expect(button).not.toHaveClass("text-sm");
  });

  it("forwards a ref to the underlying button", () => {
    const ref = { current: null as HTMLButtonElement | null };
    render(<Button ref={ref}>Ref</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  describe("haptics", () => {
    afterEach(() => {
      restoreVibrate();
    });

    it("fires the commit pattern for the commit variant", () => {
      const vibrate = stubVibrate();
      const onClick = vi.fn();
      render(
        <Button variant="commit" onClick={onClick}>
          Commit
        </Button>,
      );
      fireEvent.click(screen.getByRole("button", { name: "Commit" }));
      expect(vibrate).toHaveBeenCalledWith(HAPTIC_PATTERNS.commit);
    });

    it("fires the tap pattern for the primary variant", () => {
      const vibrate = stubVibrate();
      const onClick = vi.fn();
      render(
        <Button variant="primary" onClick={onClick}>
          Primary
        </Button>,
      );
      fireEvent.click(screen.getByRole("button", { name: "Primary" }));
      expect(vibrate).toHaveBeenCalledWith(HAPTIC_PATTERNS.tap);
    });

    it("stays silent for the secondary variant", () => {
      const vibrate = stubVibrate();
      const onClick = vi.fn();
      render(
        <Button variant="secondary" onClick={onClick}>
          Secondary
        </Button>,
      );
      fireEvent.click(screen.getByRole("button", { name: "Secondary" }));
      expect(vibrate).not.toHaveBeenCalled();
    });

    it("stays silent for the ghost variant", () => {
      const vibrate = stubVibrate();
      const onClick = vi.fn();
      render(
        <Button variant="ghost" onClick={onClick}>
          Ghost
        </Button>,
      );
      fireEvent.click(screen.getByRole("button", { name: "Ghost" }));
      expect(vibrate).not.toHaveBeenCalled();
    });

    it("stays silent for the selected variant because it describes pre-click state", () => {
      const vibrate = stubVibrate();
      const onClick = vi.fn();
      render(
        <Button variant="selected" onClick={onClick}>
          Selected
        </Button>,
      );
      fireEvent.click(screen.getByRole("button", { name: "Selected" }));
      expect(vibrate).not.toHaveBeenCalled();
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("stays silent for the destructive variant", () => {
      const vibrate = stubVibrate();
      const onClick = vi.fn();
      render(
        <Button variant="destructive" onClick={onClick}>
          Quiet
        </Button>,
      );
      fireEvent.click(screen.getByRole("button", { name: "Quiet" }));
      expect(vibrate).not.toHaveBeenCalled();
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("still passes the original click event through to the caller's onClick", () => {
      stubVibrate();
      const onClick = vi.fn();
      render(
        <Button variant="commit" onClick={onClick}>
          Commit
        </Button>,
      );
      fireEvent.click(screen.getByRole("button", { name: "Commit" }));
      expect(onClick).toHaveBeenCalledTimes(1);
      const receivedEvent = onClick.mock.calls[0][0];
      expect(receivedEvent).toBeDefined();
      expect(receivedEvent.type).toBe("click");
    });
  });
});
