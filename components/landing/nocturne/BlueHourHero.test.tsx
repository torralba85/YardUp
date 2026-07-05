import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, forwardRef, useImperativeHandle } from "react";
import { DAWN_RAMP_MS } from "./DawnStudioLink";
import { BlueHourHero } from "./BlueHourHero";

const { pushMock, stashMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  stashMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/lib/address-handoff", () => ({
  stashAddressQuery: stashMock,
}));

// The real Player needs a browser rendering pipeline; the hero's contract with
// it (mount + seekTo on scroll) is what matters here, not Remotion internals.
const { seekToMock } = vi.hoisted(() => ({ seekToMock: vi.fn() }));
vi.mock("@remotion/player", () => ({
  Player: forwardRef(function MockPlayer(_props, ref) {
    useImperativeHandle(ref, () => ({ seekTo: seekToMock }));
    return <div data-testid="mock-player" />;
  }),
}));

function setMatchMedia(reduce: boolean) {
  window.matchMedia = (query: string) =>
    ({
      matches: reduce && /prefers-reduced-motion/.test(query),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => true),
    }) as unknown as MediaQueryList;
}

describe("BlueHourHero", () => {
  beforeEach(() => {
    setMatchMedia(false);
    pushMock.mockClear();
    stashMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the second-address headline, address instrument, and estimate-honest copy", () => {
    render(<BlueHourHero />);
    expect(screen.getByText(/lotfoundry · adu feasibility studio/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /every backyard hides a second address/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/property address/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /run feasibility/i })).toBeInTheDocument();
    expect(screen.getByText(/local review is still required/i)).toBeInTheDocument();
  });

  it("mounts the scroll-scrubbed player when motion is allowed", () => {
    render(<BlueHourHero />);
    expect(screen.getByTestId("blue-hour-player")).toBeInTheDocument();
  });

  it("keeps the still photograph and full verdict under reduced motion", () => {
    setMatchMedia(true);
    render(<BlueHourHero />);
    expect(screen.queryByTestId("blue-hour-player")).not.toBeInTheDocument();
    const verdict = screen.getByRole("complementary", { name: /projected rent verdict/i });
    expect(verdict).toHaveTextContent("$2,340");
    expect(verdict).toHaveTextContent(/estimate only/i);
  });

  it("frames the verdict as a typical supported-market estimate", () => {
    render(<BlueHourHero />);
    const verdict = screen.getByRole("complementary", { name: /projected rent verdict/i });
    expect(verdict).toHaveTextContent(/typical supported markets/i);
  });

  it("asks for an address instead of routing to the demo studio on empty submit", () => {
    render(<BlueHourHero />);
    const input = screen.getByLabelText(/property address/i);
    fireEvent.click(screen.getByRole("button", { name: /run feasibility/i }));
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(/enter an address before running feasibility/i)).toBeInTheDocument();
    expect(stashMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("routes the typed address to the studio via session stash, never the URL", () => {
    vi.useFakeTimers();
    render(<BlueHourHero />);
    fireEvent.change(screen.getByLabelText(/property address/i), {
      target: { value: " 456 Pine St, Denver, CO " },
    });
    fireEvent.click(screen.getByRole("button", { name: /run feasibility/i }));
    expect(stashMock).toHaveBeenCalledWith("456 Pine St, Denver, CO");
    expect(screen.getByRole("status")).toHaveTextContent(/opening studio/i);
    expect(pushMock).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(DAWN_RAMP_MS);
    });
    expect(pushMock).toHaveBeenCalledWith("/studio");
  });
});
