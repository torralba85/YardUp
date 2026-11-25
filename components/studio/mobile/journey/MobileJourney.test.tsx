import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MobileJourney from "./MobileJourney";
import { deriveJourneySteps } from "@/lib/mobile-journey";

describe("MobileJourney", () => {
  it("starts each new reveal at the top and announces its focused region", () => {
    const props = { header: <header>LotFoundry</header>, onStepSelect: vi.fn() };
    const { rerender } = render(
      <MobileJourney {...props} steps={deriveJourneySteps("shape", { found: true })}>
        <button>Check feasibility</button>
      </MobileJourney>,
    );
    const main = screen.getByRole("main");
    main.scrollTop = 300;
    screen.getByRole("button", { name: "Check feasibility" }).focus();
    rerender(
      <MobileJourney {...props} steps={deriveJourneySteps("check", { found: true })}>
        <h1>Needs review</h1>
      </MobileJourney>,
    );
    expect(main.scrollTop).toBe(0);
    expect(main).toHaveFocus();
    expect(main).toHaveAccessibleName("Rules & fit step");
    main.scrollTop = 100;
    rerender(
      <MobileJourney {...props} steps={deriveJourneySteps("check", { found: true })}>
        <h1>Updated estimate</h1>
      </MobileJourney>,
    );
    expect(main.scrollTop).toBe(100);
  });

  it("provides the focusable skip-link destination for the full-screen journey", () => {
    render(
      <MobileJourney
        header={<header>LotFoundry</header>}
        steps={[]}
        onStepSelect={vi.fn()}
      >
        <p>Step content</p>
      </MobileJourney>,
    );

    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getByRole("main")).toHaveAttribute("tabindex", "-1");
  });
});
