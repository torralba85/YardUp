/**
 * Choose which geocoder candidate is the address a person typed — a semantic
 * judgment that string rules keep getting wrong (directionals read as states,
 * a street-only match in the wrong city, "NE" vs "Northeast"). Server-only.
 *
 * Behind the `TYPESAFE_GEOCODE_PICKER` flag: every call spends metered
 * TypeSafe quota, including on the guest lookup path, so it stays off until
 * that spend is approved.
 */
import { askTypeSafe, isTypeSafeConfigured } from "@/lib/server/typesafe";
import type { TypeSafeChoiceAnswer } from "@/lib/server/typesafe";

const TIMEOUT_MS = 1500;
const NONE = "none";

/**
 * Below this confidence the caller keeps its own default rather than acting
 * on the answer. A starting point: tune it on real guest queries before
 * relying on it, since acting wrongly either 404s a real address or labels a
 * visitor's lot with someone else's.
 */
export const PICK_CONFIDENCE_THRESHOLD = 0.8;

/**
 * When Jev returns a complete probability distribution, require its chosen
 * option to beat the runner-up by at least this margin. The live eval harness
 * exists to tune this value against labeled cases instead of guessing forever.
 */
export const PICK_PROBABILITY_MARGIN_THRESHOLD = 0.15;

type PickerOutcome =
  | "selected"
  | "none"
  | "fallback-invalid-response"
  | "fallback-low-confidence"
  | "fallback-ambiguous-probabilities"
  | "fallback-probability-disagreement"
  | "fallback-provider-error";

interface ProbabilityStats {
  selectedProbability: number;
  runnerUpProbability: number;
  probabilityMargin: number;
}

interface PickerTelemetry {
  candidateCount: number;
  outcome: PickerOutcome;
  durationMs: number;
  model?: string;
  confidence?: number;
  selectedProbability?: number;
  runnerUpProbability?: number;
  probabilityMargin?: number;
  errorName?: string;
}

/** Whether the TypeSafe candidate picker is switched on and has a key. */
export function isGeocodePickerEnabled(): boolean {
  return process.env.TYPESAFE_GEOCODE_PICKER === "true" && isTypeSafeConfigured();
}

