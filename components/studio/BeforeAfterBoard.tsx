"use client";

import { useEffect, useState } from "react";
import { Check, Layers, RefreshCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

/** Props for {@link BeforeAfterBoard}. */
export interface BeforeAfterBoardProps {
  /** Whether the board is shown. */
  isOpen: boolean;
  /** Called to dismiss the board. */
  onClose: () => void;
  /** URL of the user's original "before" photo. */
  beforePhotoUrl: string;
  /** URL of the generated "after" concept image. */
  afterConceptUrl: string;
  /** Name of the matched architectural style. */
  styleName: string;
  /** Match confidence as a percentage. */
  matchPercentage: number;
  /** Notable matched design traits. */
  styleTraits: string[];
  /** Optional lot-size context line. */
  lotSizeInfo?: string;
  /** Whether the concept is rendered as an attached unit. */
  isAttached: boolean;
  /** Toggles attached vs. detached rendering. */
  onToggleAttach: () => void;
  /** Re-runs (recasts) the concept generation. */
  onRecast: () => void;
  /** Deletes this concept. */
  onDelete: () => void;
  /** Optional certificate-style serial number. */
  serialNo?: string;
  /** Optional formatted date string. */
  dateStr?: string;
}

/**
 * Side-by-side "before / after" comparison board for an AI style-matched
 * concept: the user's photo against the generated concept, with style name,
 * match percentage, traits, and controls to toggle attached/detached, recast,
 * or delete the concept.
 *
 * @param props - The {@link BeforeAfterBoardProps}.
 */
export default function BeforeAfterBoard({
  isOpen,
  onClose,
  beforePhotoUrl,
  afterConceptUrl,
  styleName,
  matchPercentage,
  styleTraits,
  lotSizeInfo,
  isAttached,
  onToggleAttach,
  onRecast,
  onDelete,
  serialNo = "SM-E8D2C9",
  dateStr,
}: BeforeAfterBoardProps) {
  const [mountedDateStr, setMountedDateStr] = useState("");
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setMountedDateStr(new Date().toISOString().split("T")[0] + " UTC");
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!isOpen) return null;

  const finalDateStr = dateStr || mountedDateStr;

  return (
    <Dialog
      title="Your house → your ADU"
      kicker={`No. ${serialNo} · ${finalDateStr}`}
      onClose={onClose}
      closeLabel="Close dialog"
      titleId="board-title"
      size="xl"
      bodyClassName="select-text"
      footer={
        <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant={isAttached ? "selected" : "secondary"}
              size="sm"
              onClick={onToggleAttach}
              leftIcon={
                isAttached ? (
                  <Check size={16} aria-hidden="true" />
                ) : (
                  <Layers size={16} aria-hidden="true" />
                )
              }
            >
              {isAttached ? "Applied" : "Add to certificate"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onRecast}
              leftIcon={<RefreshCcw size={16} aria-hidden="true" />}
            >
              Cast another
            </Button>
          </div>
          <Button
            type="button"
            variant="destructive"
            size="md"
            onClick={onDelete}
            leftIcon={<XCircle size={16} />}
          >
            Delete photo & renders
          </Button>
        </div>
      }
    >
      {/* Stage Grid */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-4 md:gap-6 mb-6">
        {/* Left Pane: Before */}
        <div className="flex flex-col gap-2">
          <h3 className="lf-kicker text-lot-stone">
            Before — your photo
          </h3>
          <div className="relative aspect-[4/3] w-full overflow-hidden border border-lot-line bg-lot-surface">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={beforePhotoUrl}
              alt="Original house before photo"
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        {/* Middle Spine */}
        <div className="flex items-center justify-center py-2 md:py-0 select-none">
          <span className="text-3xl md:text-4xl text-lot-orange-ink font-light" aria-hidden="true">
            →
          </span>
        </div>

        {/* Right Pane: After */}
        <div className="flex flex-col gap-2 relative">
          <h3 className="lf-kicker text-lot-stone">
            After — ADU concept, matched style
          </h3>
          <div className="relative aspect-[4/3] w-full overflow-hidden border border-lot-line bg-lot-surface">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={afterConceptUrl}
              alt="Generated style-matched ADU concept"
              className="h-full w-full object-cover"
            />
            {/* Rotated Concept Stamp */}
            <div
              className="absolute right-4 bottom-4 border-2 border-status-blocked text-status-blocked bg-lot-chalk px-3 py-1.5 lf-kicker-dense font-bold opacity-90 select-none shadow-none"
              style={{ transform: "rotate(5deg)" }}
            >
              Concept · not a permit
            </div>
          </div>
        </div>
      </div>

      {/* Metadata Bar */}
      <div className="bg-lot-surface border border-lot-line p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="font-sans text-xs font-bold uppercase tracking-[0.08em] text-lot-orange-ink">
            {`STYLE MATCH ${styleName} · ${matchPercentage}%`.toUpperCase()}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {styleTraits.map((trait) => (
              <span
                key={trait}
                className="bg-lot-chalk border border-lot-line px-2 py-0.5 lf-kicker-dense text-lot-stone"
              >
                {trait.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
        {lotSizeInfo && (
          <div className="flex flex-col items-start md:items-end justify-center font-sans text-xs text-lot-stone">
            <span className="text-[10px] uppercase tracking-[0.08em] text-lot-stone/70">
              Lot info
            </span>
            <span className="font-semibold text-lot-ink uppercase mt-0.5 tracking-[0.08em]">
              {lotSizeInfo.toUpperCase()}
            </span>
          </div>
        )}
      </div>
    </Dialog>
  );
}
