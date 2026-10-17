import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import EmailLayoutCapture from "./EmailLayoutCapture";
import { defaultScenarioState } from "@/lib/scenario-url";
afterEach(() => vi.unstubAllGlobals());
describe("email layout capture", () => {
  it("requires unchecked consent, sends the current snapshot and reports provider failure", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "Delivery unavailable" }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<EmailLayoutCapture scenario={defaultScenarioState} />);
    const submit = screen.getByRole("button", { name: "Email me my 3D lot layout" });
    expect(submit).toBeDisabled();
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "owner@example.com" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(submit);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Delivery unavailable"));
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload).toMatchObject({ consent: true, email: "owner@example.com", scenario: defaultScenarioState });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
