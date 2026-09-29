/**
 * Read what kind of district a zoning designation names — a semantic judgment
 * that code patterns keep getting wrong (`NR3` is not R-3, `RE40-1` is
 * residential, `A-1` means different things in different cities). Server-only.
 *
 * SHADOW MODE ONLY. `shadowClassifyZoning` asks Jev for the class and logs it
 * next to what the regex classifiers said; nothing here changes a parcel
 * response. Behind `TYPESAFE_ZONING_SHADOW`, because each new designation
 * spends metered TypeSafe quota. Promotion to a real input needs the labeled
 * evaluation in `zoning-labeled-cases.ts` first.
 */
import {
  askTypeSafe,
  isTypeSafeConfigured,
  type TypeSafeChoiceAnswer,
  type TypeSafeChoiceQuestion,
} from "@/lib/server/typesafe";
import { deriveMaxCoverage } from "@/lib/server/zoning-heuristics";
import {
  residentialZoningCode,
  type RuleCheck,
} from "@/utils/rules/californiaAduRules";

const TIMEOUT_MS = 1500;
const QUESTION_ID = "district";
const CACHE_LIMIT = 256;

/**
 * Provisional bands, the same starting values as the address picker. They are
 * not measured accuracy: tune them on the labeled set before anything acts on
 * a `confident` answer.
 */
export const ZONING_CONFIDENCE_THRESHOLD = 0.8;
export const ZONING_PROBABILITY_MARGIN_THRESHOLD = 0.15;

export const ZONING_CLASSES = [
  "single_family",
  "small_lot_duplex",
  "multifamily",
  "mixed_use",
  "commercial",
  "industrial",
  "agricultural_rural",
  "planned_special",
  "unclear",
] as const;

export type ZoningClass = (typeof ZONING_CLASSES)[number];

const CLASS_CRITERIA: Record<ZoningClass, string> = {
  single_family:
    "Detached single-dwelling residential district, including estate lots and single-dwelling zones that also allow a second unit.",
  small_lot_duplex:
    "Small-lot, two-family, duplex or townhouse residential district.",
  multifamily:
    "Residential district meant for apartments or other multi-unit buildings, from lowrise to high density.",
  mixed_use:
    "Mixed-use district that combines housing with commercial or employment uses.",
  commercial:
    "Commercial, office, retail or neighborhood-commercial district.",
  industrial:
    "Industrial, manufacturing, warehouse or general-employment district.",
  agricultural_rural:
    "Agricultural, rural, farm, forest or resource district.",
  planned_special:
    "Planned development, specific plan, public facility, institutional, open space or other special-purpose district.",
  unclear:
    "The code and description are not enough to say which kind of district this is.",
};

const QUESTION: TypeSafeChoiceQuestion = {
  type: "choice",
  instructions:
    "What kind of zoning district does `parcel` describe? Judge it from " +
    "`parcel.zoningCode` and `parcel.zoningDescription` using the conventions " +
    "of the named state and county. The same letters mean different things in " +
    "different places (A-1 is light industrial in Phoenix but agricultural " +
    "elsewhere), so answer unclear rather than guess when the designation " +
    "cannot be read with confidence.",
  criteria: CLASS_CRITERIA,
};

export interface ZoningInput {
  zoning: string;
  description?: string;
  state?: string;
  county?: string;
}

export interface ZoningJudgment {
  zoningClass: ZoningClass;
  confidence: number;
  /** Chosen class's probability minus the runner-up's, when Jev supplied a full distribution. */
  probabilityMargin?: number;
  /** Clears both provisional bands. Never treat as verified zoning. */
  confident: boolean;
}

export type ClassifyOutcome =
  | "classified"
  | "fallback-invalid-response"
  | "fallback-provider-error";

export interface ZoningClassification {
  outcome: ClassifyOutcome;
  judgment?: ZoningJudgment;
  cacheHit: boolean;
  durationMs: number;
  model?: string;
  errorName?: string;
}

/**
 * Judgments by normalized designation. The vocabulary repeats across lookups,
 * so a warm instance rarely asks twice. Per-instance and bounded: a durable
 * cache (Firestore) is a later step once shadow data justifies it.
 */
const cache = new Map<string, ZoningJudgment>();

function cacheKey(input: ZoningInput): string {
  return [input.state, input.county, input.zoning, input.description]
    .map((part) => (part ?? "").trim().replace(/\s+/g, " ").toUpperCase())
    .join("|");
}

function remember(key: string, judgment: ZoningJudgment): void {
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, judgment);
}

/** Drop every cached judgment. For tests. */
export function clearZoningCache(): void {
  cache.clear();
}

function isZoningClass(value: string): value is ZoningClass {
  return (ZONING_CLASSES as readonly string[]).includes(value);
}

/** Lead of the chosen class over the runner-up, only for a complete, valid distribution. */
function probabilityLead(answer: TypeSafeChoiceAnswer): number | undefined {
  const probabilities = answer.probabilities;
  if (!probabilities || typeof probabilities !== "object") return undefined;
  const values = ZONING_CLASSES.map((key) => probabilities[key]);
  if (
    values.some(
      (value) =>
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < 0 ||
        value > 1,
    )
  ) {
    return undefined;
  }
  const runnerUp = Math.max(
    ...ZONING_CLASSES.filter((key) => key !== answer.choice).map(
      (key) => probabilities[key],
    ),
  );
  return probabilities[answer.choice] - runnerUp;
}

/**
 * Ask Jev which kind of district a designation names. Never throws: provider
 * and response problems come back as a fallback outcome with no judgment.
 * Successful judgments are cached; failures are not.
 */
