import { describe, expect, it, vi } from "vitest";
import {
  fitImageWithin,
  isAcceptedStyleMatchPhoto,
  prepareStyleMatchPhoto,
  type DecodedStyleMatchImage,
} from "./style-match-photo";

function makeFile(name: string, type: string) {
  return new File(["photo"], name, { type });
}

function runtimeFor(decoded: Pick<DecodedStyleMatchImage, "width" | "height">) {
  return {
    decodeImage: vi.fn(async () => ({
      ...decoded,
      draw: vi.fn(),
      close: vi.fn(),
    })),
    encodeImage: vi.fn(async () => new Blob(["encoded"], { type: "image/jpeg" })),
  };
}

describe("style-match photo preparation", () => {
  it("accepts the supported browser and iPhone image formats", () => {
    expect(isAcceptedStyleMatchPhoto(makeFile("house.jpg", "image/jpeg"))).toBe(true);
    expect(isAcceptedStyleMatchPhoto(makeFile("house.png", "image/png"))).toBe(true);
    expect(isAcceptedStyleMatchPhoto(makeFile("house.webp", "image/webp"))).toBe(true);
    expect(isAcceptedStyleMatchPhoto(makeFile("house.HEIC", ""))).toBe(true);
    expect(isAcceptedStyleMatchPhoto(makeFile("notes.pdf", "application/pdf"))).toBe(false);
  });

  it("fits large images inside the configured max edge", () => {
    expect(fitImageWithin(4000, 3000, 2048)).toEqual({ width: 2048, height: 1536 });
    expect(fitImageWithin(1200, 800, 2048)).toEqual({ width: 1200, height: 800 });
  });

  it("downscales and re-encodes the photo as metadata-free JPEG", async () => {
    const runtime = runtimeFor({ width: 4032, height: 3024 });

    const prepared = await prepareStyleMatchPhoto(makeFile("owner-yard.heic", "image/heic"), {
      runtime,
    });

    expect(runtime.decodeImage).toHaveBeenCalledOnce();
    expect(runtime.encodeImage).toHaveBeenCalledWith(
      expect.objectContaining({ width: 4032, height: 3024 }),
      { width: 2048, height: 1536 },
      "image/jpeg",
      0.88,
    );
    expect(prepared).toMatchObject({
      filename: "owner-yard.jpg",
      originalType: "image/heic",
      outputType: "image/jpeg",
      originalWidth: 4032,
      originalHeight: 3024,
      width: 2048,
      height: 1536,
      wasConverted: true,
      wasDownscaled: true,
      strippedMetadata: true,
    });
  });

  it("rejects unsupported files before attempting decode", async () => {
    const runtime = runtimeFor({ width: 100, height: 100 });

    await expect(
      prepareStyleMatchPhoto(makeFile("house.txt", "text/plain"), { runtime }),
    ).rejects.toThrow("Use a JPG");

    expect(runtime.decodeImage).not.toHaveBeenCalled();
  });
});
