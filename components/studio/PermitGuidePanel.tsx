"use client";

import { useState } from "react";
import { AlertTriangle, BookOpen, ExternalLink, ShieldCheck, ShieldAlert } from "lucide-react";
import { inferJurisdiction, regulationGuides } from "@/lib/regulations-data";
import { getSafeCitationHref } from "@/lib/safe-url";

export interface PermitGuidePanelProps {
  address: string;
}

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

  const getRiskDetails = () => {
    switch (guide.confidence) {
      case "high":
        return {
          label: "Verified Regulations (Low Risk)",
          icon: ShieldCheck,
          colorClass: "bg-lf-forest-soft text-lf-forest border-lf-forest/20",
        };
      case "medium":
        return {
          label: "Active Zoning Check (Moderate Risk)",
          icon: ShieldCheck,
          colorClass: "bg-lf-amber-soft text-lf-amber border-lf-amber/20",
        };
      default:
        return {
          label: "Review Required (Unverified Risk)",
          icon: ShieldAlert,
          colorClass: "bg-lf-brick-soft text-lf-brick border-lf-brick/20",
        };
    }
  };

  const risk = getRiskDetails();
  const RiskIcon = risk.icon;

  return (
    <section
      aria-label="Permit guide panel"
      className="w-full shrink-0 border-lf-hairline bg-lf-card lg:h-full lg:max-h-none lg:min-h-0 lg:overflow-hidden xl:w-[404px] xl:border-l"
    >
      <div className="flex h-full flex-col lg:min-h-0">
        <div className="border-b border-lf-hairline px-6 py-5">
          <h2 className="text-2xl font-semibold tracking-tight text-lf-espresso">
            Permit Guide
          </h2>
          <p className="mt-1 text-sm text-lf-muted">
            Sourced local rules and permit review guides.
          </p>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-4 lg:min-h-0">
          <div>
            <h3 className="text-lg font-bold text-lf-espresso">{guide.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-lf-muted">{guide.summary}</p>
          </div>

          {/* Risk Level Badge */}
          <div className={`flex items-start gap-2.5 rounded-md border p-3.5 text-xs font-semibold ${risk.colorClass}`}>
            <RiskIcon size={16} className="mt-0.5 shrink-0" />
            <div>
              <div>{risk.label}</div>
              <p className="mt-1 font-normal leading-4 opacity-80">
                Verified at: {guide.verifiedAt} · Confidence: {guide.confidence}
              </p>
            </div>
          </div>

          {/* Permit Steps Checklist */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-lf-muted">
              Permitting Steps
            </h4>
            <div className="space-y-2.5">
              {guide.permitSteps.map((step, idx) => (
                <label
                  key={idx}
                  className="flex items-start gap-3 rounded-lg border border-lf-hairline bg-lf-sand/20 p-3 hover:bg-lf-sand/40 transition cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={!!checkedItems[step]}
                    onChange={() => handleToggle(step)}
                    className="mt-0.5 h-4 w-4 accent-lf-clay rounded focus:ring-lf-clay"
                  />
                  <span className={`text-sm leading-relaxed ${checkedItems[step] ? "text-lf-muted line-through" : "text-lf-espresso font-medium"}`}>
                    {step}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Blockers / Warnings */}
          {guide.blockers.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-lf-muted">
                Potential Blockers
              </h4>
              <div className="rounded-md border border-lf-brick/30 bg-lf-brick-soft p-3.5 text-xs text-lf-brick">
                <div className="flex gap-2">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" />
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
              <h4 className="text-sm font-semibold uppercase tracking-wider text-lf-muted">
                Local Resources
              </h4>
              <ul className="space-y-2">
                {guide.citations.map((citation, idx) => {
                  const safeHref = getSafeCitationHref(citation.url);
                  return (
                    <li key={idx}>
                      {safeHref ? (
                        <a
                          href={safeHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-lf-clay hover:text-lf-mahogany transition"
                        >
                          <BookOpen size={14} />
                          {citation.label}
                          <ExternalLink size={12} className="opacity-70" />
                        </a>
                      ) : (
                        <span
                          aria-disabled="true"
                          title="Citation link unavailable"
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-lf-muted"
                        >
                          <BookOpen size={14} />
                          {citation.label}
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