export async function classifyZoning(
  input: ZoningInput,
): Promise<ZoningClassification> {
  const key = cacheKey(input);
  const cached = cache.get(key);
  if (cached) {
    return { outcome: "classified", judgment: cached, cacheHit: true, durationMs: 0 };
  }

  const startedAt = Date.now();
  try {
    const parcel = {
      ...(input.state ? { state: input.state } : {}),
      ...(input.county ? { county: input.county } : {}),
      zoningCode: input.zoning,
      ...(input.description ? { zoningDescription: input.description } : {}),
    };
    const response = await askTypeSafe(
      { state: { parcel }, questions: { [QUESTION_ID]: QUESTION } },
      TIMEOUT_MS,
    );
    const durationMs = Date.now() - startedAt;
    const answer = response.answers?.[QUESTION_ID];
    if (
      !answer ||
      typeof answer.choice !== "string" ||
      !isZoningClass(answer.choice) ||
      typeof answer.confidence !== "number" ||
      !Number.isFinite(answer.confidence)
    ) {
      return {
        outcome: "fallback-invalid-response",
        cacheHit: false,
        durationMs,
        model: response.model,
      };
    }

    const lead = probabilityLead(answer);
    const judgment: ZoningJudgment = {
      zoningClass: answer.choice,
      confidence: answer.confidence,
      ...(lead !== undefined ? { probabilityMargin: lead } : {}),
      confident:
        answer.confidence >= ZONING_CONFIDENCE_THRESHOLD &&
        (lead === undefined || lead >= ZONING_PROBABILITY_MARGIN_THRESHOLD),
    };
    remember(key, judgment);
    return { outcome: "classified", judgment, cacheHit: false, durationMs, model: response.model };
  } catch (err) {
    return {
      outcome: "fallback-provider-error",
      cacheHit: false,
      durationMs: Date.now() - startedAt,
      errorName: err instanceof Error ? err.name : "unknown",
    };
  }
}

export type JevResidential = "yes" | "no" | "other";

/** Residential is a clear yes; commercial and industrial a clear no; the rest are not compared. */
export function jevResidential(zoningClass: ZoningClass): JevResidential {
  switch (zoningClass) {
    case "single_family":
    case "small_lot_duplex":
    case "multifamily":
      return "yes";
    case "commercial":
    case "industrial":
      return "no";
    default:
      return "other";
  }
}

export type ResidentialAgreement =
  | "agree"
  | "regex-no-jev-yes"
  | "regex-yes-jev-no"
  | "not-compared";

/**
 * Whether the regex residential screen and a confident Jev class disagree.
 * Anything Jev is unsure of, that the regex cannot read, or that is neither
 * clearly residential nor clearly not (mixed use, agricultural, special
 * purpose) is not compared.
 */
export function residentialAgreement(
  regex: RuleCheck | undefined,
  zoningClass: ZoningClass,
  confident: boolean,
): ResidentialAgreement {
  if (!confident || !regex || regex === "unknown") return "not-compared";
  const jev = jevResidential(zoningClass);
  if (jev === "other") return "not-compared";
  if (jev === "yes") return regex === "yes" ? "agree" : "regex-no-jev-yes";
  return regex === "no" ? "agree" : "regex-yes-jev-no";
}

/** Whether the shadow classifier is switched on and has a key. */
export function isZoningShadowEnabled(): boolean {
  return process.env.TYPESAFE_ZONING_SHADOW === "true" && isTypeSafeConfigured();
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Classify a parcel's zoning and log one structured event beside the regex
 * verdicts. Never rejects and never changes what the caller returns.
 *
 * The event carries the public zoning designation and state so disagreements
 * can be reviewed and added to the labeled set. It carries no address,
 * coordinates, county, description or user identifier.
 */
export async function shadowClassifyZoning(input: {
  zoning?: unknown;
  description?: unknown;
  state?: unknown;
  county?: unknown;
}): Promise<void> {
  if (!isZoningShadowEnabled()) return;
  const zoning = text(input.zoning);
  if (!zoning || zoning.toLowerCase() === "unknown") return;

  try {
    const state = text(input.state).toUpperCase();
    const result = await classifyZoning({
      zoning,
      description: text(input.description) || undefined,
      state: state || undefined,
      county: text(input.county) || undefined,
    });
    // The residential screen is California's, so only compare it there.
    const regexResidential = state === "CA" ? residentialZoningCode(zoning) : undefined;
    const judgment = result.judgment;
    const failed = result.outcome === "fallback-provider-error";
    const line = JSON.stringify({
      severity: failed ? "WARNING" : "INFO",
      event: "jev_zoning_shadow",
      outcome: result.outcome,
      cacheHit: result.cacheHit,
      durationMs: result.durationMs,
      model: result.model,
      state: state || undefined,
      zoning: zoning.slice(0, 40),
      regexCoveragePercent: deriveMaxCoverage(zoning),
      regexResidential,
      zoningClass: judgment?.zoningClass,
      confidence: judgment ? round(judgment.confidence) : undefined,
      probabilityMargin:
        judgment?.probabilityMargin !== undefined
          ? round(judgment.probabilityMargin)
          : undefined,
      confident: judgment?.confident,
      residentialAgreement: judgment
        ? residentialAgreement(regexResidential, judgment.zoningClass, judgment.confident)
        : undefined,
      errorName: result.errorName,
    });
    if (failed) console.warn(line);
    else console.info(line);
  } catch {
    // Shadow work must never affect the parcel response.
  }
}
