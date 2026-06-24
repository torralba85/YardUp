import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import StyleMatchPanel from "./StyleMatchPanel";
import type { PreparedStyleMatchPhoto } from "@/lib/style-match-photo";

afterEach(() => {
  vi.useRealTimers();
});

const preparedPhoto: PreparedStyleMatchPhoto = {
  blob: new Blob(["prepared"], { type: "image/jpeg" }),
  filename: "owner-yard.jpg",
  originalType: "image/heic",
  outputType: "image/jpeg",
  originalWidth: 4032,
  originalHeight: 3024,
  width: 2048,
  height: 1536,
  sizeBytes: 8,
  wasConverted: true,
  wasDownscaled: true,
  strippedMetadata: true,
};

describe("StyleMatchPanel", () => {
  it("prepares, previews, and confirms a house photo using timer simulation", async () => {
    const preparePhoto = vi.fn(async () => preparedPhoto);
    const onConfirm = vi.fn();
    const onGenerationComplete = vi.fn();

    render(
      <StyleMatchPanel
        preparePhoto={preparePhoto}
        onConfirm={onConfirm}
        onGenerationComplete={onGenerationComplete}
      />
    );

    const input = screen.getByLabelText(/Choose house photo/i);
    fireEvent.change(input, {
      target: { files: [new File(["raw"], "owner-yard.heic", { type: "image/heic" })] },
    });

    expect(await screen.findByAltText(/Prepared house photo preview/i)).toBeInTheDocument();
    expect(screen.getByText("2048 px")).toBeInTheDocument();
    expect(screen.getByText("Stripped")).toBeInTheDocument();

    // Use fake timers only for the confirmation/progress simulation phase
    vi.useFakeTimers();

    fireEvent.click(screen.getByRole("button", { name: /Use this photo/i }));

    expect(onConfirm).toHaveBeenCalledWith(preparedPhoto);
    expect(screen.getByText("Casting concept…")).toBeInTheDocument();
    expect(screen.getByText(/Reading materials & roofline/i)).toBeInTheDocument();

    // Advance timers by 10 seconds to complete the simulation, wrapped in act()
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    // Switch back to real timers for testing wait/render outcomes
    vi.useRealTimers();

    await waitFor(() => {
      expect(onGenerationComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          styleName: "Craftsman",
          matchPercentage: 91,
        })
      );
    });

    expect(screen.getByText(/Photo sealed for style match/i)).toBeInTheDocument();
  });

  it("shows a recoverable error when photo preparation fails", async () => {
    const preparePhoto = vi.fn(async () => {
      throw new Error("HEIC is accepted, but this browser could not decode this file.");
    });

    render(<StyleMatchPanel preparePhoto={preparePhoto} />);

    fireEvent.change(screen.getByLabelText(/Choose house photo/i), {
      target: { files: [new File(["raw"], "broken.heic", { type: "image/heic" })] },
    });

    expect(await screen.findByText(/could not decode/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Choose another photo/i }));

    expect(screen.getByLabelText(/Choose house photo/i)).toBeInTheDocument();
  });

  it("uses Dev Test Controls [Success] button to transition state immediately", async () => {
    const preparePhoto = vi.fn(async () => preparedPhoto);
    const onConfirm = vi.fn();
    const onGenerationComplete = vi.fn();

    render(
      <StyleMatchPanel
        preparePhoto={preparePhoto}
        onConfirm={onConfirm}
        onGenerationComplete={onGenerationComplete}
      />
    );

    const input = screen.getByLabelText(/Choose house photo/i);
    fireEvent.change(input, {
      target: { files: [new File(["raw"], "owner-yard.heic", { type: "image/heic" })] },
    });

    expect(await screen.findByAltText(/Prepared house photo preview/i)).toBeInTheDocument();

    vi.useFakeTimers();

    fireEvent.click(screen.getByRole("button", { name: /Use this photo/i }));
    expect(screen.getByText("Casting concept…")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "[Success]" }));

    vi.useRealTimers();

    expect(onGenerationComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        styleName: "Craftsman",
        matchPercentage: 91,
      })
    );
    expect(screen.getByText(/Photo sealed for style match/i)).toBeInTheDocument();
  });

  it("uses Dev Test Controls [Error] button and allows Retry without reconfirming", async () => {
    const preparePhoto = vi.fn(async () => preparedPhoto);
    const onConfirm = vi.fn();

    render(<StyleMatchPanel preparePhoto={preparePhoto} onConfirm={onConfirm} />);

    const input = screen.getByLabelText(/Choose house photo/i);
    fireEvent.change(input, {
      target: { files: [new File(["raw"], "owner-yard.heic", { type: "image/heic" })] },
    });

    expect(await screen.findByAltText(/Prepared house photo preview/i)).toBeInTheDocument();

    vi.useFakeTimers();

    fireEvent.click(screen.getByRole("button", { name: /Use this photo/i }));
    expect(screen.getByText("Casting concept…")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "[Error]" }));

    expect(
      screen.getByText(/We couldn't read enough of the house from this photo/i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Retry/i }));
    expect(screen.getByText("Casting concept…")).toBeInTheDocument();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("uses Dev Test Controls [Timeout] button and allows Choose Another", async () => {
    const preparePhoto = vi.fn(async () => preparedPhoto);

    render(<StyleMatchPanel preparePhoto={preparePhoto} />);

    const input = screen.getByLabelText(/Choose house photo/i);
    fireEvent.change(input, {
      target: { files: [new File(["raw"], "owner-yard.heic", { type: "image/heic" })] },
    });

    expect(await screen.findByAltText(/Prepared house photo preview/i)).toBeInTheDocument();

    vi.useFakeTimers();

    fireEvent.click(screen.getByRole("button", { name: /Use this photo/i }));
    expect(screen.getByText("Casting concept…")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "[Timeout]" }));

    expect(screen.getByText(/Casting timed out/i)).toBeInTheDocument();

    vi.useRealTimers();

    fireEvent.click(screen.getByRole("button", { name: /Choose another photo/i }));
    expect(screen.getByLabelText(/Choose house photo/i)).toBeInTheDocument();
  });
});
