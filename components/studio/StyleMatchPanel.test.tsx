import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import StyleMatchPanel from "./StyleMatchPanel";
import type { PreparedStyleMatchPhoto } from "@/lib/style-match-photo";

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
  it("prepares, previews, and confirms a house photo", async () => {
    const preparePhoto = vi.fn(async () => preparedPhoto);
    const onConfirm = vi.fn();

    render(<StyleMatchPanel preparePhoto={preparePhoto} onConfirm={onConfirm} />);

    const input = screen.getByLabelText(/Choose house photo/i);
    fireEvent.change(input, {
      target: { files: [new File(["raw"], "owner-yard.heic", { type: "image/heic" })] },
    });

    expect(await screen.findByAltText(/Prepared house photo preview/i)).toBeInTheDocument();
    expect(screen.getByText("2048 px")).toBeInTheDocument();
    expect(screen.getByText("Stripped")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Use this photo/i }));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith(preparedPhoto);
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
});
