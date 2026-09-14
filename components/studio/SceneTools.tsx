"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, FileDown, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { UtilityEstimateCard } from "@/components/ui/UtilityEstimateCard";
import { useStudioEnhancements } from "@/lib/studio-enhancements-store";
import { generateAndDownloadCurrentFeasibilityReport } from "@/utils/export/generateFeasibilityReport";

/** Secondary scene actions share one disclosure; warnings stay outside it. */
export function SceneTools({ children, utilityMode, onUtilityModeChange }: {
  children: ReactNode;
  utilityMode: boolean;
  onUtilityModeChange: (active: boolean) => void;
}) {
  const { utilityEstimate } = useStudioEnhancements();
  const [exportState, setExportState] = useState<"idle" | "busy" | "error">("idle");

  async function exportSitePlan() {
    setExportState("busy");
    try {
      await generateAndDownloadCurrentFeasibilityReport();
      setExportState("idle");
    } catch {
      setExportState("error");
    }
  }

  return (
    <details className="group/tools shrink-0 border-t border-[#DADAD3] bg-[#F5F5F0] text-[#161616]"
      onToggle={(event) => { if (!event.currentTarget.open) onUtilityModeChange(false); }}>
      <summary className="flex min-h-11 cursor-pointer items-center justify-between px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#161616]">
        Tools
        <ChevronDown size={16} aria-hidden="true" className="group-open/tools:rotate-180" />
      </summary>
      <div className="max-h-[35vh] overflow-y-auto">
        {children}
        <div className="border-t border-[#DADAD3] px-3 py-2">
          <Button variant={utilityMode ? "selected" : "secondary"} size="sm" className="min-h-11"
            aria-pressed={utilityMode} onClick={() => onUtilityModeChange(!utilityMode)}
            leftIcon={<MapPin size={16} aria-hidden="true" />}>
            {utilityMode ? "Finish utility planning" : "Plan utilities"}
          </Button>
          {utilityMode && (
            <p className="mt-2 text-xs leading-5 text-[#65655F]">
              Click the primary house in the 3D model to place a utility tie-in pin and estimate trench length and site-work cost.
            </p>
          )}
        </div>
        {utilityMode && utilityEstimate && <UtilityEstimateCard distanceFt={utilityEstimate.distanceFt} />}
        <div className="border-t border-[#DADAD3] px-3 py-2">
          <Button variant="secondary" size="sm" className="min-h-11" disabled={exportState === "busy"}
            onClick={() => void exportSitePlan()} leftIcon={<FileDown size={16} aria-hidden="true" />}>
            {exportState === "busy" ? "Building site plan..." : "Export site plan PDF"}
          </Button>
          {exportState === "error" && <p role="alert" className="mt-2 text-xs text-[#A82D16]">Site plan export is unavailable until the 3D concept is loaded.</p>}
        </div>
      </div>
    </details>
  );
}
