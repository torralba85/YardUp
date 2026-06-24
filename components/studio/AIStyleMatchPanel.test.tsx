import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AIStyleMatchPanel from "./AIStyleMatchPanel";
import { defaultAduConfig, parcelPresets } from "@/lib/feasibility";

vi.mock("@/lib/ai-api", () => ({
  AIRequestError: class AIRequestError extends Error {
    userMessage: string;

    constructor(userMessage: string) {
      super(userMessage);
      this.userMessage = userMessage;
    }
  },
  requestADUConcept: vi.fn(),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AIStyleMatchPanel", () => {
  it("uses the clay action accent", () => {
    render(<AIStyleMatchPanel parcel={parcelPresets[0]} config={defaultAduConfig} />);

    expect(screen.getByRole("button", { name: /Generate matching ADU/i })).toHaveClass(
      "bg-lf-clay",
    );
  });

  it("revokes preview blob URLs when replacing the photo and unmounting", () => {
    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValueOnce("blob:first-preview")
      .mockReturnValueOnce("blob:second-preview");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const { unmount } = render(
      <AIStyleMatchPanel parcel={parcelPresets[0]} config={defaultAduConfig} />,
    );
    const input = screen.getByLabelText(/Choose JPG, PNG, or WebP/i);

    fireEvent.change(input, {
      target: { files: [new File(["first"], "first.jpg", { type: "image/jpeg" })] },
    });
    fireEvent.change(input, {
      target: { files: [new File(["second"], "second.jpg", { type: "image/jpeg" })] },
    });
    unmount();

    expect(createObjectURL).toHaveBeenCalledTimes(2);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:first-preview");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:second-preview");
  });
});
