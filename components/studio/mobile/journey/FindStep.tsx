"use client";

import { useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { parcelPresets } from "@/lib/feasibility";
import { useRadioGroup } from "@/components/ui/useRadioGroup";
import AddressSearch, { type AddressSearchResult } from "@/components/studio/AddressSearch";
import { Button } from "@/components/ui/Button";

/** Props for {@link FindStep}. */
export interface FindStepProps {
  /** A place was picked from the suggestion list. */
  onSelect: (found: AddressSearchResult) => void;
  /** Free-text address submitted. */
  onSubmitText: (query: string) => void;
  /** Whether a parcel lookup is in flight. */
  parcelLoading: boolean;
  /** Lookup/geocode error to surface, if any. */
  parcelError: string | null;
  /** The selected demo preset id (when in preset mode). */
  selectedPresetId: string | null;
  /** A demo lot chip was tapped. */
  onPresetSelect: (id: string) => void;
  /** The one primary action: reveal what the chosen lot could earn. */
  onReveal: () => void;
  /**
   * The demo lot arrived already chosen, by a `?parcel=` link such as the
   * landing's Oak Street sample, so the CTA keeps it instead of switching to
   * the San Diego default.
   */
  presetChosen?: boolean;
}

/**
 * Reveal 1 · Find — enter or select the property. One decision (the address
 * or a demo lot) and one primary action: reveal the backyard's potential.
 * A live address resolution advances the journey automatically; the CTA
 * covers the demo path and re-reveals.
 */
export default function FindStep({
  onSelect,
  onSubmitText,
  parcelLoading,
  parcelError,
  selectedPresetId,
  onPresetSelect,
  onReveal,
  presetChosen = false,
}: FindStepProps) {
  const [queryText, setQueryText] = useState("");
  const [userPickedPreset, setUserPickedPreset] = useState(false);
  const trimmedQuery = queryText.trim();
  const hasQuery = trimmedQuery.length > 0;
  // A lot the visitor picked here or arrived with is kept, and the CTA names
  // it; otherwise the CTA opens the San Diego example.
  const keptPreset =
    userPickedPreset || presetChosen
      ? parcelPresets.find((preset) => preset.id === selectedPresetId)
      : undefined;
  const { groupProps, getRadioProps } = useRadioGroup({
    value: selectedPresetId ?? "",
    onChange: (id) => {
      setUserPickedPreset(true);
      onPresetSelect(id);
    },
    values: parcelPresets.map((p) => p.id),
  });

  return (
    <section
      aria-label="Find your property"
      className="flex min-h-full flex-col px-5 pt-7"
      style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <p className="lf-kicker text-lot-orange-ink">Step 1 · Find</p>
      <h2 className="mt-2 font-display text-[clamp(1.65rem,7vw,1.95rem)] font-semibold leading-[1.1] text-balance text-lot-ink">
        Start with your address.
      </h2>
      <p className="lf-body-sm mt-2 text-lot-stone">
        We&rsquo;ll check available parcel records and market rents. Local zoning and setbacks may need confirmation.
      </p>

      <div className="mt-5">
        <AddressSearch
          onSelect={onSelect}
          onSubmitText={onSubmitText}
          onQueryChange={setQueryText}
          showPrivacyNote
        />
        {parcelLoading && (
          <div role="status" aria-live="polite" className="mt-2 flex items-center gap-2 rounded-none border border-lot-line bg-lot-surface px-3 py-2 text-xs text-lot-stone">
            <span aria-hidden="true" className="block h-3.5 w-3.5 motion-safe:animate-spin rounded-full border-2 border-lot-line border-t-lot-orange" />
            Looking up property data…
          </div>
        )}
        {parcelError && (
          <div
            role="alert"
            className="mt-2 flex items-start gap-2 rounded-none border border-status-blocked/40 bg-status-blocked/10 p-3 text-xs text-status-blocked"
          >
            <Search size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            {parcelError}
          </div>
        )}
      </div>

      <p className="mt-7 lf-kicker-dense text-lot-stone">
        Or explore a demo lot
      </p>
      <div className="mt-2 flex flex-wrap gap-2" aria-label="Demo lots" {...groupProps}>
        {parcelPresets.map((preset) => {
          const selected = selectedPresetId === preset.id;
          return (
            <Button
              key={preset.id}
              type="button"
              size="md"
              variant={selected ? "selected" : "secondary"}
              {...getRadioProps(preset.id)}
              className="px-4"
            >
              {preset.city.split(",")[0]}
            </Button>
          );
        })}
      </div>

      <div className="mt-8">
        <Button
          type="button"
          variant="primary"
          size="lg"
          fullWidth
          disabled={hasQuery && parcelLoading}
          rightIcon={<ArrowRight size={16} />}
          onClick={() => {
            if (hasQuery) {
              onSubmitText(trimmedQuery);
            } else {
              if (!keptPreset && selectedPresetId !== "coyote-brush") {
                onPresetSelect("coyote-brush");
              } else if (parcelLoading || parcelError) {
                // Explicit demo recovery must also cancel the address lookup.
                onPresetSelect(keptPreset?.id ?? "coyote-brush");
              }
              onReveal();
            }
          }}
        >
          {hasQuery
            ? "Check my address"
            : keptPreset
              ? `See the ${keptPreset.city.split(",")[0]} example`
              : "See a San Diego example"}
        </Button>
      </div>
    </section>
  );
}
