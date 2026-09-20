import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SplatCalibrationPanel from "./SplatCalibrationPanel";
import { type SplatSceneDefinition } from "@/lib/splat-scene";

const mockScene: SplatSceneDefinition = {
  id: "oak-street-curated",
  parcelId: "oak-street",
  assetUrl: "/scans/oak-street-curated.spz",
  format: "spz",
  approximateBytes: 100000,
  captureLabel: "Oak Street Scan",
  transform: {
    positionFt: [0, 0, 10],
    yawRad: 0,
    uniformScale: 1,
  },
};

describe("SplatCalibrationPanel", () => {
  it("renders calibration controls and survey disclaimer", () => {
    const onChange = vi.fn();
    const onReset = vi.fn();

    render(
      <SplatCalibrationPanel
        scene={mockScene}
        transform={mockScene.transform}
        onChangeTransform={onChange}
        onResetTransform={onReset}
      />
    );

    expect(screen.getByText("VISUAL CALIBRATION — NOT SURVEYED")).toBeInTheDocument();
    expect(screen.getByLabelText("Uniform scale")).toHaveValue(1);
    expect(screen.getByLabelText("Yaw rotation in degrees")).toHaveValue(0);
    expect(screen.getByLabelText("X offset in feet")).toHaveValue(0);
    expect(screen.getByLabelText("Y offset in feet")).toHaveValue(0);
    expect(screen.getByLabelText("Z offset in feet")).toHaveValue(10);
  });

  it("calls onChangeTransform when scale, yaw, or offsets change", () => {
    const onChange = vi.fn();
    const onReset = vi.fn();

    render(
      <SplatCalibrationPanel
        scene={mockScene}
        transform={mockScene.transform}
        onChangeTransform={onChange}
        onResetTransform={onReset}
      />
    );

    // Change scale
    fireEvent.change(screen.getByLabelText("Uniform scale"), { target: { value: "1.5" } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ uniformScale: 1.5 }));

    // Change yaw
    fireEvent.change(screen.getByLabelText("Yaw rotation in degrees"), { target: { value: "90" } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ yawRad: (90 * Math.PI) / 180 })
    );

    // Change X offset
    fireEvent.change(screen.getByLabelText("X offset in feet"), { target: { value: "5" } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ positionFt: [5, 0, 10] })
    );
  });

  it("calls onResetTransform when Reset button is clicked", () => {
    const onChange = vi.fn();
    const onReset = vi.fn();

    render(
      <SplatCalibrationPanel
        scene={mockScene}
        transform={{ positionFt: [1, 2, 3], yawRad: 0.5, uniformScale: 2 }}
        onChangeTransform={onChange}
        onResetTransform={onReset}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /reset/i }));
    expect(onReset).toHaveBeenCalledOnce();
  });

  it("toggles splat-only inspection mode", () => {
    const onChange = vi.fn();
    const onReset = vi.fn();
    const onToggleSplatOnly = vi.fn();

    const { rerender } = render(
      <SplatCalibrationPanel
        scene={mockScene}
        transform={mockScene.transform}
        onChangeTransform={onChange}
        onResetTransform={onReset}
        splatOnly={false}
        onToggleSplatOnly={onToggleSplatOnly}
      />
    );

    const toggleBtn = screen.getByRole("button", { name: /splat-only inspection/i });
    fireEvent.click(toggleBtn);
    expect(onToggleSplatOnly).toHaveBeenCalledWith(true);

    rerender(
      <SplatCalibrationPanel
        scene={mockScene}
        transform={mockScene.transform}
        onChangeTransform={onChange}
        onResetTransform={onReset}
        splatOnly={true}
        onToggleSplatOnly={onToggleSplatOnly}
      />
    );

    expect(screen.getByRole("button", { name: /exit splat-only mode/i })).toBeInTheDocument();
  });

  it("handles copy json or fallback display", async () => {
    const onChange = vi.fn();
    const onReset = vi.fn();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    render(
      <SplatCalibrationPanel
        scene={mockScene}
        transform={mockScene.transform}
        onChangeTransform={onChange}
        onResetTransform={onReset}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /export json/i }));
    });
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("oak-street-curated"));
  });
});
