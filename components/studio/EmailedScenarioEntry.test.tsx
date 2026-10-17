import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { EMAIL_SCENARIO } from "@/test/fixtures/email-scenario";
import { clearInitialParcel, peekInitialParcel } from "@/lib/parcel-handoff";
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), studio: vi.fn() }));
vi.mock("@/components/FeasibilityStudio", () => ({ default: (props: unknown) => { mocks.studio(props); return <div>Restored Studio</div>; } }));
import EmailedScenarioEntry from "./EmailedScenarioEntry";

beforeEach(() => { vi.clearAllMocks(); clearInitialParcel(); vi.stubGlobal("fetch", mocks.fetch); });
it("restores the real parcel before Studio mounts, retaining the complete snapshot", async () => {
  mocks.fetch.mockResolvedValue({ ok: true, json: async () => ({ scenario: EMAIL_SCENARIO }) });
  render(<EmailedScenarioEntry token={"a".repeat(48)} />);
  await screen.findByText("Restored Studio");
  expect(peekInitialParcel()?.address).toBe(EMAIL_SCENARIO.liveParcel!.address);
  expect(mocks.studio).toHaveBeenCalledWith(expect.objectContaining({ initialScenario: expect.objectContaining({ config: EMAIL_SCENARIO.config, assumptions: EMAIL_SCENARIO.assumptions, pose: EMAIL_SCENARIO.pose }) }));
});
it("offers retry for an unavailable link without falling back to an unrelated demo", async () => {
  mocks.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Temporarily unavailable" }) }).mockResolvedValueOnce({ ok: true, json: async () => ({ scenario: EMAIL_SCENARIO }) });
  render(<EmailedScenarioEntry token={"a".repeat(48)} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Temporarily unavailable");
  expect(mocks.studio).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  await screen.findByText("Restored Studio");
});
