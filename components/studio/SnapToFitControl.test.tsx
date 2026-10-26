import { expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { defaultAduConfig, parcelPresets } from "@/lib/feasibility";
import { getScenePlacement } from "@/lib/site-fit";
import { SnapToFitControl } from "./SnapToFitControl";

it("commits a validated placement using the current footprint", () => {
  const onCommit = vi.fn();
  render(<SnapToFitControl parcel={parcelPresets[0]} config={defaultAduConfig} pose={{ x: 0, z: 0, rotationDeg: 0 }} onCommit={onCommit} />);
  fireEvent.click(screen.getByRole("button", { name: "Snap to fit" }));
  expect(onCommit).toHaveBeenCalledTimes(1);
  expect(getScenePlacement(parcelPresets[0], defaultAduConfig, onCommit.mock.calls[0][0]).status).toBe("fits");
});

it("preserves the owner's placement when the modeled house footprint is unknown", () => {
  const onCommit = vi.fn();
  render(<SnapToFitControl parcel={{ ...parcelPresets[0], existingHouseSqft: 0 }} config={defaultAduConfig} pose={{ x: 7, z: -11, rotationDeg: 90 }} onCommit={onCommit} />);
  fireEvent.click(screen.getByRole("button", { name: "Snap to fit" }));
  expect(screen.getByRole("status")).toHaveTextContent("No fit found");
  expect(onCommit).not.toHaveBeenCalled();
});
