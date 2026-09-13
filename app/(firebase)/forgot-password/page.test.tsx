import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import ForgotPasswordPage from "./page";

const reset = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ user: null, sendPasswordReset: reset }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));

it("announces a reset failure and focuses the success confirmation after retry", async () => {
  reset.mockRejectedValueOnce(new Error("Network error")).mockResolvedValueOnce(undefined);
  render(<ForgotPasswordPage />);
  const email = screen.getByLabelText("Email");
  await userEvent.type(email, "owner@example.test");
  await userEvent.click(screen.getByRole("button", { name: "Send reset link" }));
  await screen.findByRole("alert");
  expect(email).toHaveFocus();
  expect(email).toHaveAttribute("aria-describedby", "reset-email-error");
  await userEvent.click(screen.getByRole("button", { name: "Send reset link" }));
  const confirmation = await screen.findByRole("status");
  expect(confirmation).toHaveFocus();
  expect(confirmation).toHaveTextContent("owner@example.test");
});
