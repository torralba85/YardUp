import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import StudioWelcome from "./StudioWelcome";

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: null }),
}));

describe("StudioWelcome", () => {
  it("explains the app before opening sign-in and keeps the handoff on dismissal", async () => {
    const clicker = userEvent.setup();
    window.history.replaceState(null, "", "/studio?parcel=corner-lot&size=800");
    window.sessionStorage.setItem("lf:pending-address", "123 Example St");
    render(<StudioWelcome />);
    expect(screen.getByRole("heading", { name: "A little more room for life." })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "How LotFoundry works" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const start = screen.getByRole("button", { name: "Get started" });
    await clicker.click(start);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await clicker.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(start).toHaveFocus();
    expect(window.location.search).toBe("?parcel=corner-lot&size=800");
    expect(window.sessionStorage.getItem("lf:pending-address")).toBe("123 Example St");
    window.sessionStorage.clear();
    window.history.replaceState(null, "", "/studio");
  });
});
