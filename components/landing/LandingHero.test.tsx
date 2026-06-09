import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LandingHero } from "./LandingHero";

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

describe("LandingHero video hero", () => {
  let playSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    playSpy = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    setMatchMedia(false);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the address-first owner copy and CTA to /studio", () => {
    render(<LandingHero />);
    expect(screen.getByText(/from lot to income/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /estimate the adu income your lot could support/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/start with an address, tune the adu concept/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Address")).toBeInTheDocument();
    expect(screen.getByText("Fit")).toBeInTheDocument();
    expect(screen.getByText("Income")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /check my address/i })).toHaveAttribute("href", "/studio");
  });

  it("renders a stable, legible full-bleed video element", () => {
    const { container } = render(<LandingHero />);
    const video = container.querySelector("video");
    expect(video).not.toBeNull();
    expect(video).toHaveAttribute("poster", "/hero/hero-poster.jpg");
    expect(video).not.toHaveAttribute("loop");
    expect((video as HTMLVideoElement).muted).toBe(true);
    expect(video).toHaveAttribute("playsinline");
    // mp4 (H.264) only: the VP9 webm Remotion produced fails to decode in Chrome
    // (PIPELINE_ERROR_DECODE), and <source> fallback does not recover from a
    // mid-stream decode error — so we ship the universally-decodable H.264 mp4.
    const sources = container.querySelectorAll("source");
    expect(sources).toHaveLength(1);
    expect(sources[0]).toHaveAttribute("src", "/hero/hero.mp4");
    expect(sources[0]).toHaveAttribute("type", "video/mp4");
  });

  it("autoplays once when motion is allowed", () => {
    render(<LandingHero />);
    expect(playSpy).toHaveBeenCalledTimes(1);
  });

  it("does not autoplay under prefers-reduced-motion (poster remains)", () => {
    setMatchMedia(true);
    render(<LandingHero />);
    expect(playSpy).not.toHaveBeenCalled();
  });
});
