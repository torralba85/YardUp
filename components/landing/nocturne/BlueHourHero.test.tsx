import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { forwardRef, useImperativeHandle } from "react";
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
// it (mount + seekTo on scroll + low-frequency inputProps) is what matters
// here, not Remotion internals.
const { seekToMock } = vi.hoisted(() => ({ seekToMock: vi.fn() }));
vi.mock("@remotion/player", () => ({
  Player: forwardRef(function MockPlayer(
    props: { inputProps?: { highlight?: string | null } },
    ref,
  ) {
    useImperativeHandle(ref, () => ({ seekTo: seekToMock }));
    return (
      <div
        data-testid="mock-player"
        data-highlight={props.inputProps?.highlight ?? ""}
      />
    );
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

  it("renders a keyboard-usable survey phase rail with the opening beat active", () => {
    render(<BlueHourHero />);
    const rail = screen.getByRole("navigation", { name: /survey phases/i });
    expect(rail).toBeInTheDocument();
    const open = screen.getByRole("button", { name: /lot record opens/i });
    expect(open).toHaveAttribute("aria-current", "step");
    expect(
      screen.getByRole("button", { name: /jump to phase 01 · parcel boundary/i }),
    ).not.toHaveAttribute("aria-current");
    expect(
      screen.getByRole("button", { name: /jump to phase 04 · verdict/i }),
    ).toBeInTheDocument();
  });

  it("passes hovered or focused survey geometry to the composition as highlight", () => {
    render(<BlueHourHero />);
    const hotspot = screen.getByRole("button", { name: /highlight parcel boundary/i });

    fireEvent.focus(hotspot);
    expect(screen.getByTestId("mock-player")).toHaveAttribute("data-highlight", "parcel");

    fireEvent.blur(hotspot);
    expect(screen.getByTestId("mock-player")).toHaveAttribute("data-highlight", "");

    const adu = screen.getByRole("button", { name: /highlight adu cast/i });
    fireEvent.mouseEnter(adu);
    expect(screen.getByTestId("mock-player")).toHaveAttribute("data-highlight", "adu");
    fireEvent.mouseLeave(adu);
    expect(screen.getByTestId("mock-player")).toHaveAttribute("data-highlight", "");
  });

  it("does not pulse the address instrument before the verdict lands", () => {
    render(<BlueHourHero />);
    const form = screen
      .getByRole("button", { name: /run feasibility/i })
      .closest("form")!;
    expect(form.className).not.toMatch(/ln-cta-pulse/);
  });

  it("keeps hotspots and the rail out of the reduced-motion experience", () => {
    setMatchMedia(true);
    render(<BlueHourHero />);
    expect(
      screen.queryByRole("button", { name: /highlight parcel boundary/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: /survey phases/i }),
    ).not.toBeInTheDocument();
  });

  it("routes the typed address to the studio via session stash, never the URL", () => {
    render(<BlueHourHero />);
    fireEvent.change(screen.getByLabelText(/property address/i), {
      target: { value: "456 Pine St, Denver, CO" },
    });
    fireEvent.click(screen.getByRole("button", { name: /run feasibility/i }));
    expect(stashMock).toHaveBeenCalledWith("456 Pine St, Denver, CO");
    expect(pushMock).toHaveBeenCalledWith("/studio");
  });
});
