import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeleteAccountButton } from "./DeleteAccountButton";

const deleteAccount = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ deleteAccount }),
}));

describe("DeleteAccountButton", () => {
  beforeEach(() => {
    deleteAccount.mockReset();
    deleteAccount.mockResolvedValue(undefined);
  });

  it("uses the destructive Button variant for the confirmed irreversible action", async () => {
    const user = userEvent.setup();
    render(<DeleteAccountButton tone="light" />);

    await user.click(screen.getByRole("button", { name: "Delete account" }));

    const confirm = screen.getByRole("button", { name: "Delete permanently" });
    expect(confirm).toHaveClass(
      "bg-status-blocked",
      "hover:bg-status-blocked-hover",
      "focus-visible:ring-status-blocked",
    );

    await user.click(confirm);
    await waitFor(() => expect(deleteAccount).toHaveBeenCalledTimes(1));
  });
});
