import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { forwardRef, useImperativeHandle } from "react";
import { DAWN_RAMP_MS } from "./DawnStudioLink";
import { BlueHourHero } from "./BlueHourHero";

const { pushMock, stashMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  stashMock: vi.fn(),
}));

const authMock = vi.hoisted(() => ({
  user: { uid: "user-1" } as { uid: string } | null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/lib/address-handoff", () => ({
  stashAddressQuery: stashMock,
}));

// The hero no longer touches auth during render; the lazily-mounted
// LandingAuthGate does. These mocks now stand in for the gate's dependencies.
vi.mock("@/lib/auth-context", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({ user: authMock.user, loading: false }),
}));

vi.mock("@/components/auth/AuthModal", () => ({
  AuthModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div role="dialog" aria-label="Sign in to continue" /> : null,
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
    authMock.user = { uid: "user-1" };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the earn headline, address instrument, and estimate-honest copy", () => {
    render(<BlueHourHero />);
    expect(screen.getByText(/lotfoundry · adu planning tool/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /see what your backyard can earn/i }),
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

  it("frames the verdict as a sample market estimate", () => {
    render(<BlueHourHero />);
    const verdict = screen.getByRole("complementary", { name: /projected rent verdict/i });
    expect(verdict).toHaveTextContent(/sample for cities we cover/i);
  });

  it("renders a keyboard-usable survey phase rail with the opening beat active", () => {
    render(<BlueHourHero />);
    const rail = screen.getByRole("navigation", { name: /survey phases/i });
    expect(rail).toBeInTheDocument();
    const open = screen.getByRole("button", { name: /open lot map/i });
    expect(open).toHaveAttribute("aria-current", "step");
    const propertyLines = screen.getByRole("button", {
      name: /01\s*jump to step 02 · property lines/i,
    });
    expect(propertyLines).not.toHaveAttribute("aria-current");
    expect(propertyLines).toHaveAccessibleName(
      /01\s*jump to step 02 · property lines/i,
    );
    expect(
      screen.getByRole("button", { name: /jump to step 05 · rent estimate/i }),
    ).toBeInTheDocument();
  });

  it("keeps pointer-only survey geometry out of the accessibility tree", async () => {
    render(<BlueHourHero />);
    const surveyHotspots = screen.getByTestId("survey-hotspots");
    expect(surveyHotspots).toHaveAttribute("aria-hidden", "true");
    expect(
      screen.queryByRole("button", { name: /highlight property lines/i }),
    ).not.toBeInTheDocument();

    const hotspots = surveyHotspots.querySelectorAll("polygon");
    expect(hotspots).toHaveLength(3);

    // The composition is behind a `next/dynamic` boundary, so the first read
    // has to wait for that chunk to resolve; later reads are synchronous.
    fireEvent.mouseEnter(hotspots[0]);
    expect(await screen.findByTestId("mock-player")).toHaveAttribute(
      "data-highlight",
      "parcel",
    );

    fireEvent.mouseLeave(hotspots[0]);
    expect(screen.getByTestId("mock-player")).toHaveAttribute("data-highlight", "");

    fireEvent.mouseEnter(hotspots[2]);
    expect(screen.getByTestId("mock-player")).toHaveAttribute("data-highlight", "adu");
    fireEvent.mouseLeave(hotspots[2]);
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
    expect(screen.queryByTestId("survey-hotspots")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: /survey phases/i }),
    ).not.toBeInTheDocument();
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

  it("routes the typed address to the studio via session stash, never the URL", async () => {
    render(<BlueHourHero />);
    fireEvent.change(screen.getByLabelText(/property address/i), {
      target: { value: " 456 Pine St, Denver, CO " },
    });
    fireEvent.click(screen.getByRole("button", { name: /run feasibility/i }));

    // Submitting mounts the gate behind `next/dynamic`; a signed-in visitor is
    // handed straight through once it resolves, without seeing the modal.
    await waitFor(() =>
      expect(stashMock).toHaveBeenCalledWith("456 Pine St, Denver, CO"),
    );
    expect(
      screen.queryByRole("dialog", { name: /sign in to continue/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/opening studio/i);
    expect(pushMock).not.toHaveBeenCalled();

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/studio"), {
      timeout: DAWN_RAMP_MS + 500,
    });
  });

  it("asks a guest to sign in before handing an address to the studio", async () => {
    authMock.user = null;
    render(<BlueHourHero />);
    fireEvent.change(screen.getByLabelText(/property address/i), {
      target: { value: "456 Pine St, Denver, CO" },
    });
    fireEvent.click(screen.getByRole("button", { name: /run feasibility/i }));

    expect(
      await screen.findByRole("dialog", { name: /sign in to continue/i }),
    ).toBeInTheDocument();
    expect(stashMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
