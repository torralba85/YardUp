"use client";

import { COLOR } from "@/lib/design-tokens";
import type { ADUConfig, Parcel } from "@/lib/feasibility";
import type { Pose2D } from "@/lib/scene-model";
import {
  getStudioEnhancementsSnapshot,
  type UtilityEstimate,
} from "@/lib/studio-enhancements-store";
import { drawSiteDimensions } from "@/utils/canvas/drawSiteDimensions";
import { evaluateCaliforniaAduRules } from "@/utils/rules/californiaAduRules";

export interface FeasibilityPdfInput {
  parcel: Parcel;
  config: ADUConfig;
  pose: Pose2D;
  utilityEstimate?: UtilityEstimate | null;
  snapshotDataUrl?: string | null;
}

function optionalApn(parcel: Parcel): string {
  const value = (parcel as Parcel & { apn?: unknown }).apn;
  return typeof value === "string" && value.trim() ? value.trim() : "Not available in parcel data";
}

function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const words = text.split(/\s+/);
  let line = "";
  let cursorY = y;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > maxWidth) {
      context.fillText(line, x, cursorY);
      cursorY += lineHeight;
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) context.fillText(line, x, cursorY);
  return cursorY + lineHeight;
}

function base64Bytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  parts.forEach((part) => {
    result.set(part, offset);
    offset += part.length;
  });
  return result;
}

