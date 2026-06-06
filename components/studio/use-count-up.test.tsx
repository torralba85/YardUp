import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useCountUp } from "./use-count-up";

function Probe({ value }: { value: number }) {
  const display = useCountUp(value);
  return <span data-testid="out">{Math.round(display)}</span>;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  // @ts-expect-error allow clearing the stub between tests
  delete window.matchMedia;
});

describe("useCountUp", () => {
  it("renders the final value immediately when matchMedia is unavailable (jsdom default)", () => {
    render(<Probe value={1234} />);
    expect(screen.getByTestId("out")).toHaveTextContent("1234");
  });

  it("snaps to the final value when the user prefers reduced motion", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    const { rerender } = render(<Probe value={100} />);
    rerender(<Probe value={900} />);
    expect(screen.getByTestId("out")).toHaveTextContent("900");
  });

  it("settles on the final value when motion is allowed", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
    let now = 0;
    vi.stubGlobal("performance", { now: () => now });
    const cbs: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cbs.push(cb);
      return cbs.length;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});

    const { rerender } = render(<Probe value={0} />);
    rerender(<Probe value={1000} />);

    // Drain frames past the 350ms duration.
    act(() => {
      for (let i = 0; i < 50 && cbs.length > 0; i++) {
        now += 20;
        const cb = cbs.shift()!;
        cb(now);
      }
    });

    expect(screen.getByTestId("out")).toHaveTextContent("1000");
  });
});
