"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ImagePlus,
  Loader2,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import {
  prepareStyleMatchPhoto,
  STYLE_MATCH_ACCEPT,
  type PreparedStyleMatchPhoto,
} from "@/lib/style-match-photo";

/** Props for {@link StyleMatchPanel}. */
export interface StyleMatchPanelProps {
  /** Called with the prepared photo once the user confirms their upload. */
  onConfirm?: (photo: PreparedStyleMatchPhoto) => void;
  /** Called when concept generation finishes, with the synthesized result. */
  onGenerationComplete?: (concept: {
    photoUrl: string;
    conceptUrl: string;
    styleName: string;
    matchPercentage: number;
    traits: string[];
  }) => void;
  /** Injectable photo-preparation function (overridden in tests). */
  preparePhoto?: typeof prepareStyleMatchPhoto;
}

type PanelStatus = "idle" | "preparing" | "preview" | "generating" | "ready" | "error" | "timeout";

const GENERATING_STEPS = [
  "Reading materials & roofline",
  "Matching siding + trim palette",
  "Casting 2BD/1BA DADU concept",
];

const showDeveloperTestControls = process.env.NODE_ENV !== "production";

const getStepState = (index: number, progress: number): "completed" | "current" | "pending" => {
  if (index === 0) {
    return progress >= 30 ? "completed" : "current";
  }
  if (index === 1) {
    if (progress < 30) return "pending";
    return progress >= 60 ? "completed" : "current";
  }
  if (index === 2) {
    if (progress < 60) return "pending";
    return progress >= 100 ? "completed" : "current";
  }
  return "pending";
};

/**
 * Photo uploader for the AI style-match flow: accepts a reference photo,
 * prepares it client-side (downscale, JPEG re-encode, metadata strip) via
 * {@link prepareStyleMatchPhoto}, validates it, and drives concept generation,
 * surfacing progress and any errors.
 *
 * @param props - The {@link StyleMatchPanelProps}.
 */
