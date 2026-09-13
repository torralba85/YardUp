import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { SecurityPanel } from "./SecurityPanel";
import { getAccountCapabilities } from "@/lib/account-settings";

it("labels security fields and focuses the first invalid field without submitting", async () => {
  const changeEmail = vi.fn();
  const changePassword = vi.fn();
  render(<SecurityPanel capabilities={getAccountCapabilities([{ providerId: "password" }])}
    onChangeEmail={changeEmail} onChangePassword={changePassword} />);
  const email = screen.getByLabelText("New email");
  expect(screen.getAllByLabelText("Current password")).toHaveLength(2);
  await userEvent.click(screen.getByRole("button", { name: "Update email" }));
  expect(email).toHaveFocus();
  expect(email).toHaveAttribute("aria-invalid", "true");
  expect(email).toHaveAccessibleDescription(/email/i);
  expect(changeEmail).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "Update password" }));
  expect(screen.getAllByLabelText("Current password")[1]).toHaveFocus();
  expect(changePassword).not.toHaveBeenCalled();
});
