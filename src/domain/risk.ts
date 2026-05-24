import type { ParcelSummary, RegulationGuide } from "./types";

export type RiskLevel = "low" | "moderate" | "high" | "unknown";

export interface DerivedRisk {
  level: RiskLevel;
  score?: number;
  drivers: string[];
}

/**
 * Derive a permit risk read from jurisdiction confidence and parcel
 * constraints. Honest: when there is no guide or parcel, return
 * `unknown` rather than fabricating a score.
 */
export function deriveRisk(input: {
  guide?: Pick<RegulationGuide, "confidence" | "blockers">;
  parcel?: Pick<ParcelSummary, "constraints">;
}): DerivedRisk {
  const { guide, parcel } = input;
  const constraintCount = parcel?.constraints.length ?? 0;

  if (!guide) {
    return {
      level: "unknown",
      drivers: ["No study run yet — start with an address to see real risk drivers."],
    };
  }

  const topConstraints = parcel?.constraints.slice(0, 2) ?? [];
  const topBlocker = guide.blockers[0];

  if (guide.confidence === "high" && constraintCount <= 2) {
    return {
      level: "low",
      score: 82,
      drivers: [
        "Jurisdiction guidance is current.",
        ...(topBlocker ? [topBlocker] : []),
      ],
    };
  }

  if (guide.confidence === "low") {
    return {
      level: "high",
      score: 32,
      drivers: [
        "Jurisdiction confidence is low — verify with the city.",
        ...topConstraints,
      ],
    };
  }

  return {
    level: "moderate",
    score: 58,
    drivers: [
      ...(topBlocker ? [topBlocker] : []),
      ...topConstraints,
    ].slice(0, 3),
  };
}