export default function StyleMatchPanel({
  onConfirm,
  onGenerationComplete,
  preparePhoto = prepareStyleMatchPhoto,
}: StyleMatchPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onGenerationCompleteRef = useRef(onGenerationComplete);

  const [status, setStatus] = useState<PanelStatus>("idle");
  const [prepared, setPrepared] = useState<PreparedStyleMatchPhoto | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatingProgress, setGeneratingProgress] = useState(0);

  useEffect(() => {
    onGenerationCompleteRef.current = onGenerationComplete;
  }, [onGenerationComplete]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function handleFile(file: File | undefined) {
    if (!file) return;

    setStatus("preparing");
    setError(null);
    setPrepared(null);
    replacePreviewUrl(null);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    try {
      const next = await preparePhoto(file);
      const nextPreviewUrl = URL.createObjectURL(next.blob);
      setPrepared(next);
      replacePreviewUrl(nextPreviewUrl);
      setStatus("preview");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Photo preparation failed.");
      setStatus("error");
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function triggerSuccess() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setStatus("ready");
    const currentPreviewUrl = previewUrlRef.current;
    if (currentPreviewUrl) {
      // TODO: Replace this deterministic fixture with the real style-match API response.
      onGenerationCompleteRef.current?.({
        photoUrl: currentPreviewUrl,
        conceptUrl: "/inspiration/clean-gable.png",
        styleName: "Craftsman",
        matchPercentage: 91,
        traits: ["Cedar lap siding", "Low-pitch gable", "White trim", "Espresso door"],
      });
    }
  }

  function triggerError() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setError("We couldn't read enough of the house from this photo. Try a daylight shot.");
    setStatus("error");
  }

  function triggerTimeout() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setError("Casting timed out (>90s). Try again or check connection.");
    setStatus("timeout");
  }

  function startGeneration() {
    if (!prepared || !previewUrlRef.current) return;
    setStatus("generating");
    setError(null);
    setGeneratingProgress(0);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    let progress = 0;
    timerRef.current = setInterval(() => {
      progress += 5;
      const nextProgress = Math.min(progress, 100);
      setGeneratingProgress(nextProgress);

      if (nextProgress >= 100) {
        triggerSuccess();
      }
    }, 500);
  }

  function handleConfirm() {
    if (!prepared || !previewUrlRef.current) return;
    onConfirm?.(prepared);
    startGeneration();
  }

  function handleReset() {
    setStatus("idle");
    setPrepared(null);
    setError(null);
    replacePreviewUrl(null);
    setGeneratingProgress(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  function replacePreviewUrl(nextUrl: string | null) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = nextUrl;
    setPreviewUrl(nextUrl);
  }

  const inputId = "style-match-photo-input";

  return (
    <div className="border-[1.5px] border-lf-espresso bg-lf-sand-2">
      <div className="border-b-4 border-double border-lf-espresso px-4 py-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-lf-clay">
              Your house / your ADU
            </p>
            <h3 className="mt-1 font-display text-xl font-semibold leading-tight text-lf-espresso">
              Style-match photo
            </h3>
          </div>
          <div className="flex h-10 w-10 items-center justify-center border border-lf-espresso bg-lf-card text-lf-espresso">
            <Camera size={18} aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {status === "idle" && (
          <div className="space-y-4">
            <div className="border border-lf-hairline bg-lf-card px-3 py-3">
              <div className="flex items-start gap-2.5 text-sm leading-6 text-lf-muted">
                <ShieldCheck size={17} className="mt-1 shrink-0 text-lf-forest" aria-hidden="true" />
                <p>Used only to match your ADU&apos;s style. Never shown to builders.</p>
              </div>
            </div>
            <label
              htmlFor={inputId}
              className="flex min-h-24 cursor-pointer flex-col items-center justify-center border-[1.5px] border-dashed border-lf-clay bg-lf-card px-4 py-5 text-center transition hover:bg-lf-sand focus-within:outline-none focus-within:ring-2 focus-within:ring-lf-clay focus-within:ring-offset-2"
            >
              <ImagePlus size={22} className="text-lf-clay" aria-hidden="true" />
              <span className="mt-2 text-sm font-semibold text-lf-espresso">
                Choose house photo
              </span>
              <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-lf-muted">
                JPG PNG WEBP HEIC
              </span>
            </label>
          </div>
        )}

        {status === "preparing" && (
          <div className="flex min-h-32 items-center justify-center border border-lf-hairline bg-lf-card px-4 py-6 text-lf-espresso">
            <Loader2
              size={20}
              className="mr-2 animate-spin text-lf-clay motion-reduce:animate-none"
              aria-hidden="true"
            />
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em]">
              Preparing photo
            </span>
          </div>
        )}

        {status === "generating" && (
          <div className="flex flex-col min-h-32 border border-lf-hairline bg-lf-card p-4 text-lf-espresso">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-lf-muted mb-3">
              <span>Casting concept…</span>
            </div>
            
            <div className="relative aspect-[4/3] w-full border border-lf-hairline overflow-hidden mb-3">
              {previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Uploading house" className="h-full w-full object-cover opacity-60" />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-lf-espresso/10">
                <Loader2 className="animate-spin text-lf-clay" size={24} />
              </div>
            </div>

            <div className="space-y-2 border-t border-dashed border-lf-hairline pt-3">
              {GENERATING_STEPS.map((stepText, idx) => {
                const state = getStepState(idx, generatingProgress);
                let icon = null;
                let textColor = "text-lf-muted";
                
                if (state === "completed") {
                  icon = <CheckCircle2 size={16} className="text-lf-forest shrink-0" aria-hidden="true" />;
                  textColor = "text-lf-forest font-semibold";
                } else if (state === "current") {
                  icon = <Loader2 size={16} className="animate-spin text-lf-clay shrink-0" aria-hidden="true" />;
                  textColor = "text-lf-espresso font-semibold";
                } else {
                  icon = (
                    <div className="h-4 w-4 rounded-full border border-lf-hairline flex items-center justify-center shrink-0" aria-hidden="true">
                      <div className="h-1.5 w-1.5 rounded-full bg-lf-muted" />
                    </div>
                  );
                  textColor = "text-lf-muted";
                }

                return (
                  <div key={idx} className={`flex items-center gap-2.5 text-[11px] font-mono leading-none ${textColor}`}>
                    {icon}
                    <span>{stepText}</span>
                  </div>
                );
              })}
            </div>

            <div className="h-1.5 w-full bg-lf-taupe-soft mt-4 overflow-hidden rounded-full">
              <div className="h-full bg-lf-clay transition-all duration-300 animate-pulse" style={{ width: `${generatingProgress}%` }} />
            </div>

            <p className="mt-3 text-[11px] text-lf-muted leading-normal">
              Usually under a minute. You can keep adjusting the plan — we will settle it into the gallery when it is ready.
            </p>

            {showDeveloperTestControls && (
              <div className="mt-4 border border-dashed border-lf-hairline p-2 flex flex-col gap-1.5 bg-lf-sand-2">
                <div className="font-mono text-[9px] uppercase text-lf-clay text-center font-bold">
                  Dev Test Controls
                </div>
                <div className="flex gap-1 justify-center">
                  <button
                    type="button"
                    onClick={triggerSuccess}
                    className="bg-lf-forest text-lf-sand text-[9px] font-mono font-semibold px-2 py-1 cursor-pointer"
                  >
                    [Success]
                  </button>
                  <button
                    type="button"
                    onClick={triggerError}
                    className="bg-lf-brick text-lf-sand text-[9px] font-mono font-semibold px-2 py-1 cursor-pointer"
                  >
                    [Error]
                  </button>
                  <button
                    type="button"
                    onClick={triggerTimeout}
                    className="bg-lf-amber text-lf-espresso text-[9px] font-mono font-semibold px-2 py-1 cursor-pointer"
                  >
                    [Timeout]
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {(status === "preview" || status === "ready") && prepared && previewUrl && (
          <div className="space-y-4">
            <div className="overflow-hidden border border-lf-hairline bg-lf-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Prepared house photo preview"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>

            <dl className="grid grid-cols-2 gap-px overflow-hidden border border-lf-hairline bg-lf-hairline text-[11px]">
              <PhotoFact label="Output" value="JPEG" />
              <PhotoFact label="Max edge" value={`${Math.max(prepared.width, prepared.height)} px`} />
              <PhotoFact
                label="Downscale"
                value={prepared.wasDownscaled ? "Applied" : "Native"}
              />
              <PhotoFact label="EXIF" value={prepared.strippedMetadata ? "Stripped" : "Kept"} />
            </dl>

            {status === "ready" ? (
              <div className="lf-stamp border-[1.5px] border-lf-forest bg-lf-forest-soft px-3 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-lf-forest">
                  <CheckCircle2 size={17} aria-hidden="true" />
                  Photo sealed for style match.
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 bg-lf-forest px-3 py-2 text-sm font-semibold text-lf-sand transition hover:bg-lf-espresso focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2 cursor-pointer"
                >
                  <CheckCircle2 size={16} aria-hidden="true" />
                  Use this photo
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex min-h-11 items-center justify-center border border-lf-hairline bg-lf-card px-3 py-2 text-sm font-semibold text-lf-espresso transition hover:border-lf-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2 cursor-pointer"
                  aria-label="Choose another photo"
                >
                  <RotateCcw size={16} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        )}

        {(status === "error" || status === "timeout") && (
          <div className="space-y-3">
            <div
              className={`border px-3 py-3 ${
                status === "error"
                  ? "border-lf-brick bg-lf-brick-soft text-lf-brick"
                  : "border-lf-amber-ink/40 bg-lf-amber-soft text-lf-amber-ink"
              }`}
            >
              <div className="flex items-start gap-2 text-sm leading-6">
                {status === "error" ? (
                  <XCircle size={17} className="mt-1 shrink-0" aria-hidden="true" />
                ) : (
                  <AlertTriangle size={17} className="mt-1 shrink-0" aria-hidden="true" />
                )}
                <p>{error}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={startGeneration}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 bg-lf-clay px-3 py-2 text-sm font-semibold text-lf-sand transition hover:bg-lf-clay-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2 cursor-pointer"
              >
                <RotateCcw size={16} aria-hidden="true" />
                Retry
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="flex min-h-11 flex-1 items-center justify-center border border-lf-hairline bg-lf-card px-3 py-2 text-sm font-semibold text-lf-espresso transition hover:border-lf-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2 cursor-pointer"
              >
                Choose another photo
              </button>
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={STYLE_MATCH_ACCEPT}
          className="sr-only"
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
      </div>
    </div>
  );
}

function PhotoFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-lf-card px-3 py-2">
      <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-lf-muted">
        {label}
      </dt>
      <dd className="mt-0.5 font-mono font-semibold uppercase tracking-[0.08em] text-lf-espresso">
        {value}
      </dd>
    </div>
  );
}
