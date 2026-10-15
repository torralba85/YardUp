// components/studio/FieldBookIndex.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FieldBookIndex from "./FieldBookIndex";

const statuses = {
  lot: "eligible",
  build: "pending",
  return: "eligible",
  record: "ready",
} as const;

describe("FieldBookIndex", () => {
  it("lists the four plates with the subject and marks the active one", () => {
    render(
      <FieldBookIndex
        active="lot"
        onNavigate={() => {}}
        statuses={statuses}
        subject={{ address: "1411 Elm St", apn: "061-244-018", zone: "R-1" }}
      />,
    );
    expect(screen.getByText("1411 Elm St")).toBeInTheDocument();
    expect(screen.getByText(/061-244-018/)).toBeInTheDocument();
    for (const name of ["The Lot", "The Build", "The Return", "The Record"]) {
      expect(screen.getByRole("button", { name: new RegExp(name) })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: /The Lot/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("navigates when a plate is chosen", async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(
      <FieldBookIndex
        active="lot"
        onNavigate={onNavigate}
        statuses={statuses}
        subject={{ address: "1411 Elm St" }}
      />,
    );
    await user.click(screen.getByRole("button", { name: /The Return/ }));
    expect(onNavigate).toHaveBeenCalledWith("return");
  });

  it("moves focus between plates using ArrowDown and ArrowUp", async () => {
    const user = userEvent.setup();
    render(
      <FieldBookIndex
        active="lot"
        onNavigate={vi.fn()}
        statuses={statuses}
        subject={{ address: "1411 Elm St" }}
      />,
    );

    const first = screen.getByRole("button", { name: /The Lot/ });
    const second = screen.getByRole("button", { name: /The Build/ });
    const third = screen.getByRole("button", { name: /The Return/ });

    first.focus();
    expect(document.activeElement).toBe(first);

    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(second);

    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(third);

    await user.keyboard("{ArrowUp}");
    expect(document.activeElement).toBe(second);
  });
});
