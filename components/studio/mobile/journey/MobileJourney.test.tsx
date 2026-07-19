import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MobileJourney from "./MobileJourney";

describe("MobileJourney", () => {
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
