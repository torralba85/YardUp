"use client";

import type { ReactNode } from "react";
import { ArrowRight, Bookmark, Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Props for {@link ActStep}. */
export interface ActStepProps {
  /** "Address, City" line under the heading. */
  parcelName: string;
  /** The certificate artifact (CertificatePanel with its own unlock flow). */
  certificate: ReactNode;
  /** Save the current scenario. */
  onSaveScenario: () => void;
  /** Whether a save is in flight. */
  savingScenario: boolean;
  /** Transient save feedback ("Saved", "Sign in to save"). */
  saveNotice: string | null;
  /** Copy the shareable scenario link. */
  onShare: () => void;
  /** Transient share feedback ("Link copied"). */
  shareNotice: string | null;
  /** Move on to the Builders step. */
  onContinue: () => void;
}

/**
 * Reveal 4 · Certificate. The certificate panel owns the one primary action
 * here (buy, or open it once bought), so save/share stay secondary and the way
 * on to Builders sits after it, as step 5 does on desktop. Before 2026-11-27 a
 * "Connect with matched builders" button sat above the price and competed
 * with it.
 */
export default function ActStep({
  parcelName,
  certificate,
  onSaveScenario,
  savingScenario,
  saveNotice,
  onShare,
  shareNotice,
  onContinue,
}: ActStepProps) {
  return (
    <section
      aria-label="Your Certificate"
      className="flex min-h-full flex-col"
      style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="border-b border-lot-line bg-lot-surface px-5 pb-5 pt-7">
        <p className="lf-kicker text-lot-orange-ink">Step 4 · Certificate</p>
        <p className="mt-1 font-sans text-xs text-lot-stone">{parcelName}</p>
        <div className="mt-4 flex gap-2.5">
          <Button
            type="button"
            variant="secondary"
            size="md"
            fullWidth
            leftIcon={<Bookmark size={15} />}
            loading={savingScenario}
            onClick={onSaveScenario}
          >
            {saveNotice ?? (savingScenario ? "Saving…" : "Save scenario")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="md"
            fullWidth
            leftIcon={<Share2 size={15} />}
            onClick={onShare}
          >
            {shareNotice ?? "Share link"}
          </Button>
        </div>
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {saveNotice && <span>Save status: {saveNotice}</span>}
          {shareNotice && <span>Share status: {shareNotice}</span>}
        </div>
      </div>

      <div className="flex-1">{certificate}</div>

      <div className="px-5 pt-2">
        <Button
          type="button"
          variant="commit"
          size="lg"
          fullWidth
          rightIcon={<ArrowRight size={16} />}
          onClick={onContinue}
        >
          Next: connect with builders
        </Button>
      </div>
    </section>
  );
}
