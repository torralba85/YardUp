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

  it("is a pill and keeps a 44px comfortable target at the default size", () => {
    render(<Button>Continue</Button>);
    const button = screen.getByRole("button", { name: "Continue" });
    expect(button).toHaveClass("rounded-full", "h-11");
  });

  it("applies the commit (forest) variant for money actions", () => {
    render(<Button variant="commit">Generate certificate</Button>);
    expect(screen.getByRole("button", { name: "Generate certificate" })).toHaveClass(
      "bg-lf-forest",
      "hover:bg-lf-forest-strong",
    );
  });

  it("applies the primary (clay) variant by default", () => {
    render(<Button>Primary</Button>);
    expect(screen.getByRole("button", { name: "Primary" })).toHaveClass("bg-lf-clay");
  });

  it("uses accessible clay ink for ghost actions and focus", () => {
    render(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole("button", { name: "Ghost" })).toHaveClass(
      "text-lf-clay-ink",
      "hover:bg-lf-clay-soft",
      "focus-visible:ring-lf-clay-ink",
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
