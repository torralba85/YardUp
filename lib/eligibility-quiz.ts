/**
 * Domain logic for the 5-question Yes/No Accessory Dwelling Unit (ADU) /
 * backyard home eligibility quiz.
 *
 * Pure and side-effect free so both the interactive client quiz and unit tests
 * evaluate answers deterministically.
 */

export type QuizQuestionId =
  | "primary_home"
  | "yard_space"
  | "setback_clearance"
  | "site_hazards"
  | "residential_use";

export type QuizAnswer = "yes" | "no";

export type QuizAnswers = Partial<Record<QuizQuestionId, QuizAnswer>>;

export interface QuizQuestion {
  id: QuizQuestionId;
  number: string;
  prompt: string;
  helper: string;
  yesLabel: string;
  noLabel: string;
  reviewNote: string;
  blockedNote?: string;
}

export type QuizVerdict = "clear" | "review" | "blocked";

export type RecommendedFootprint = 400 | 600;

export interface QuizCheckItem {
  id: QuizQuestionId;
  number: string;
  prompt: string;
  answer: QuizAnswer;
  status: "clear" | "review" | "blocked";
  note: string;
}

export interface QuizEvaluation {
  verdict: QuizVerdict;
  chipLabel: string;
  headline: string;
  summary: string;
  recommendedFootprint: RecommendedFootprint;
  yesCount: number;
  checks: QuizCheckItem[];
}

export const QUIZ_QUESTIONS: readonly QuizQuestion[] = [
  {
    id: "primary_home",
    number: "01",
    prompt: "Is there an existing or planned home on a residential lot?",
    helper:
      "Most state and local ADU rules allow a backyard home on lots zoned for single-family or multifamily housing with a primary dwelling.",
    yesLabel: "Yes, residential lot",
    noLabel: "No / commercial or raw land",
    reviewNote: "Confirm local zoning allows a primary dwelling on the parcel.",
    blockedNote:
      "Detached ADUs generally require a residential lot with an existing or permitted primary residence.",
  },
  {
    id: "yard_space",
    number: "02",
    prompt: "Do you have at least 400 sq ft of open backyard or side-yard space?",
    helper:
      "A compact studio backyard home starts around 400 sq ft (20 x 20 ft), while a 1-bedroom typically sits near 600 sq ft.",
    yesLabel: "Yes, open yard space",
    noLabel: "No, yard is tight",
    reviewNote:
      "A tight yard often points to a compact 400 sq ft studio, a garage conversion, or an attached unit.",
  },
  {
    id: "setback_clearance",
    number: "03",
    prompt: "Can a small footprint sit ~4 ft from the side and rear lot lines?",
    helper:
      "Many jurisdictions allow reduced 4-foot side and rear setbacks for detached ADUs, plus separation from the main house.",
    yesLabel: "Yes, clearance looks open",
    noLabel: "No / unsure of lot lines",
    reviewNote:
      "Map your exact parcel boundaries and modeled setbacks in the 3D studio before budgeting.",
  },
  {
    id: "site_hazards",
    number: "04",
    prompt: "Is the yard free of steep slopes, utility easements, or protected trees?",
    helper:
      "Easements, coastal/wildfire zones, and heritage trees rarely ban an ADU outright, but they shift where a foundation can sit.",
    yesLabel: "Yes, flat and clear",
    noLabel: "No, slope or constraint",
    reviewNote:
      "Site constraints may add foundation or permitting steps; inspect parcel overlays and placement.",
  },
  {
    id: "residential_use",
    number: "05",
    prompt: "Will the unit be used for housing (family, long-term rent, or personal use)?",
    helper:
      "Local ADU incentives usually protect long-term housing and family living, whereas short-term vacation rentals often face caps.",
    yesLabel: "Yes, housing or family",
    noLabel: "No, short-term rental / office only",
    reviewNote:
      "Short-term rental or non-residential use may trigger stricter local permitting or parking rules.",
  },
];

/**
 * Evaluate completed or partial Yes/No answers from the backyard home quiz.
 *
 * Returns a deterministic status verdict, a human-readable summary grounded in
 * common ADU zoning rules, and a recommended starter studio footprint (`400`
 * or `600` sq ft) for the 3D Feasibility Studio handoff.
 */
export function evaluateEligibilityQuiz(answers: QuizAnswers): QuizEvaluation {
  const checks: QuizCheckItem[] = QUIZ_QUESTIONS.map((question) => {
    const answer: QuizAnswer = answers[question.id] ?? "no";
    if (answer === "yes") {
      return {
        id: question.id,
        number: question.number,
        prompt: question.prompt,
        answer,
        status: "clear",
        note: "Looks favorable based on your answer.",
      };
    }

    if (question.id === "primary_home") {
      return {
        id: question.id,
        number: question.number,
        prompt: question.prompt,
        answer,
        status: "blocked",
        note: question.blockedNote ?? question.reviewNote,
      };
    }

    return {
      id: question.id,
      number: question.number,
      prompt: question.prompt,
      answer,
      status: "review",
      note: question.reviewNote,
    };
  });

  const yesCount = checks.filter((item) => item.answer === "yes").length;
  const primaryHomeBlocked = answers.primary_home === "no";
  const tightFootprint =
    answers.yard_space === "no" || answers.setback_clearance === "no";
  const recommendedFootprint: RecommendedFootprint = tightFootprint ? 400 : 600;

  if (primaryHomeBlocked) {
    return {
      verdict: "blocked",
      chipLabel: "Zoning check needed",
      headline: "Verify residential zoning before planning a detached ADU.",
      summary:
        "Backyard homes are typically tied to a residential lot with an existing or planned primary dwelling. Enter your address below to check parcel lines and context in the studio.",
      recommendedFootprint,
      yesCount,
      checks,
    };
  }

  if (yesCount === QUIZ_QUESTIONS.length) {
    return {
      verdict: "clear",
      chipLabel: "Likely eligible",
      headline: "Your lot shows clear baseline signals for a backyard home.",
      summary:
        "All five baseline signals look favorable. Drop your address below to test a 600 sq ft placement against modeled parcel setbacks and estimated cost.",
      recommendedFootprint: 600,
      yesCount,
      checks,
    };
  }

  return {
    verdict: "review",
    chipLabel: "Needs parcel check",
    headline:
      "You likely still have a path — test a compact footprint on your exact lot.",
    summary: tightFootprint
      ? "Tight yard depth or unclear lot lines often still work with a 400 sq ft studio or attached conversion. Check your parcel in 3D to see what fits inside setbacks."
      : "Most homeowners with one or two site caveats can still build once setbacks and overlays are accounted for. Check your address in the 3D studio for a parcel-level estimate.",
    recommendedFootprint,
    yesCount,
    checks,
  };
}
