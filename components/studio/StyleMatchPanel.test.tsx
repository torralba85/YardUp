import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StyleMatchPanel from "./StyleMatchPanel";
import { AIRequestError, requestADUConcept } from "@/lib/ai-api";
import type { AIADUConcept } from "@/lib/ai-types";
import { defaultAduConfig, parcelPresets } from "@/lib/feasibility";
import type { PreparedStyleMatchPhoto } from "@/lib/style-match-photo";

vi.mock("@/lib/ai-api", () => ({
  AIRequestError: class AIRequestError extends Error {
    userMessage: string;

    constructor(userMessage: string) {
      super(userMessage);
      this.name = "AIRequestError";
      this.userMessage = userMessage;
    }
  },
  requestADUConcept: vi.fn(),
}));

const requestADUConceptMock = vi.mocked(requestADUConcept);

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
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

const generatedConcept: AIADUConcept = {
  architecturalStyle: "Craftsman",
  styleSummary: "Warm wood trim and a low-pitch roof.",
  matchedElements: ["Cedar lap siding", "Low-pitch gable", "White trim"],
  recommendedConfig: { roof: "gable", finish: "lap" },
  imagePrompt: "Craftsman backyard ADU",
  imageDataUrl: "data:image/png;base64,generated-concept",
  disclaimer: "Concept image only.",
};

const activeParcel = parcelPresets[1];
const activeConfig = {
  ...defaultAduConfig,
  width: 22,
  length: 31,
  roof: "shed" as const,
  finish: "cedar" as const,
};

beforeEach(() => {
  requestADUConceptMock.mockResolvedValue(generatedConcept);
});

function consentToAi() {
  fireEvent.click(
    screen.getByRole("checkbox", {
      name: /agree to send this photo to OpenAI/i,
    }),
  );
}

