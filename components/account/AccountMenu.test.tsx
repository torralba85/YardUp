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
  it("exposes every launch-required account action", async () => {
    render(
      <AccountMenu displayName="Alma Reyes" roleLabel="Lot Owner" onSignOut={vi.fn()} />,
    );

    await userEvent.click(screen.getByRole("button", { name: /alma reyes/i }));

    expect(screen.getByRole("menuitem", { name: "Settings" })).toHaveAttribute(
      "href",
      "/settings",
    );
    expect(screen.getByRole("menuitem", { name: "Get help" })).toHaveAttribute(
      "href",
      "/help",
    );
    expect(
      screen.getByRole("menuitem", { name: "Send feedback" }),
    ).toHaveAttribute("href", "/feedback");
    expect(
      screen.getByRole("menuitem", { name: "Terms & Conditions" }),
    ).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("menuitem", { name: "Privacy" })).toHaveAttribute(
      "href",
      "/privacy",
    );
    expect(screen.getByRole("menuitem", { name: "Sign out" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete account" }),
    ).toBeInTheDocument();
  });

  it("signs out through the menu and closes it", async () => {
    const onSignOut = vi.fn();
    render(
      <AccountMenu
        displayName="Alma Reyes"
        roleLabel="Builder"
        onSignOut={onSignOut}
        compact
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Account menu" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));

    expect(onSignOut).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    render(
      <AccountMenu displayName="Alma Reyes" roleLabel="Lot Owner" onSignOut={vi.fn()} />,
    );
    const trigger = screen.getByRole("button", { name: /alma reyes/i });

    await userEvent.click(trigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
