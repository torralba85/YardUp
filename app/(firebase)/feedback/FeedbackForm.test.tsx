import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { FeedbackForm } from "./FeedbackForm";

vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ user: null }) }));
afterEach(() => { sessionStorage.clear(); vi.unstubAllGlobals(); });

it("explains short feedback and focuses the message without sending a request", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  render(<FeedbackForm />);
  await userEvent.selectOptions(screen.getByLabelText("Category"), "bug");
  await userEvent.click(screen.getByRole("button", { name: "Send feedback" }));
  const message = screen.getByLabelText("What happened, or what should we build?");
  expect(message).toHaveFocus();
  expect(message).toHaveAttribute("aria-invalid", "true");
  expect(message).toHaveAccessibleDescription(/10/);
  expect(fetch).not.toHaveBeenCalled();
});

it("restores this tab's draft and clears it after successful submission", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ticketId: "ticket-1" }) }));
  const first = render(<FeedbackForm />);
  await userEvent.type(screen.getByLabelText("What happened, or what should we build?"), "The map needs a clearer legend.");
  first.unmount();
  const second = render(<FeedbackForm />);
  expect(screen.getByLabelText("What happened, or what should we build?")).toHaveValue("The map needs a clearer legend.");
  await userEvent.selectOptions(screen.getByLabelText("Category"), "bug");
  await userEvent.click(screen.getByRole("button", { name: "Send feedback" }));
  await screen.findByText("ticket-1");
  second.unmount();
  render(<FeedbackForm />);
  expect(screen.getByLabelText("What happened, or what should we build?")).toHaveValue("");
});
