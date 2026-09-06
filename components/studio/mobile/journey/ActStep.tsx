"use client";

import type { ReactNode } from "react";
import { Bookmark, Share2, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Props for {@link ActStep}. */
export interface ActStepProps {
  /** "Address, City" line under the completion heading. */
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
  /** Open the connect-with-builders flow. */
  onConnectBuilders: () => void;
}

/**
 * Reveal 5 · Act — completion. Celebrates the finished study with the
 * feasibility certificate as the artifact, then offers exactly two next
 * actions: save/share the scenario, or connect with matched builders. The
 * visual language stays restrained — a settle, not a confetti cannon.
 */
export default function ActStep({
  parcelName,
  certificate,
  onSaveScenario,
  savingScenario,
  saveNotice,
  onShare,
  shareNotice,
  onConnectBuilders,
}: ActStepProps) {
  return (
    <section
      aria-label="Your study is complete"
      className="flex min-h-full flex-col"
      style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="border-b border-lf-hairline bg-lf-sand-2 px-5 pb-6 pt-7">
        <p className="lf-kicker flex items-center gap-1.5 text-lf-forest">
          <Sparkles size={13} aria-hidden="true" />
          Step 5 · Act
        </p>
        <h1 className="mt-2 font-display text-[clamp(1.65rem,7vw,1.95rem)] font-semibold leading-[1.1] text-balance text-lf-espresso">
          Your feasibility study is ready.
        </h1>
        <p className="mt-1 font-sans text-[11px] text-lf-muted">{parcelName}</p>

        <div className="mt-5 flex flex-col gap-2.5">
          <Button
            type="button"
            variant="commit"
            size="lg"
            fullWidth
            leftIcon={<Users size={16} />}
            onClick={onConnectBuilders}
          >
            Connect with matched builders
          </Button>
          <div className="flex gap-2.5">
            <Button
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              leftIcon={<Bookmark size={15} />}
              loading={savingScenario}
              onClick={onSaveScenario}
            >
              {saveNotice ?? "Save scenario"}
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
        </div>
      </div>

      {/* The completion artifact: the certificate, with its own unlock flow. */}
      <div className="flex-1">{certificate}</div>
    </section>
  );
}
