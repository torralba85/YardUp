"use client";

import { useState } from "react";
import { AlertTriangle, BookOpen, ExternalLink } from "lucide-react";
import { inferJurisdiction, regulationGuides } from "@/lib/regulations-data";
import { getSafeCitationHref } from "@/lib/safe-url";
import { Checkbox } from "@/components/ui/Field";
import { StatusChip } from "@/components/ui/StatusChip";

/** Props for {@link PermitGuidePanel}. */
export interface PermitGuidePanelProps {
  /** The parcel address used to infer the jurisdiction's permit guide. */
  address: string;
}

function getCitationLabel(citation: unknown, index: number) {
  if (
    citation &&
    typeof citation === "object" &&
    "label" in citation &&
    typeof citation.label === "string" &&
    citation.label.trim()
  ) {
    return citation.label;
  }

  return `Resource ${index + 1}`;
}

function getCitationUrl(citation: unknown) {
  if (citation && typeof citation === "object" && "url" in citation) {
    return citation.url;
  }

  return null;
}

/**
 * Renders the jurisdiction-specific permit guide for a parcel: summary, an
 * interactive (locally-tracked) permit-step checklist, blockers, and cited
 * sources, with citation links sanitized via {@link getSafeCitationHref}.
 *
 * @param props - The {@link PermitGuidePanelProps}.
 */
export default function PermitGuidePanel({ address }: PermitGuidePanelProps) {
  const jurisdictionId = inferJurisdiction(address);
  const guide = regulationGuides[jurisdictionId];

  // Keep track of check items completed locally
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const handleToggle = (item: string) => {
    setCheckedItems((current) => ({
      ...current,
      [item]: !current[item],
    }));
  };

  return (
    <section
      aria-label="Permit guide panel"
      className="w-full shrink-0 border-lot-line bg-lot-chalk lg:border-t"
    >
      <div className="flex flex-col gap-4 border-b border-lot-line px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="lf-panel-heading text-lot-ink">
            Permit Guide
          </h2>
          <StatusChip
            status={
              guide.confidence === "high"
                ? "clear"
                : guide.confidence === "medium"
                ? "review"
                : "blocked"
            }
            label={
              guide.confidence === "high"
                ? "Low Risk"
                : guide.confidence === "medium"
                ? "Moderate Risk"
                : "Review Required"
            }
            size="sm"
          />
        </div>

        <div className="text-xs text-lot-stone">
          Verified at: {guide.verifiedAt} · Confidence: {guide.confidence}
        </div>
      </div>

      <div className="grid gap-8 px-6 py-5 lg:grid-cols-3 lg:gap-10 xl:grid-cols-[minmax(0,3fr)_minmax(0,6fr)_minmax(0,3fr)]">
        <div>
          <h3 className="font-display text-xl font-medium leading-snug text-lot-ink">{guide.title}</h3>
          <p className="lf-body-sm mt-2 text-lot-stone">{guide.summary}</p>
        </div>

        {/* Permit Steps Checklist */}
        <div className="space-y-3">
          <h4 className="lf-kicker-dense text-lot-stone">
            Permitting Steps
          </h4>
          <div className="space-y-2.5">
            {guide.permitSteps.map((step, idx) => (
              <label
                key={idx}
                className="flex items-start gap-3 rounded-none border border-lot-line bg-lot-chalk p-3 hover:bg-lot-surface motion-safe:transition-colors cursor-pointer"
              >
                <Checkbox
                  checked={!!checkedItems[step]}
                  onChange={() => handleToggle(step)}
                  className="mt-0.5"
                />
                <span className={`text-sm leading-relaxed ${checkedItems[step] ? "text-lot-stone line-through" : "text-lot-ink font-medium"}`}>
                  {step}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {/* Blockers / Warnings */}
          {guide.blockers.length > 0 && (
            <div className="space-y-3">
              <h4 className="lf-kicker-dense text-lot-stone">
                Potential Blockers
              </h4>
              <div className="rounded-none border border-status-blocked/30 bg-status-blocked-soft p-3.5 text-xs text-status-blocked">
                <div className="flex gap-2">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <ul className="list-disc pl-3 space-y-1 font-medium">
                    {guide.blockers.map((blocker, idx) => (
                      <li key={idx}>{blocker}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Sourced Citations */}
          {guide.citations.length > 0 && (
            <div className="space-y-3">
              <h4 className="lf-kicker-dense text-lot-stone">
                Local Resources
              </h4>
              <ul className="space-y-2">
                {guide.citations.map((citation, idx) => {
                  const citationLabel = getCitationLabel(citation, idx);
                  const safeHref = getSafeCitationHref(getCitationUrl(citation));
                  return (
                    <li key={idx}>
                      {safeHref ? (
                        <a
                          href={safeHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-lot-orange-ink motion-safe:transition hover:text-lot-ink"
                        >
                          <BookOpen size={14} aria-hidden="true" />
                          {citationLabel}
                          <ExternalLink size={12} className="opacity-70" aria-hidden="true" />
                        </a>
                      ) : (
                        <span
                          aria-disabled="true"
                          title="Citation link unavailable"
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-lot-stone"
                        >
                          <BookOpen size={14} aria-hidden="true" />
                          {citationLabel}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
