import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LandingHero } from "./LandingHero";
import { getSceneViewportProfile, HERO_SCENE_PALETTE } from "./BlueprintScene";

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

describe("LandingHero deconstruction hero", () => {
  beforeEach(() => {
    setMatchMedia(false);
    pushMock.mockClear();
    stashMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the supplied cast headline, address instrument, and estimate-honest copy", () => {
    render(<LandingHero />);
    expect(screen.getByText(/lotfoundry \/ feasibility studio/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /your backyard, cast into an asset/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/property address/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /run feasibility/i })).toBeInTheDocument();
    expect(screen.getByText(/local review is still required/i)).toBeInTheDocument();
  });

  it("renders the five-step feasibility stack", () => {
    render(<LandingHero />);
    expect(screen.getByRole("complementary", { name: /feasibility stack/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /jump to zoning envelope/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /jump to foundation/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /jump to structure/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /jump to shell & glazing/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /jump to finished value/i })).toBeInTheDocument();
  });

  it("leads the first viewport with a typical earning-potential figure", () => {
    render(<LandingHero />);
    const rail = screen.getByRole("complementary", {
      name: /typical earning potential/i,
    });
    expect(within(rail).getByText(/\$2,100/)).toBeInTheDocument();
    expect(within(rail).getByText(/\$2,600/)).toBeInTheDocument();
    expect(within(rail).getByText(/\/mo/)).toBeInTheDocument();
  });

  it("frames the landing figure as a typical estimate, not a parcel-specific guarantee", () => {
    render(<LandingHero />);
    const rail = screen.getByRole("complementary", {
      name: /typical earning potential/i,
    });
    expect(within(rail).getByText(/supported markets/i)).toBeInTheDocument();
  });

  it("invites the owner to run their own address for a personalized number", () => {
    render(<LandingHero />);
    expect(
      screen.getByRole("button", { name: /run your address for your number/i }),
    ).toBeInTheDocument();
  });

  it("hands the typed address to the studio without exposing it in the URL", () => {
    render(<LandingHero />);
    fireEvent.change(screen.getByLabelText(/property address/i), {
      target: { value: "456 Pine St, Denver, CO" },
    });
    fireEvent.submit(screen.getByRole("button", { name: /run feasibility/i }).closest("form")!);
    expect(stashMock).toHaveBeenCalledWith("456 Pine St, Denver, CO");
    expect(pushMock).toHaveBeenCalledWith("/studio");
    expect(pushMock).not.toHaveBeenCalledWith(expect.stringContaining("?"));
  });

  it("routes to the studio and clears any stale address when the field is empty", () => {
    render(<LandingHero />);
    fireEvent.submit(screen.getByRole("button", { name: /run feasibility/i }).closest("form")!);
    expect(stashMock).toHaveBeenCalledWith("");
    expect(pushMock).toHaveBeenCalledWith("/studio");
  });

  it("renders a stable scene fallback in non-webgl environments", () => {
    const { container } = render(<LandingHero />);
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.querySelector('[data-scene-palette="daylight"]')).not.toBeNull();
    expect(container.querySelector('[data-renderer-state="fallback"]')).not.toBeNull();
  });

  it("locks the 3D scene to LotFoundry's daylight palette", () => {
    expect(HERO_SCENE_PALETTE).toEqual({
      mode: "daylight",
      fog: 0xeadfce,
      skyLight: 0xeaf4f6,
      groundLight: 0xbfa58e,
      groundStops: ["#9aa27b", "#7f8c69", "#eadfce"],
    });
  });

  it("uses a lighter, wider camera profile on mobile", () => {
    const mobile = getSceneViewportProfile(390);
    const desktop = getSceneViewportProfile(1440);

    expect(mobile).toMatchObject({
      mobile: true,
      antialias: false,
      maxPixelRatio: 1.25,
      shadows: false,
      cameraRadius: [12.2, 17.8],
    });
    expect(desktop).toMatchObject({
      mobile: false,
      antialias: true,
      maxPixelRatio: 1.75,
      shadows: true,
      cameraRadius: [8.8, 13.5],
    });
  });

  it("renders without the previous video element", () => {
    const { container } = render(<LandingHero />);
    expect(container.querySelector("video")).toBeNull();
  });
});
