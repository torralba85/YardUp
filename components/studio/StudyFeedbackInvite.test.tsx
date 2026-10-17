import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StudyFeedbackInvite } from "./StudyFeedbackInvite";

afterEach(() => {
  cleanup();
  delete (window as unknown as { LotFoundryNative?: unknown }).LotFoundryNative;
  vi.restoreAllMocks();
});

describe("study feedback invitation", () => {
  it("offers feedback to everyone and lets them dismiss it", () => {
    render(<StudyFeedbackInvite />);
    expect(screen.getByRole("link", { name: /Send feedback/ })).toHaveAttribute("href", "/feedback");
    expect(screen.queryByRole("link", { name: "Review on Google Play" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });

  it("offers both feedback and a Play review on Android without asking for a rating", () => {
    Object.assign(window, { LotFoundryNative: { platform: "android" } });
    render(<StudyFeedbackInvite />);
    expect(screen.getByRole("link", { name: /Send feedback/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review on Google Play" })).toHaveAttribute("href", expect.stringContaining("id=com.lotfoundry.app"));
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });
});
