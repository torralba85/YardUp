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

function Harness({ sitePlanUnlocked = true, onUnlockSitePlan }: { sitePlanUnlocked?: boolean; onUnlockSitePlan?: () => void }) {
  const [active, setActive] = useState(false);
  return (
    <SceneTools utilityMode={active} onUtilityModeChange={setActive}
      sitePlanUnlocked={sitePlanUnlocked} onUnlockSitePlan={onUnlockSitePlan}>
      <p>Placement controls</p>
    </SceneTools>
  );
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

it("keeps the site plan PDF for certificate buyers and routes everyone else to the certificate", async () => {
  exportPlan.mockClear();
  const unlock = vi.fn();
  const user = userEvent.setup();
  render(<Harness sitePlanUnlocked={false} onUnlockSitePlan={unlock} />);
  await user.click(screen.getByText("Tools", { exact: true }));
  expect(screen.queryByRole("button", { name: "Export site plan PDF" })).not.toBeInTheDocument();
  expect(screen.getByText("Included with the Certificate of Feasibility.")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Unlock site plan PDF" }));
  expect(unlock).toHaveBeenCalledOnce();
  expect(exportPlan).not.toHaveBeenCalled();
});
