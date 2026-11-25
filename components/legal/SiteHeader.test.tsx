import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { SITE_NAV_LINKS, SiteHeader } from "./SiteHeader";

describe("SiteHeader", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/about");
  });

  it("links the brand home and lists every main destination", () => {
    render(<SiteHeader />);

    expect(screen.getByRole("link", { name: "LotFoundry home" })).toHaveAttribute("href", "/");
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    for (const link of SITE_NAV_LINKS) {
      expect(nav.querySelector(`a[href="${link.href}"]`)).toHaveTextContent(link.label);
    }
  });

  it("marks the current page", () => {
    render(<SiteHeader />);

    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    expect(nav.querySelector('a[href="/about"]')).toHaveAttribute("aria-current", "page");
    expect(nav.querySelector('a[href="/adu/ca"]')).not.toHaveAttribute("aria-current");
  });

  it("opens the phone menu and closes it on Escape, returning focus", async () => {
    const user = userEvent.setup();
    render(<SiteHeader actions={<a href="/studio">Open studio</a>} />);

    const trigger = screen.getByRole("button", { name: "Open menu" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger);

    const close = screen.getByRole("button", { name: "Close menu" });
    expect(close).toHaveAttribute("aria-expanded", "true");
    const menu = screen.getByRole("navigation", { name: "Mobile navigation" });
    expect(close).toHaveAttribute("aria-controls", menu.id);
    expect(menu.querySelector('a[href="/can-i-build-a-backyard-home"]')).toHaveTextContent("Lot quiz");

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("navigation", { name: "Mobile navigation" })).toBeNull();
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveFocus();
    expect(screen.getByRole("link", { name: "Open studio" })).toBeInTheDocument();
  });
});
