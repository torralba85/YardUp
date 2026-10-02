"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Layers, RefreshCcw, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

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
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key === "Tab") {
        const focusable = getFocusableElements(dialogRef.current);
        if (focusable.length === 0) {
          event.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;

        if (event.shiftKey && active === first) {
          event.preventDefault();
          last.focus();
          return;
        }

        if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    return () => {
      previouslyFocused?.focus();
    };
  }, [isOpen]);

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
      ref={dialogRef}
      onClick={handleScrimClick}
      className="fixed inset-0 z-(--z-index-modal) flex items-center justify-center bg-lot-ink/90 p-4 md:p-8 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="board-title"
    >
      <div className="w-full max-w-5xl border-[1.5px] border-lot-ink bg-lot-chalk p-6 md:p-8 text-lot-ink relative font-sans shadow-none lf-stamp select-text">
        {/* Close Button */}
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-control border border-lot-line text-lot-stone motion-safe:transition hover:bg-lot-surface hover:text-lot-ink focus:outline-none focus:ring-2 focus:ring-lot-orange-ink"
          aria-label="Close dialog"
        >
          <X size={20} aria-hidden="true" />
        </button>

        {/* Header */}
        <header className="border-b-4 border-double border-lot-ink pb-4 mb-6 pr-8">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
            <h2 id="board-title" className="font-display text-2xl md:text-3xl font-medium">
              Your house → your ADU
            </h2>
            <div className="lf-kicker-dense font-semibold text-lot-stone md:text-xs">
              NO. {serialNo} · {finalDateStr}
            </div>
          </div>
        </header>

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
        <div className="bg-lot-surface border border-lot-line p-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
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

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mt-8 pt-6 border-t border-lot-line">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onToggleAttach}
              className={`flex min-h-11 items-center justify-center gap-2 px-5 py-2 text-sm font-semibold motion-safe:transition select-none rounded-control cursor-pointer focus:outline-none focus:ring-2 focus:ring-lot-orange-ink ${
                isAttached
                  ? "bg-status-eligible text-lot-chalk hover:bg-status-eligible-hover"
                  : "border-[1.5px] border-lot-orange bg-lot-chalk text-lot-ink hover:bg-lot-surface"
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
              className="flex min-h-11 items-center justify-center gap-2 border border-lot-line bg-lot-chalk px-5 py-2 text-sm font-semibold text-lot-ink motion-safe:transition hover:border-lot-orange hover:bg-lot-surface rounded-control cursor-pointer focus:outline-none focus:ring-2 focus:ring-lot-orange-ink"
            >
              <RefreshCcw size={16} aria-hidden="true" />
              Cast another
            </button>
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
      </div>
    </div>
  );
}

function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];

  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute("disabled") && element.tabIndex !== -1,
  );
}
