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

  it("renders the approved R1 copy and CTA to /signup", () => {
    render(<LandingHero />);
    expect(screen.getByText(/from lot to income/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /see the rent your backyard is hiding/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /estimate my lot/i })).toHaveAttribute("href", "/signup");
  });

  it("renders a stable, legible full-bleed video element", () => {
    const { container } = render(<LandingHero />);
    const video = container.querySelector("video");
    expect(video).not.toBeNull();
    expect(video).toHaveAttribute("poster", "/hero/hero-poster.jpg");
    expect(video).not.toHaveAttribute("loop");
    expect((video as HTMLVideoElement).muted).toBe(true);
    expect(video).toHaveAttribute("playsinline");
    const sources = container.querySelectorAll("source");
    expect(sources[0]).toHaveAttribute("src", "/hero/hero.webm");
    expect(sources[1]).toHaveAttribute("src", "/hero/hero.mp4");
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
