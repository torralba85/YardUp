import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AccountMenu } from "./AccountMenu";

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    deleteAccount: vi.fn(),
  }),
}));

describe("AccountMenu", () => {
  it("shows every launch-required account action", async () => {
    const user = userEvent.setup();
    render(
      <AccountMenu
        displayName="Alma Reyes"
        roleLabel="Lot Owner"
        onSignOut={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /account menu/i }));

    expect(screen.getByRole("menuitem", { name: /^home$/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("menuitem", { name: /settings/i })).toHaveAttribute(
      "href",
      "/settings",
    );
    expect(screen.getByRole("menuitem", { name: /get help/i })).toHaveAttribute(
      "href",
      "/help",
    );
    expect(screen.getByRole("menuitem", { name: /send feedback/i })).toHaveAttribute(
      "href",
      "/feedback",
    );
    expect(
      screen.getByRole("menuitem", { name: /terms & conditions/i }),
    ).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("menuitem", { name: /privacy/i })).toHaveAttribute(
      "href",
      "/privacy",
    );
    expect(screen.getByRole("menuitem", { name: /sign out/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete account/i })).toBeInTheDocument();
  });

  it("portals the open menu as a fixed layer so sidebar overflow cannot clip it", async () => {
    const user = userEvent.setup();
    render(
      <AccountMenu
        displayName="Alma Reyes"
        roleLabel="Lot Owner"
        onSignOut={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /account menu/i }));

    const menu = screen.getByRole("menu", { name: /account/i });
    expect(menu.style.position).toBe("fixed");
    expect(menu.style.maxHeight).toBeTruthy();
    // Portaled to document.body, not trapped inside the trigger wrapper.
    expect(menu.parentElement).toBe(document.body);
  });
});
