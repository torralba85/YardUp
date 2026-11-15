import { describe, expect, it } from "vitest";
import {
  evaluateEligibilityQuiz,
  QUIZ_QUESTIONS,
  type QuizAnswers,
} from "@/lib/eligibility-quiz";

const ALL_YES: QuizAnswers = {
  primary_home: "yes",
  yard_space: "yes",
  setback_clearance: "yes",
  site_hazards: "yes",
  residential_use: "yes",
};

describe("evaluateEligibilityQuiz", () => {
  it("defines five ordered yes/no questions", () => {
    expect(QUIZ_QUESTIONS).toHaveLength(5);
    expect(QUIZ_QUESTIONS.map((q) => q.number)).toEqual([
      "01",
      "02",
      "03",
      "04",
      "05",
    ]);
  });

  it("returns clear verdict and 600 sq ft recommendation when all answers are yes", () => {
    const result = evaluateEligibilityQuiz(ALL_YES);
    expect(result.verdict).toBe("clear");
    expect(result.chipLabel).toBe("Likely eligible");
    expect(result.recommendedFootprint).toBe(600);
    expect(result.yesCount).toBe(5);
    expect(result.checks.every((c) => c.status === "clear")).toBe(true);
  });

  it("returns review verdict and recommends 400 sq ft when yard space or setbacks are tight", () => {
    const result = evaluateEligibilityQuiz({
      ...ALL_YES,
      yard_space: "no",
    });
    expect(result.verdict).toBe("review");
    expect(result.chipLabel).toBe("Needs parcel check");
    expect(result.recommendedFootprint).toBe(400);
    expect(result.yesCount).toBe(4);
    expect(result.checks.find((c) => c.id === "yard_space")?.status).toBe(
      "review",
    );
  });

  it("returns review verdict and keeps 600 sq ft when only hazards or use need review", () => {
    const result = evaluateEligibilityQuiz({
      ...ALL_YES,
      site_hazards: "no",
    });
    expect(result.verdict).toBe("review");
    expect(result.recommendedFootprint).toBe(600);
    expect(result.yesCount).toBe(4);
  });

  it("returns blocked verdict when primary residential home requirement is no", () => {
    const result = evaluateEligibilityQuiz({
      ...ALL_YES,
      primary_home: "no",
    });
    expect(result.verdict).toBe("blocked");
    expect(result.chipLabel).toBe("Zoning check needed");
    expect(result.checks.find((c) => c.id === "primary_home")?.status).toBe(
      "blocked",
    );
  });
});
