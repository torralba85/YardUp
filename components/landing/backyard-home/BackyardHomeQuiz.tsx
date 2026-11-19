"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, RotateCcw } from "lucide-react";
import { useCallback, useId, useState } from "react";
import { LotAnswerCard } from "@/components/adu/LotAnswerCard";
import { Bezel } from "@/components/ui/Bezel";
import { Button } from "@/components/ui/Button";
import { PanelHeader } from "@/components/ui/Panel";
import { StatusChip } from "@/components/ui/StatusChip";
import { stashAddressQuery } from "@/lib/address-handoff";
import { stashEntrySource } from "@/lib/analytics/entry-source";
import { trackEvent } from "@/lib/analytics/gtag";
import {
  evaluateEligibilityQuiz,
  QUIZ_QUESTIONS,
  type QuizAnswer,
  type QuizAnswers,
} from "@/lib/eligibility-quiz";

const LandingAuthGate = dynamic(
  () => import("@/components/landing/LandingAuthGate"),
  { ssr: false },
);

type QuizView = "questions" | "result" | "direct_address";

/**
 * Progressive 5-question Yes/No Accessory Dwelling Unit (ADU) / backyard home
 * eligibility quiz that feeds directly into the 3D Feasibility Studio via
 * sessionStorage address handoff or a preloaded sample parcel link.
 */