describe("StyleMatchPanel", () => {
  it("prepares a sanitized photo and requests a generated concept with active parcel and config", async () => {
    const preparePhoto = vi.fn(async () => preparedPhoto);
    const onConfirm = vi.fn();
    const onGenerationComplete = vi.fn();

    render(
      <StyleMatchPanel
        preparePhoto={preparePhoto}
        onConfirm={onConfirm}
        onGenerationComplete={onGenerationComplete}
        parcel={activeParcel}
        config={activeConfig}
      />,
    );

    consentToAi();
    const input = screen.getByLabelText(/Choose house photo/i);
    fireEvent.change(input, {
      target: { files: [new File(["raw"], "owner-yard.heic", { type: "image/heic" })] },
    });

    expect(await screen.findByAltText(/Prepared house photo preview/i)).toBeInTheDocument();
    expect(screen.getByText("2048 px")).toBeInTheDocument();
    expect(screen.getByText("Stripped")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Use this photo/i }));

    expect(onConfirm).toHaveBeenCalledWith(preparedPhoto);
    expect(screen.getByText(/Casting concept/i)).toBeInTheDocument();
    expect(screen.getByText(/Reading materials & roofline/i)).toBeInTheDocument();

    await waitFor(() => expect(requestADUConceptMock).toHaveBeenCalledTimes(1));
    const request = requestADUConceptMock.mock.calls[0][0];
    expect(request.parcel).toBe(activeParcel);
    expect(request.config).toBe(activeConfig);
    expect(request.image).toBeInstanceOf(File);
    expect(request.image.name).toBe("owner-yard.jpg");
    expect(request.image.type).toBe("image/jpeg");
    await expect(request.image.text()).resolves.toBe("prepared");

    await waitFor(() => {
      expect(onGenerationComplete).toHaveBeenCalledWith({
        photoUrl: expect.stringMatching(/^blob:/),
        conceptUrl: generatedConcept.imageDataUrl,
        styleName: "Craftsman",
        matchPercentage: 91,
        traits: generatedConcept.matchedElements,
      });
    });

    expect(screen.getByText(/Photo sealed for style match/i)).toBeInTheDocument();
  });

  it("revokes preview blob URLs when replacing the photo and on unmount", async () => {
    const preparePhoto = vi.fn(async () => preparedPhoto);
    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValueOnce("blob:first-preview")
      .mockReturnValueOnce("blob:second-preview");
    const revokeObjectURL = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => undefined);

    try {
      const { unmount } = render(
        <StyleMatchPanel
          preparePhoto={preparePhoto}
          parcel={activeParcel}
          config={activeConfig}
        />,
      );

      consentToAi();
      const input = screen.getByLabelText(/Choose house photo/i);

      fireEvent.change(input, {
        target: { files: [new File(["first"], "first.heic", { type: "image/heic" })] },
      });
      expect(await screen.findByAltText(/Prepared house photo preview/i)).toBeInTheDocument();

      // Replacing the photo revokes the first preview URL before minting the second.
      fireEvent.click(screen.getByRole("button", { name: "Choose another photo" }));
      consentToAi();
      const replacementInput = screen.getByLabelText(/Choose house photo/i);
      fireEvent.change(replacementInput, {
        target: { files: [new File(["second"], "second.heic", { type: "image/heic" })] },
      });
      await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(2));
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:first-preview");

      // Unmounting revokes the surviving preview URL.
      unmount();
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:second-preview");
    } finally {
      createObjectURL.mockRestore();
      revokeObjectURL.mockRestore();
    }
  });

  it("shows a recoverable error when photo preparation fails", async () => {
    const preparePhoto = vi.fn(async () => {
      throw new Error("HEIC is accepted, but this browser could not decode this file.");
    });

    render(
      <StyleMatchPanel
        preparePhoto={preparePhoto}
        parcel={activeParcel}
        config={activeConfig}
      />,
    );

    consentToAi();
    fireEvent.change(screen.getByLabelText(/Choose house photo/i), {
      target: { files: [new File(["raw"], "broken.heic", { type: "image/heic" })] },
    });

    expect(await screen.findByText(/could not decode/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Choose another photo/i }));

    consentToAi();
    expect(screen.getByLabelText(/Choose house photo/i)).toBeInTheDocument();
  });

  it("surfaces API errors and allows retry without reconfirming", async () => {
    const preparePhoto = vi.fn(async () => preparedPhoto);
    const onConfirm = vi.fn();
    requestADUConceptMock
      .mockRejectedValueOnce(
        new AIRequestError("AI is not configured yet. Add OPENAI_API_KEY on the server."),
      )
      .mockResolvedValueOnce(generatedConcept);

    render(
      <StyleMatchPanel
        preparePhoto={preparePhoto}
        onConfirm={onConfirm}
        parcel={activeParcel}
        config={activeConfig}
      />,
    );

    consentToAi();
    fireEvent.change(screen.getByLabelText(/Choose house photo/i), {
      target: { files: [new File(["raw"], "owner-yard.heic", { type: "image/heic" })] },
    });
    expect(await screen.findByAltText(/Prepared house photo preview/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Use this photo/i }));

    expect(await screen.findByText(/OPENAI_API_KEY/i)).toBeInTheDocument();
    expect(onConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /Retry/i }));

    await waitFor(() => expect(requestADUConceptMock).toHaveBeenCalledTimes(2));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Photo sealed for style match/i)).toBeInTheDocument();
  });

  it("uses Dev Test Controls [Success] button to transition state immediately", async () => {
    const preparePhoto = vi.fn(async () => preparedPhoto);
    const onConfirm = vi.fn();
    const onGenerationComplete = vi.fn();
    requestADUConceptMock.mockReturnValue(new Promise(() => {}));

    render(
      <StyleMatchPanel
        preparePhoto={preparePhoto}
        onConfirm={onConfirm}
        onGenerationComplete={onGenerationComplete}
        parcel={activeParcel}
        config={activeConfig}
      />,
    );

    consentToAi();
    const input = screen.getByLabelText(/Choose house photo/i);
    fireEvent.change(input, {
      target: { files: [new File(["raw"], "owner-yard.heic", { type: "image/heic" })] },
    });

    expect(await screen.findByAltText(/Prepared house photo preview/i)).toBeInTheDocument();

    vi.useFakeTimers();

    fireEvent.click(screen.getByRole("button", { name: /Use this photo/i }));
    expect(screen.getByText(/Casting concept/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "[Success]" }));

    vi.useRealTimers();

    expect(onGenerationComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        styleName: "Craftsman",
        matchPercentage: 91,
        conceptUrl: expect.stringMatching(/^data:image\/png;base64,/),
      }),
    );
    expect(screen.getByText(/Photo sealed for style match/i)).toBeInTheDocument();
  });

  it("uses Dev Test Controls [Error] button and allows Retry without reconfirming", async () => {
    const preparePhoto = vi.fn(async () => preparedPhoto);
    const onConfirm = vi.fn();
    requestADUConceptMock.mockReturnValue(new Promise(() => {}));

    render(
      <StyleMatchPanel
        preparePhoto={preparePhoto}
        onConfirm={onConfirm}
        parcel={activeParcel}
        config={activeConfig}
      />,
    );

    consentToAi();
    const input = screen.getByLabelText(/Choose house photo/i);
    fireEvent.change(input, {
      target: { files: [new File(["raw"], "owner-yard.heic", { type: "image/heic" })] },
    });

    expect(await screen.findByAltText(/Prepared house photo preview/i)).toBeInTheDocument();

    vi.useFakeTimers();

    fireEvent.click(screen.getByRole("button", { name: /Use this photo/i }));
    expect(screen.getByText(/Casting concept/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "[Error]" }));

    expect(
      screen.getByText(/We couldn't read enough of the house from this photo/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Retry/i }));
    expect(screen.getByText(/Casting concept/i)).toBeInTheDocument();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("uses Dev Test Controls [Timeout] button and allows Choose Another", async () => {
    const preparePhoto = vi.fn(async () => preparedPhoto);
    requestADUConceptMock.mockReturnValue(new Promise(() => {}));

    render(
      <StyleMatchPanel
        preparePhoto={preparePhoto}
        parcel={activeParcel}
        config={activeConfig}
      />,
    );

    consentToAi();
    const input = screen.getByLabelText(/Choose house photo/i);
    fireEvent.change(input, {
      target: { files: [new File(["raw"], "owner-yard.heic", { type: "image/heic" })] },
    });

    expect(await screen.findByAltText(/Prepared house photo preview/i)).toBeInTheDocument();

    vi.useFakeTimers();

    fireEvent.click(screen.getByRole("button", { name: /Use this photo/i }));
    expect(screen.getByText(/Casting concept/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "[Timeout]" }));

    expect(screen.getByText(/Casting timed out/i)).toBeInTheDocument();

    vi.useRealTimers();

    fireEvent.click(screen.getByRole("button", { name: /Choose another photo/i }));
    expect(screen.getByLabelText(/Choose house photo/i)).toBeInTheDocument();
  });
});

