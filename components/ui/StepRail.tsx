"use client";

import * as React from "react";
import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

/** Lifecycle of a step in the guided journey. */
export type StepState = "done" | "current" | "upcoming" | "locked";

/** A single step in the studio spine. */
export interface Step {
  /** Stable id passed back to `onSelect`. */
  id: string;
  /** Human label. */
  label: string;
  /** Lifecycle state. */
  state: StepState;
  /** Marks a revenue destination (certificate / builders) with a `$` signifier. */
  revenue?: boolean;
}

/** Shared props for the spine navigators. */
export interface StepNavProps {
  /** The ordered steps. */
  steps: Step[];
  /** Called with the id of an enabled step when activated. */
  onSelect: (id: string) => void;
  /** Accessible name for the navigation landmark. */
  "aria-label"?: string;
  className?: string;
}

const STATE_SR: Record<StepState, string> = {
  done: "completed",
  current: "current step",
  upcoming: "upcoming",
  locked: "locked",
};

/** Arrow-key roving focus that skips locked steps. */
function useArrowNav(steps: Step[], orientation: "vertical" | "horizontal") {
  const refs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const nextKey = orientation === "vertical" ? "ArrowDown" : "ArrowRight";
  const prevKey = orientation === "vertical" ? "ArrowUp" : "ArrowLeft";

  function handleKeyDown(event: React.KeyboardEvent, index: number) {
    if (event.key !== nextKey && event.key !== prevKey) return;
    event.preventDefault();
    const direction = event.key === nextKey ? 1 : -1;
    for (let i = index + direction; i >= 0 && i < steps.length; i += direction) {
      if (steps[i].state !== "locked") {
        refs.current[steps[i].id]?.focus();
        return;
      }
    }
  }

  return { refs, handleKeyDown };
}

/** The revenue `$` signifier (hidden from assistive tech; label carries meaning). */
function RevenueMark({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold",
        tone === "dark"
          ? "bg-lf-espresso/45 text-lf-money-on-dark"
          : "bg-lf-forest-soft text-lf-forest",
      )}
    >
      $
    </span>
  );
}

/** Circular step indicator; always an explicit equal width/height (true circle). */
function StepDot({ step, index }: { step: Step; index: number }) {
  const base = "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold";
  if (step.state === "done") {
    return (
      <span aria-hidden className={cn(base, "border-lf-forest bg-lf-forest text-lf-sand")}>
        <Check size={14} />
      </span>
    );
  }
  if (step.state === "current") {
    return <span aria-hidden className={cn(base, "border-lf-clay bg-lf-clay text-lf-sand")}>{index + 1}</span>;
  }
  if (step.state === "locked") {
    return (
      <span aria-hidden className={cn(base, "border-lf-hairline bg-lf-sand-2 text-lf-taupe")}>
        <Lock size={12} />
      </span>
    );
  }
  return <span aria-hidden className={cn(base, "border-lf-hairline bg-lf-card text-lf-muted")}>{index + 1}</span>;
}

/**
 * The desktop studio spine — a vertical navigation landmark replacing the old
 * sidebar + tab-bar double nav. Each step is a button; the current one carries
 * `aria-current="step"`, locked steps are disabled, and Arrow Up/Down move focus
 * between enabled steps. Purely presentational of a caller-supplied model; the
 * orchestrator owns which step maps to which view.
 */
export function StepRail({ steps, onSelect, className, ...aria }: StepNavProps) {
  const { refs, handleKeyDown } = useArrowNav(steps, "vertical");
  return (
    <nav aria-label={aria["aria-label"]} className={cn("flex flex-col gap-1", className)}>
      {steps.map((step, index) => {
        const locked = step.state === "locked";
        return (
          <button
            key={step.id}
            ref={(el) => {
              refs.current[step.id] = el;
            }}
            type="button"
            disabled={locked}
            aria-current={step.state === "current" ? "step" : undefined}
            onClick={() => !locked && onSelect(step.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "group flex items-center gap-3 rounded-full px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-lf-mahogany",
              step.state === "current" && "bg-lf-sand/10",
              !locked && step.state !== "current" && "hover:bg-lf-sand/5",
              locked && "cursor-not-allowed opacity-55",
            )}
          >
            <StepDot step={step} index={index} />
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "block truncate text-sm font-semibold",
                  step.state === "current" ? "text-lf-sand" : "text-lf-taupe",
                )}
              >
                {step.label}
              </span>
            </span>
            {step.revenue ? <RevenueMark tone="dark" /> : null}
            <span className="sr-only">, {STATE_SR[step.state]}</span>
          </button>
        );
      })}
    </nav>
  );
}

/**
 * The mobile studio spine — a compact horizontal progress navigator with the
 * same model and semantics as {@link StepRail} (current step marked, locked
 * disabled, Arrow Left/Right roving). Sits at the top of the mobile studio.
 */
export function StepProgress({ steps, onSelect, className, ...aria }: StepNavProps) {
  const { refs, handleKeyDown } = useArrowNav(steps, "horizontal");
  return (
    <nav aria-label={aria["aria-label"]} className={cn("flex items-stretch gap-1", className)}>
      {steps.map((step, index) => {
        const locked = step.state === "locked";
        return (
          <button
            key={step.id}
            ref={(el) => {
              refs.current[step.id] = el;
            }}
            type="button"
            disabled={locked}
            aria-current={step.state === "current" ? "step" : undefined}
            onClick={() => !locked && onSelect(step.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-full px-1 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay-ink focus-visible:ring-inset",
              locked && "cursor-not-allowed opacity-55",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "h-1.5 w-full rounded-full",
                step.state === "done" && "bg-lf-forest",
                step.state === "current" && "bg-lf-clay",
                step.state === "upcoming" && "bg-lf-hairline",
                step.state === "locked" && "bg-lf-hairline/60",
              )}
            />
            <span className="flex items-center gap-1">
              <span
                className={cn(
                  "truncate text-[10px] font-semibold",
                  step.state === "current" ? "text-lf-espresso" : "text-lf-muted",
                )}
              >
                {step.label}
              </span>
              {step.revenue ? <RevenueMark /> : null}
            </span>
            <span className="sr-only">, {STATE_SR[step.state]}</span>
          </button>
        );
      })}
    </nav>
  );
}
