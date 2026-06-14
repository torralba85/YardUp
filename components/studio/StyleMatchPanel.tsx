"use client";

import { useEffect, useRef, useState } from "react";
import {
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

export interface StyleMatchPanelProps {
  onConfirm?: (photo: PreparedStyleMatchPhoto) => void;
  preparePhoto?: typeof prepareStyleMatchPhoto;
}

type PanelStatus = "idle" | "preparing" | "preview" | "ready" | "error";

export default function StyleMatchPanel({
  onConfirm,
  preparePhoto = prepareStyleMatchPhoto,
}: StyleMatchPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [status, setStatus] = useState<PanelStatus>("idle");
  const [prepared, setPrepared] = useState<PreparedStyleMatchPhoto | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  async function handleFile(file: File | undefined) {
    if (!file) return;

    setStatus("preparing");
    setError(null);
    setPrepared(null);
    replacePreviewUrl(null);

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

  function handleConfirm() {
    if (!prepared) return;
    setStatus("ready");
    onConfirm?.(prepared);
  }

  function handleReset() {
    setStatus("idle");
    setPrepared(null);
    setError(null);
    replacePreviewUrl(null);
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
              className="flex min-h-24 cursor-pointer flex-col items-center justify-center border-[1.5px] border-dashed border-lf-clay bg-lf-card px-4 py-5 text-center transition hover:bg-lf-sand focus-within:outline-none focus-within:ring-2 focus-within:ring-lf-amber focus-within:ring-offset-2"
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
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 bg-lf-forest px-3 py-2 text-sm font-semibold text-lf-sand transition hover:bg-lf-espresso focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-amber focus-visible:ring-offset-2"
                >
                  <CheckCircle2 size={16} aria-hidden="true" />
                  Use this photo
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex min-h-11 items-center justify-center border border-lf-hairline bg-lf-card px-3 py-2 text-sm font-semibold text-lf-espresso transition hover:border-lf-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-amber focus-visible:ring-offset-2"
                  aria-label="Choose another photo"
                >
                  <RotateCcw size={16} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        )}

        {status === "error" && (
          <div className="space-y-3">
            <div className="border border-lf-brick bg-lf-brick-soft px-3 py-3">
              <div className="flex items-start gap-2 text-sm leading-6 text-lf-brick">
                <XCircle size={17} className="mt-1 shrink-0" aria-hidden="true" />
                <p>{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="w-full border border-lf-hairline bg-lf-card px-3 py-2 text-sm font-semibold text-lf-espresso transition hover:border-lf-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-amber focus-visible:ring-offset-2"
            >
              Choose another photo
            </button>
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
