"use client";

import { useEffect, useState } from "react";
import { Check, Layers, RefreshCcw, X, XCircle } from "lucide-react";

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

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setMountedDateStr(new Date().toISOString().split("T")[0] + " UTC");
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!isOpen) return null;

  const handleScrimClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const finalDateStr = dateStr || mountedDateStr;

  return (
    <div
      onClick={handleScrimClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-lf-espresso/90 p-4 md:p-8 overflow-y-auto backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="board-title"
    >
      <div className="w-full max-w-5xl border-[1.5px] border-lf-espresso bg-lf-card p-6 md:p-8 text-lf-espresso relative font-sans shadow-2xl lf-stamp select-text">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-none p-1.5 text-lf-muted hover:bg-lf-sand-2 hover:text-lf-espresso transition-colors focus:outline-none focus:ring-2 focus:ring-lf-clay"
          aria-label="Close dialog"
        >
          <X size={20} aria-hidden="true" />
        </button>

        {/* Header */}
        <header className="border-b-4 border-double border-lf-espresso pb-4 mb-6 pr-8">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
            <h2 id="board-title" className="font-display text-2xl md:text-3xl font-semibold">
              Your house → your ADU
            </h2>
            <div className="font-mono text-[10px] md:text-xs font-semibold uppercase tracking-[0.14em] text-lf-muted">
              NO. {serialNo} · {finalDateStr}
            </div>
          </div>
        </header>

        {/* Stage Grid */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-4 md:gap-6 mb-6">
          {/* Left Pane: Before */}
          <div className="flex flex-col gap-2">
            <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-lf-muted">
              Before — your photo
            </h3>
            <div className="relative aspect-[4/3] w-full overflow-hidden border border-lf-hairline bg-lf-sand-2">
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
            <span className="text-3xl md:text-4xl text-lf-clay font-light" aria-hidden="true">
              →
            </span>
          </div>

          {/* Right Pane: After */}
          <div className="flex flex-col gap-2 relative">
            <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-lf-muted">
              After — ADU concept, matched style
            </h3>
            <div className="relative aspect-[4/3] w-full overflow-hidden border border-lf-hairline bg-lf-sand-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={afterConceptUrl}
                alt="Generated style-matched ADU concept"
                className="h-full w-full object-cover"
              />
              {/* Rotated Concept Stamp */}
              <div
                className="absolute right-4 bottom-4 border-2 border-lf-brick text-lf-brick bg-lf-card/95 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] opacity-90 select-none shadow-sm"
                style={{ transform: "rotate(5deg)" }}
              >
                Concept · not a permit
              </div>
            </div>
          </div>
        </div>

        {/* Metadata Bar */}
        <div className="bg-lf-sand-2 border border-lf-hairline p-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-lf-clay">
              {`STYLE MATCH ${styleName} · ${matchPercentage}%`.toUpperCase()}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {styleTraits.map((trait) => (
                <span
                  key={trait}
                  className="bg-lf-card border border-lf-hairline px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-[0.08em] text-lf-muted"
                >
                  {trait.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
          {lotSizeInfo && (
            <div className="flex flex-col items-start md:items-end justify-center font-mono text-xs text-lf-muted">
              <span className="text-[10px] uppercase tracking-[0.14em] text-lf-muted/70">
                Lot info
              </span>
              <span className="font-semibold text-lf-espresso uppercase mt-0.5 tracking-[0.08em]">
                {lotSizeInfo.toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mt-8 pt-6 border-t border-lf-hairline">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onToggleAttach}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold transition select-none rounded-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-lf-clay ${
                isAttached
                  ? "bg-lf-forest text-lf-sand hover:bg-lf-espresso"
                  : "border-[1.5px] border-lf-espresso bg-lf-card text-lf-espresso hover:bg-lf-sand-2"
              }`}
            >
              {isAttached ? (
                <>
                  <Check size={16} aria-hidden="true" />
                  Applied
                </>
              ) : (
                <>
                  <Layers size={16} aria-hidden="true" />
                  Add to certificate
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onRecast}
              className="flex items-center justify-center gap-2 border border-lf-hairline bg-lf-card px-5 py-2.5 text-sm font-semibold text-lf-espresso transition hover:border-lf-clay hover:bg-lf-sand-2 rounded-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-lf-clay"
            >
              <RefreshCcw size={16} aria-hidden="true" />
              Cast another
            </button>
          </div>
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center justify-center gap-2 border border-lf-brick bg-lf-card px-5 py-2.5 text-sm font-semibold text-lf-brick transition hover:bg-lf-brick-soft rounded-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-lf-brick"
          >
            <XCircle size={16} aria-hidden="true" />
            Delete photo & renders
          </button>
        </div>
      </div>
    </div>
  );
}
