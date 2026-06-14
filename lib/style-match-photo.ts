export const STYLE_MATCH_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

const ACCEPTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"];
export const STYLE_MATCH_ACCEPT = [
  ...STYLE_MATCH_ACCEPTED_TYPES,
  ...ACCEPTED_EXTENSIONS,
].join(",");
const OUTPUT_TYPE = "image/jpeg";
const DEFAULT_MAX_EDGE = 2048;
const DEFAULT_QUALITY = 0.88;

export interface PreparedStyleMatchPhoto {
  blob: Blob;
  filename: string;
  originalType: string;
  outputType: typeof OUTPUT_TYPE;
  originalWidth: number;
  originalHeight: number;
  width: number;
  height: number;
  sizeBytes: number;
  wasConverted: boolean;
  wasDownscaled: boolean;
  strippedMetadata: true;
}

export interface DecodedStyleMatchImage {
  width: number;
  height: number;
  draw: (
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
  ) => void;
  close?: () => void;
}

export interface StyleMatchPhotoRuntime {
  decodeImage?: (file: File) => Promise<DecodedStyleMatchImage>;
  encodeImage?: (
    image: DecodedStyleMatchImage,
    target: { width: number; height: number },
    type: typeof OUTPUT_TYPE,
    quality: number,
  ) => Promise<Blob>;
}

export interface PrepareStyleMatchPhotoOptions {
  maxEdge?: number;
  quality?: number;
  runtime?: StyleMatchPhotoRuntime;
}

export async function prepareStyleMatchPhoto(
  file: File,
  options: PrepareStyleMatchPhotoOptions = {},
): Promise<PreparedStyleMatchPhoto> {
  if (!isAcceptedStyleMatchPhoto(file)) {
    throw new Error("Use a JPG, PNG, WEBP, HEIC, or HEIF photo.");
  }

  const maxEdge = options.maxEdge ?? DEFAULT_MAX_EDGE;
  const quality = options.quality ?? DEFAULT_QUALITY;
  const decodeImage = options.runtime?.decodeImage ?? decodeBrowserImage;
  const encodeImage = options.runtime?.encodeImage ?? encodeBrowserImage;

  const decoded = await decodeImage(file);
  try {
    const target = fitImageWithin(decoded.width, decoded.height, maxEdge);
    const encoded = await encodeImage(decoded, target, OUTPUT_TYPE, quality);
    const blob =
      encoded.type === OUTPUT_TYPE ? encoded : new Blob([encoded], { type: OUTPUT_TYPE });

    return {
      blob,
      filename: replaceExtension(file.name || "style-match-photo", "jpg"),
      originalType: file.type || inferTypeFromName(file.name) || "unknown",
      outputType: OUTPUT_TYPE,
      originalWidth: decoded.width,
      originalHeight: decoded.height,
      width: target.width,
      height: target.height,
      sizeBytes: blob.size,
      wasConverted: (file.type || "").toLowerCase() !== OUTPUT_TYPE,
      wasDownscaled: target.width !== decoded.width || target.height !== decoded.height,
      strippedMetadata: true,
    };
  } finally {
    decoded.close?.();
  }
}

export function isAcceptedStyleMatchPhoto(file: File): boolean {
  const type = file.type.toLowerCase();
  if ((STYLE_MATCH_ACCEPTED_TYPES as readonly string[]).includes(type)) return true;

  const lowerName = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
}

export function fitImageWithin(
  width: number,
  height: number,
  maxEdge: number = DEFAULT_MAX_EDGE,
): { width: number; height: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("The photo could not be measured.");
  }
  if (!Number.isFinite(maxEdge) || maxEdge <= 0) {
    throw new Error("The photo size limit is invalid.");
  }

  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function decodeBrowserImage(file: File): Promise<DecodedStyleMatchImage> {
  if (isHeicLike(file)) {
    return decodeHeicImage(file);
  }

  return decodeRasterBlob(file, formatDecodeError(file));
}

async function decodeHeicImage(file: File): Promise<DecodedStyleMatchImage> {
  try {
    const { default: heic2any } = await import("heic2any");
    const converted = await heic2any({
      blob: file,
      toType: OUTPUT_TYPE,
      quality: DEFAULT_QUALITY,
    });
    const convertedBlob = Array.isArray(converted) ? converted[0] : converted;

    return decodeRasterBlob(
      convertedBlob,
      "HEIC was converted, but the preview image could not be decoded.",
    );
  } catch {
    throw new Error("HEIC is accepted, but this browser could not decode this file.");
  }
}

async function decodeRasterBlob(
  blob: Blob,
  decodeErrorMessage: string,
): Promise<DecodedStyleMatchImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(blob, {
        imageOrientation: "from-image",
      } as ImageBitmapOptions);

      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (context, width, height) => context.drawImage(bitmap, 0, 0, width, height),
        close: () => bitmap.close(),
      };
    } catch {
      // Fall through to HTMLImageElement decoding. Safari may support image
      // formats that Chromium's ImageBitmap path does not.
    }
  }

  return decodeWithImageElement(blob, decodeErrorMessage);
}

async function decodeWithImageElement(
  blob: Blob,
  decodeErrorMessage: string,
): Promise<DecodedStyleMatchImage> {
  if (typeof Image === "undefined" || typeof URL === "undefined") {
    throw new Error("Photo decoding is not available in this browser.");
  }

  const objectUrl = URL.createObjectURL(blob);
  const image = new Image();
  image.decoding = "async";

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(decodeErrorMessage));
      image.src = objectUrl;
    });
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }

  return {
    width: image.naturalWidth,
    height: image.naturalHeight,
    draw: (context, width, height) => context.drawImage(image, 0, 0, width, height),
    close: () => URL.revokeObjectURL(objectUrl),
  };
}

async function encodeBrowserImage(
  image: DecodedStyleMatchImage,
  target: { width: number; height: number },
  type: typeof OUTPUT_TYPE,
  quality: number,
): Promise<Blob> {
  if (typeof document === "undefined") {
    throw new Error("Photo encoding is not available in this environment.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = target.width;
  canvas.height = target.height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Photo encoding could not start.");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  image.draw(context, target.width, target.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Photo encoding failed."));
        }
      },
      type,
      quality,
    );
  });
}

function inferTypeFromName(name: string): string | null {
  const lowerName = name.toLowerCase();
  if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) return "image/jpeg";
  if (lowerName.endsWith(".png")) return "image/png";
  if (lowerName.endsWith(".webp")) return "image/webp";
  if (lowerName.endsWith(".heic")) return "image/heic";
  if (lowerName.endsWith(".heif")) return "image/heif";
  return null;
}

function isHeicLike(file: File): boolean {
  const inferredType = (file.type || inferTypeFromName(file.name) || "").toLowerCase();
  return inferredType === "image/heic" || inferredType === "image/heif";
}

function replaceExtension(name: string, extension: string): string {
  const base = name.replace(/\.[a-z0-9]+$/i, "");
  return `${base}.${extension}`;
}

function formatDecodeError(file: File): string {
  const inferredType = (file.type || inferTypeFromName(file.name) || "").toLowerCase();
  if (inferredType === "image/heic" || inferredType === "image/heif") {
    return "HEIC is accepted, but this browser could not decode this file.";
  }
  return "The photo could not be decoded.";
}
