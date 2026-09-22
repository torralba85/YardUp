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

const TIMEOUT_MS = 1500;
const NONE = "none";

/**
 * Below this confidence the caller keeps its own default rather than acting
 * on the answer. A starting point: tune it on real guest queries before
 * relying on it, since acting wrongly either 404s a real address or labels a
 * visitor's lot with someone else's.
 */
export const PICK_CONFIDENCE_THRESHOLD = 0.8;

/** Whether the TypeSafe candidate picker is switched on and has a key. */
export function isGeocodePickerEnabled(): boolean {
  return process.env.TYPESAFE_GEOCODE_PICKER === "true" && isTypeSafeConfigured();
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

    const answer = response.answers?.pick;
    if (
      !answer ||
      typeof answer.choice !== "string" ||
      !(answer.choice in criteria) ||
      typeof answer.confidence !== "number" ||
      answer.confidence < PICK_CONFIDENCE_THRESHOLD
    ) {
      return null;
    }
    return answer.choice === NONE ? NONE : Number(answer.choice.slice(1));
  } catch (err) {
    console.warn("[geocode-candidate-picker] TypeSafe unavailable; keeping default:", err);
    return null;
  }
}
