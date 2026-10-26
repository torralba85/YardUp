import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { EMAIL_SCENARIO } from "@/test/fixtures/email-scenario";
import { clearInitialParcel, peekInitialParcel } from "@/lib/parcel-handoff";

const mocks = vi.hoisted(() => ({
  contact: vi.fn(), studio: vi.fn(),
  auth: { user: { uid: "owner" } as { uid: string } | null, loading: false },
}));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/lib/marketplace-firestore", () => ({ fetchUnlockedContact: mocks.contact }));
vi.mock("@/components/auth/AuthModal", () => ({ AuthModal: () => null }));
vi.mock("@/components/FeasibilityStudio", () => ({ default: (props: unknown) => {
  mocks.studio(props); return <div>Restored Studio</div>;
} }));
import LeadScenarioEntry from "./LeadScenarioEntry";

beforeEach(() => {
  vi.clearAllMocks(); clearInitialParcel(); mocks.auth.user = { uid: "owner" };
  mocks.contact.mockResolvedValue({ snapshot: { studioScenarioJson: JSON.stringify(EMAIL_SCENARIO) } });
});

it("requires sign-in before reading a private layout", () => {
  mocks.auth.user = null;
  render(<LeadScenarioEntry requestId="request-1" />);
  expect(screen.getByRole("button", { name: "Sign in" })).toBeVisible();
  expect(mocks.contact).not.toHaveBeenCalled();
  expect(mocks.studio).not.toHaveBeenCalled();
});

it("hands the real parcel and exact design to Studio without refetching on auth refresh", async () => {
  const { rerender } = render(<LeadScenarioEntry requestId="request-1" />);
  await screen.findByText("Restored Studio");
  expect(peekInitialParcel()?.address).toBe(EMAIL_SCENARIO.liveParcel!.address);
  expect(mocks.studio).toHaveBeenCalledWith(expect.objectContaining({ initialScenario: expect.objectContaining({
    config: EMAIL_SCENARIO.config, assumptions: EMAIL_SCENARIO.assumptions, pose: EMAIL_SCENARIO.pose,
  }) }));
  mocks.auth.user = { uid: "owner" };
  rerender(<LeadScenarioEntry requestId="request-1" />);
  expect(mocks.contact).toHaveBeenCalledTimes(1);
});

it("stops after an access denial and never opens an unrelated demo", async () => {
  mocks.contact.mockRejectedValue(new Error("permission-denied"));
  const { rerender } = render(<LeadScenarioEntry requestId="request-1" />);
  expect(await screen.findByRole("alert")).toHaveTextContent("unavailable");
  rerender(<LeadScenarioEntry requestId="request-1" />);
  expect(mocks.contact).toHaveBeenCalledTimes(1);
  expect(mocks.studio).not.toHaveBeenCalled();
});

it("clears the previous account's view and verifies the next account's access", async () => {
  const { rerender } = render(<LeadScenarioEntry requestId="request-1" />);
  await screen.findByText("Restored Studio");
  mocks.auth.user = { uid: "other-builder" };
  mocks.contact.mockRejectedValue(new Error("permission-denied"));
  rerender(<LeadScenarioEntry requestId="request-1" />);
  expect(screen.queryByText("Restored Studio")).not.toBeInTheDocument();
  await screen.findByRole("alert");
  await waitFor(() => expect(mocks.contact).toHaveBeenCalledTimes(2));
});
