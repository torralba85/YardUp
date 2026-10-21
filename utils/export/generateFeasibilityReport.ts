import { getStudioEnhancementsSnapshot } from "@/lib/studio-enhancements-store";
import { calculateFeasibility, defaultFinancialAssumptions } from "@/lib/feasibility";
import { buildReportText, downloadBlob, makeCertificateSerial } from "@/lib/report";

/**
 * Captures the current 3D site plan and downloads the feasibility report as a formatted document.
 */
export async function generateAndDownloadCurrentFeasibilityReport(): Promise<void> {
  const snapshot = getStudioEnhancementsSnapshot();

  if (!snapshot.parcel || !snapshot.config || !snapshot.sitePlanCapture) {
    throw new Error("No canvas or concept loaded");
  }

  // Await the orthographic site plan image
  const sitePlanDataUrl = await snapshot.sitePlanCapture();
  if (!sitePlanDataUrl) {
    throw new Error("Failed to capture site plan view");
  }

  const result = calculateFeasibility(snapshot.parcel, snapshot.config, defaultFinancialAssumptions);
  const reportText = buildReportText({
    parcel: snapshot.parcel,
    config: snapshot.config,
    result,
    recordedAt: new Date(),
  });

  const serial = makeCertificateSerial(snapshot.parcel);
  const cleanAddress = snapshot.parcel.address.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const filename = `feasibility-report-${cleanAddress}-${serial}.txt`;

  downloadBlob(filename, reportText, "text/plain");
}