export function BackyardHomeQuiz() {
  const router = useRouter();
  const addressInputId = useId();
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [view, setView] = useState<QuizView>("questions");
  const [address, setAddress] = useState("");
  const [showAuthGate, setShowAuthGate] = useState(false);

  const currentQuestion = QUIZ_QUESTIONS[stepIndex];
  const evaluation = evaluateEligibilityQuiz(answers);
  const completedAllSteps =
    Object.keys(answers).length === QUIZ_QUESTIONS.length;
  const demoSize = completedAllSteps ? evaluation.recommendedFootprint : 400;

  const handleAnswer = (answer: QuizAnswer) => {
    const nextAnswers: QuizAnswers = {
      ...answers,
      [currentQuestion.id]: answer,
    };
    setAnswers(nextAnswers);

    const nextStep = stepIndex + 1;
    if (nextStep < QUIZ_QUESTIONS.length) {
      setStepIndex(nextStep);
      return;
    }

    const result = evaluateEligibilityQuiz(nextAnswers);
    trackEvent("eligibility_quiz_completed", {
      verdict: result.verdict,
      yes_count: result.yesCount,
      recommended_sq_ft: result.recommendedFootprint,
    });
    setView("result");
  };

  const handleBack = () => {
    if (view === "direct_address") {
      setView("questions");
      return;
    }
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
    }
  };

  const handleRetake = () => {
    setAnswers({});
    setStepIndex(0);
    setView("questions");
  };

  const proceedToStudio = useCallback(
    (source: "quiz_address_form" | "quiz_auth_gate") => {
      const trimmed = address.trim();
      stashAddressQuery(trimmed);
      stashEntrySource("landing_cta");
      trackEvent("eligibility_quiz_studio_cta", {
        source,
        completed: view === "result",
        verdict: view === "result" ? evaluation.verdict : "skipped",
        recommended_sq_ft: demoSize,
      });
      router.push("/studio");
    },
    [address, demoSize, evaluation.verdict, router, view],
  );

  const progressPercent = Math.round(
    ((stepIndex + 1) / QUIZ_QUESTIONS.length) * 100,
  );

  return (
    <Bezel
      className="border-lot-line bg-lot-surface shadow-paper"
      innerClassName="p-5 sm:p-6"
    >
      {view === "questions" ? (
        <div className="space-y-5">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="lf-kicker">
                Eligibility Check · Question {stepIndex + 1} of{" "}
                {QUIZ_QUESTIONS.length}
              </span>
              <span className="lf-caption text-lot-stone tabular-nums">
                {progressPercent}%
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="Backyard home eligibility quiz progress"
              aria-valuemin={1}
              aria-valuemax={QUIZ_QUESTIONS.length}
              aria-valuenow={stepIndex + 1}
              className="h-1.5 w-full bg-lot-line"
            >
              <div
                className="h-full bg-lot-orange transition-[width] duration-200 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <span className="lf-kicker-dense text-lot-orange-ink">
              Check {currentQuestion.number}
            </span>
            <h2 className="lf-card-heading text-lot-ink">
              {currentQuestion.prompt}
            </h2>
            <p className="lf-body-sm text-lot-stone">
              {currentQuestion.helper}
            </p>
          </div>

          <div
            className="grid gap-3 sm:grid-cols-2"
            role="group"
            aria-label={`Question ${stepIndex + 1} choices`}
          >
            <Button
              variant={
                answers[currentQuestion.id] === "yes" ? "selected" : "secondary"
              }
              size="lg"
              fullWidth
              onClick={() => handleAnswer("yes")}
              className="justify-between text-left"
            >
              <span>{currentQuestion.yesLabel}</span>
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </Button>
            <Button
              variant={
                answers[currentQuestion.id] === "no" ? "selected" : "secondary"
              }
              size="lg"
              fullWidth
              onClick={() => handleAnswer("no")}
              className="justify-between text-left"
            >
              <span>{currentQuestion.noLabel}</span>
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-lot-line pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              disabled={stepIndex === 0}
            >
              Back
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView("direct_address")}
              className="text-lot-orange-ink"
            >
              Skip to address check
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5" aria-live="polite">
          {view === "result" ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <StatusChip
                  status={evaluation.verdict}
                  label={evaluation.chipLabel}
                  size="md"
                />
                <span className="lf-caption text-lot-stone tabular-nums">
                  {evaluation.yesCount} of {QUIZ_QUESTIONS.length} signals clear
                </span>
              </div>

              <PanelHeader
                as="h2"
                eyebrow={`Suggested test footprint: ${evaluation.recommendedFootprint} sq ft`}
                title={evaluation.headline}
                sub={evaluation.summary}
              />

              <ul
                className="divide-y divide-lot-line border border-lot-line bg-lot-chalk"
                aria-label="Checklist breakdown"
              >
                {evaluation.checks.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-3 px-3.5 py-2.5"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="lf-body-sm font-medium text-lot-ink">
                        <span className="mr-1.5 text-lot-stone tabular-nums">
                          {item.number}
                        </span>
                        {item.prompt}
                      </p>
                      <p className="lf-caption text-lot-stone">{item.note}</p>
                    </div>
                    <StatusChip
                      status={item.status}
                      label={item.answer === "yes" ? "Yes" : "Check"}
                      size="sm"
                      className="shrink-0"
                    />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <PanelHeader
              as="h2"
              eyebrow="Direct parcel check"
              title="Test your address against modeled setbacks in 3D"
              sub="Skip straight to parcel lines, backyard home placement, and local cost estimates."
            />
          )}

          <div className="border-t border-lot-line pt-4">
            <LotAnswerCard
              surface="quiz"
              tone="light"
              footprint={demoSize}
              query={address}
              onQueryChange={setAddress}
              inputId={addressInputId}
              inputLabel="Check your exact address in the 3D studio"
              inputLabelSrOnly={false}
              placeholder="1420 Coyote Brush Ct, San Diego, CA"
              submitLabel="Check my lot"
              onLookupStart={() => {
                trackEvent("eligibility_quiz_studio_cta", {
                  source: "quiz_address_form",
                  completed: view === "result",
                  verdict: view === "result" ? evaluation.verdict : "skipped",
                  recommended_sq_ft: demoSize,
                });
              }}
              onAuthGateRequired={() => setShowAuthGate(true)}
              helperText={
                <p className="lf-caption text-lot-stone flex items-center gap-1.5">
                  <Check
                    className="h-3.5 w-3.5 shrink-0 text-status-eligible"
                    aria-hidden="true"
                  />
                  <span>
                    No account required for up to 3 lot lookups. Estimates only.
                  </span>
                </p>
              }
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-lot-line pt-3">
            <div className="flex flex-wrap items-center gap-2">
              {view === "direct_address" ? (
                <Button variant="ghost" size="sm" onClick={handleBack}>
                  Back to quiz
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRetake}
                  leftIcon={
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  }
                >
                  Retake quiz
                </Button>
              )}
            </div>
            <Link
              href={`/studio?parcel=coyote-brush&size=${demoSize}`}
              prefetch={false}
              onClick={() => {
                stashEntrySource("landing_cta");
                trackEvent("eligibility_quiz_studio_cta", {
                  source: "sample_lot_link",
                  completed: view === "result",
                  verdict: view === "result" ? evaluation.verdict : "skipped",
                  recommended_sq_ft: demoSize,
                });
              }}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-control px-2 lf-body-sm font-medium text-lot-orange-ink underline underline-offset-4 hover:text-lot-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
            >
              <span>Explore sample {demoSize} sq ft lot</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}

      {showAuthGate ? (
        <LandingAuthGate
          initialMode="sign-up"
          analyticsSource="guest_limit"
          onAuthenticated={() => {
            setShowAuthGate(false);
            proceedToStudio("quiz_auth_gate");
          }}
          onDismiss={() => setShowAuthGate(false)}
        />
      ) : null}
    </Bezel>
  );
}