function roundMetric(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Return probability separation only when TypeSafe supplied a complete, usable
 * distribution for every option. Missing/partial probabilities preserve the
 * previous confidence-only behavior instead of changing production semantics.
 */
function probabilityStats(
  answer: TypeSafeChoiceAnswer,
  optionKeys: string[],
): ProbabilityStats | null {
  const probabilities = answer.probabilities;
  if (!probabilities || typeof probabilities !== "object") return null;

  const values = optionKeys.map((key) => probabilities[key]);
  if (
    values.some(
      (value) =>
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < 0 ||
        value > 1,
    )
  ) {
    return null;
  }

  const selectedProbability = probabilities[answer.choice];
  if (typeof selectedProbability !== "number") return null;

  const runnerUpProbability = Math.max(
    ...optionKeys
      .filter((key) => key !== answer.choice)
      .map((key) => probabilities[key] as number),
  );

  if (!Number.isFinite(runnerUpProbability)) return null;

  return {
    selectedProbability,
    runnerUpProbability,
    probabilityMargin: selectedProbability - runnerUpProbability,
  };
}

/**
 * Emit one structured, privacy-safe event per metered Jev call. It deliberately
 * excludes the user's query and candidate labels; Cloud Logging still gets
 * enough data to tune thresholds, latency, and fallback behavior.
 */
function logPickerTelemetry(event: PickerTelemetry): void {
  const payload = {
    severity: event.outcome === "fallback-provider-error" ? "WARNING" : "INFO",
    event: "jev_geocode_picker",
    candidateCount: event.candidateCount,
    outcome: event.outcome,
    durationMs: event.durationMs,
    ...(event.model ? { model: event.model } : {}),
    ...(event.confidence != null
      ? { confidence: roundMetric(event.confidence) }
      : {}),
    ...(event.selectedProbability != null
      ? { selectedProbability: roundMetric(event.selectedProbability) }
      : {}),
    ...(event.runnerUpProbability != null
      ? { runnerUpProbability: roundMetric(event.runnerUpProbability) }
      : {}),
    ...(event.probabilityMargin != null
      ? { probabilityMargin: roundMetric(event.probabilityMargin) }
      : {}),
    ...(event.errorName ? { errorName: event.errorName } : {}),
  };

  const line = JSON.stringify(payload);
  if (event.outcome === "fallback-provider-error") {
    console.warn(line);
  } else {
    console.info(line);
  }
}

/**
 * Pick the candidate that is the typed address.
 *
 * @param query - The free-text address the person typed.
 * @param candidates - Geocoder labels, in provider rank order.
 * @returns The chosen candidate's index; `"none"` when none of them is the
 *   typed address; or `null` when there is no confident answer (low
 *   confidence, provider failure, or an unusable response) — callers then keep
 *   their existing default.
 */
export async function pickGeocodeCandidate(
  query: string,
  candidates: string[],
): Promise<number | typeof NONE | null> {
  if (candidates.length === 0) return null;

  const criteria: Record<string, string> = {};
  candidates.forEach((label, index) => {
    criteria[`c${index}`] = label;
  });
  criteria[NONE] = "None of these candidates is the address the person typed.";

  const startedAt = Date.now();
  try {
    const response = await askTypeSafe(
      {
        state: { query },
        questions: {
          pick: {
            type: "choice",
            instructions:
              "Which candidate is the address the person typed in `query`? " +
              "Abbreviations (NE for Northeast, St for Street) and a missing ZIP, " +
              "county, neighborhood or state are fine. A candidate with a different " +
              "house number or street, or in a different city or state than one the " +
              "query names, is not the typed address.",
            criteria,
          },
        },
      },
      TIMEOUT_MS,
    );

    const durationMs = Date.now() - startedAt;
    const answer = response.answers?.pick;
    if (
      !answer ||
      typeof answer.choice !== "string" ||
      !(answer.choice in criteria) ||
      typeof answer.confidence !== "number" ||
      !Number.isFinite(answer.confidence)
    ) {
      logPickerTelemetry({
        candidateCount: candidates.length,
        outcome: "fallback-invalid-response",
        durationMs,
        model: response.model,
      });
      return null;
    }

    if (answer.confidence < PICK_CONFIDENCE_THRESHOLD) {
      logPickerTelemetry({
        candidateCount: candidates.length,
        outcome: "fallback-low-confidence",
        durationMs,
        model: response.model,
        confidence: answer.confidence,
      });
      return null;
    }

    const stats = probabilityStats(answer, Object.keys(criteria));
    if (stats && stats.probabilityMargin < 0) {
      logPickerTelemetry({
        candidateCount: candidates.length,
        outcome: "fallback-probability-disagreement",
        durationMs,
        model: response.model,
        confidence: answer.confidence,
        ...stats,
      });
      return null;
    }

    if (
      stats &&
      stats.probabilityMargin < PICK_PROBABILITY_MARGIN_THRESHOLD
    ) {
      logPickerTelemetry({
        candidateCount: candidates.length,
        outcome: "fallback-ambiguous-probabilities",
        durationMs,
        model: response.model,
        confidence: answer.confidence,
        ...stats,
      });
      return null;
    }

    const outcome = answer.choice === NONE ? "none" : "selected";
    logPickerTelemetry({
      candidateCount: candidates.length,
      outcome,
      durationMs,
      model: response.model,
      confidence: answer.confidence,
      ...(stats ?? {}),
    });

    return answer.choice === NONE ? NONE : Number(answer.choice.slice(1));
  } catch (err) {
    logPickerTelemetry({
      candidateCount: candidates.length,
      outcome: "fallback-provider-error",
      durationMs: Date.now() - startedAt,
      errorName: err instanceof Error ? err.name : "unknown",
    });
    return null;
  }
}