/** Wrap a JPEG page image in a minimal one-page PDF without a backend or PDF dependency. */
function jpegPagePdf(jpegDataUrl: string, width: number, height: number): Blob {
  const encoder = new TextEncoder();
  const jpeg = base64Bytes(jpegDataUrl);
  const objects: Uint8Array[] = [];
  const text = (value: string) => encoder.encode(value);
  objects.push(text("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"));
  objects.push(text("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"));
  objects.push(text("3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n"));
  objects.push(concatBytes([
    text(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`),
    jpeg,
    text("\nendstream\nendobj\n"),
  ]));
  const content = text("q\n612 0 0 792 0 0 cm\n/Im0 Do\nQ\n");
  objects.push(concatBytes([
    text(`5 0 obj\n<< /Length ${content.length} >>\nstream\n`),
    content,
    text("endstream\nendobj\n"),
  ]));

  const header = text("%PDF-1.4\n%LF01\n");
  const offsets: number[] = [0];
  let cursor = header.length;
  for (const object of objects) {
    offsets.push(cursor);
    cursor += object.length;
  }
  const xrefOffset = cursor;
  const xref = ["xref", "0 6", "0000000000 65535 f "];
  for (let i = 1; i <= 5; i += 1) {
    xref.push(`${String(offsets[i]).padStart(10, "0")} 00000 n `);
  }
  const trailer = `${xref.join("\n")}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  const pdfBytes = concatBytes([header, ...objects, text(trailer)]);
  const pdfBuffer = new ArrayBuffer(pdfBytes.byteLength);
  new Uint8Array(pdfBuffer).set(pdfBytes);
  return new Blob([pdfBuffer], { type: "application/pdf" });
}

/** Generate the sprint-plan one-page preliminary site-plan and feasibility PDF. */
export async function generateFeasibilityReport({
  parcel,
  config,
  pose,
  utilityEstimate = null,
  snapshotDataUrl = null,
}: FeasibilityPdfInput): Promise<Blob> {
  const sitePlan = await drawSiteDimensions({ parcel, config, pose, snapshotDataUrl });
  const page = document.createElement("canvas");
  page.width = 1275;
  page.height = 1650;
  const context = page.getContext("2d");
  if (!context) throw new Error("Canvas 2D context is unavailable for feasibility PDF export.");

  context.fillStyle = COLOR["lot-chalk"];
  context.fillRect(0, 0, page.width, page.height);
  context.fillStyle = COLOR["lot-ink"];
  context.font = "700 25px Manrope, Arial, sans-serif";
  context.fillText("LOTFOUNDRY", 62, 70);
  context.font = "600 52px Space Grotesk, Arial, sans-serif";
  context.fillText("Preliminary Site Plan & Feasibility", 62, 132);
  context.font = "500 22px Manrope, Arial, sans-serif";
  context.fillStyle = COLOR["lot-stone"];
  context.fillText(`${parcel.address}, ${parcel.city}`, 62, 172);
  context.strokeStyle = COLOR["lot-ink"];
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(62, 198);
  context.lineTo(1213, 198);
  context.stroke();

  const boxX = 62;
  const boxY = 228;
  const boxW = 1151;
  const boxH = 810;
  context.fillStyle = COLOR["lot-print-paper"];
  context.fillRect(boxX, boxY, boxW, boxH);
  context.strokeStyle = COLOR["lot-line"];
  context.lineWidth = 2;
  context.strokeRect(boxX, boxY, boxW, boxH);
  const scale = Math.min(boxW / sitePlan.width, boxH / sitePlan.height);
  const drawW = sitePlan.width * scale;
  const drawH = sitePlan.height * scale;
  context.drawImage(sitePlan, boxX + (boxW - drawW) / 2, boxY + (boxH - drawH) / 2, drawW, drawH);

  const left = 62;
  const right = 660;
  let y = 1090;
  context.fillStyle = COLOR["lot-ink"];
  context.font = "700 18px Manrope, Arial, sans-serif";
  context.fillText("PROPERTY", left, y);
  context.fillText("CURRENT CONCEPT", right, y);
  y += 34;
  context.font = "500 19px Manrope, Arial, sans-serif";
  context.fillText(`APN: ${optionalApn(parcel)}`, left, y);
  context.fillText(`ADU: ${config.footprint.toLocaleString()} sf`, right, y);
  y += 31;
  context.fillText(`Lot: ${parcel.lotArea.toLocaleString()} sf`, left, y);
  context.fillText(`Dimensions: ${config.width} x ${config.length} ft`, right, y);
  y += 31;
  context.fillText(`Lot dimensions: ${parcel.lotWidth} x ${parcel.lotLength} ft`, left, y);
  context.fillText(`Wall height: ${config.height} ft`, right, y);
  y += 54;

  context.font = "700 18px Manrope, Arial, sans-serif";
  context.fillText("SITE METRICS", left, y);
  context.fillText("UTILITY RUN", right, y);
  y += 34;
  context.font = "500 19px Manrope, Arial, sans-serif";
  context.fillText(
    `Setbacks: ${parcel.setbacks.side} ft side / ${parcel.setbacks.rear} ft rear / ${parcel.setbacks.front} ft front`,
    left,
    y,
  );
  context.fillText(
    utilityEstimate ? `${utilityEstimate.distanceFt.toFixed(1)} linear ft` : "Tie-in point not selected",
    right,
    y,
  );
  y += 31;
  const placement = getStudioEnhancementsSnapshot().placement;
  context.fillText(
    placement?.houseClearanceFt !== null && placement?.houseClearanceFt !== undefined
      ? `Building separation: ${Math.max(placement.houseClearanceFt, 0).toFixed(1)} ft modeled`
      : "Building separation: verify on survey",
    left,
    y,
  );
  context.fillText(
    utilityEstimate ? `${money(utilityEstimate.lowCost)}-${money(utilityEstimate.highCost)} site-work allowance` : "$65-$120 / linear ft planning factor",
    right,
    y,
  );

  y += 65;
  context.strokeStyle = COLOR["lot-line"];
  context.beginPath();
  context.moveTo(62, y - 28);
  context.lineTo(1213, y - 28);
  context.stroke();
  context.fillStyle = COLOR["lot-ink"];
  context.font = "700 18px Manrope, Arial, sans-serif";
  context.fillText("BASELINE RULES & LIMITATIONS", 62, y);
  y += 31;
  context.font = "500 17px Manrope, Arial, sans-serif";
  context.fillStyle = COLOR["lot-stone"];
  const ca = evaluateCaliforniaAduRules({ parcel, config });
  const rules = ca.applicable
    ? "California baseline screen references Gov Code § 65852.2, including the four-foot side/rear setback baseline and the 800 sf statewide-exemption footprint screen. Transit proximity was not independently verified."
    : "This parcel is outside the California baseline screen. Confirm local setbacks, zoning, utilities, access, and state requirements with the applicable jurisdiction.";
  y = wrapText(context, rules, 62, y, 1151, 25);
  y += 8;
  context.fillStyle = COLOR["lot-ink"];
  context.font = "600 16px Manrope, Arial, sans-serif";
  wrapText(
    context,
    "Preliminary planning document only. This is not a survey, permit approval, legal opinion, utility design, construction estimate, or guarantee of eligibility.",
    62,
    y,
    1151,
    24,
  );

  const jpeg = page.toDataURL("image/jpeg", 0.92);
  return jpegPagePdf(jpeg, page.width, page.height);
}

export async function generateAndDownloadCurrentFeasibilityReport(): Promise<void> {
  const current = getStudioEnhancementsSnapshot();
  if (!current.parcel || !current.config || !current.pose) {
    throw new Error("Load a parcel and ADU concept before exporting the site plan.");
  }
  const snapshotDataUrl = current.sitePlanCapture
    ? await current.sitePlanCapture().catch(() => null)
    : null;
  const pdf = await generateFeasibilityReport({
    parcel: current.parcel,
    config: current.config,
    pose: current.pose,
    utilityEstimate: current.utilityEstimate,
    snapshotDataUrl,
  });
  const slug = current.parcel.address.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "site-plan";
  const url = URL.createObjectURL(pdf);
  const link = document.createElement("a");
  link.href = url;
  link.download = `lotfoundry-${slug}-site-plan.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}