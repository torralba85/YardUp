import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { SceneTools } from "./SceneTools";

const exportPlan = vi.hoisted(() => vi.fn());
vi.mock("@/utils/export/generateFeasibilityReport", () => ({
  generateAndDownloadCurrentFeasibilityReport: exportPlan,
}));
vi.mock("@/lib/studio-enhancements-store", () => ({
  useStudioEnhancements: () => ({ utilityEstimate: null }),
}));

function Harness() {
  const [active, setActive] = useState(false);
  return <SceneTools utilityMode={active} onUtilityModeChange={setActive}><p>Placement controls</p></SceneTools>;
}

it("shows utility guidance only during that task and exits it when Tools closes", async () => {
  const user = userEvent.setup();
  render(<Harness />);
  expect(screen.getByText("Placement controls")).not.toBeVisible();
  await user.click(screen.getByText("Tools", { exact: true }));
  expect(screen.queryByText(/Click the primary house/)).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Plan utilities" }));
  expect(screen.getByText(/Click the primary house/)).toBeVisible();
  await user.click(screen.getByText("Tools", { exact: true }));
  await user.click(screen.getByText("Tools", { exact: true }));
  expect(screen.getByRole("button", { name: "Plan utilities" })).toHaveAttribute("aria-pressed", "false");
});

it("keeps export failure actionable within Tools", async () => {
  exportPlan.mockRejectedValueOnce(new Error("No canvas"));
  const user = userEvent.setup();
  render(<Harness />);
  await user.click(screen.getByText("Tools", { exact: true }));
  await user.click(screen.getByRole("button", { name: "Export site plan PDF" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("until the 3D concept is loaded");
  expect(screen.getByRole("button", { name: "Export site plan PDF" })).toBeEnabled();
});
