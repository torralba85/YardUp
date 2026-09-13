"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Props for {@link FieldLabel}; extends native label attributes. */
export interface FieldLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  /** Optional right-aligned value readout (mono, tabular). */
  value?: React.ReactNode;
}

/**
 * A control label in the mono "recorded fact" voice, with an optional value
 * readout on the right (e.g. the live figure a slider controls). Wire `htmlFor`
 * to the control's id.
 */
export function FieldLabel({ value, className, children, ...props }: FieldLabelProps) {
  return (
    <label className={cn("lf-kicker-dense flex items-center justify-between gap-2 text-lf-muted", className)} {...props}>
      <span>{children}</span>
      {value != null ? (
        <span className="font-sans text-xs font-semibold tabular-nums text-lf-espresso">{value}</span>
      ) : null}
    </label>
  );
}

/** A single {@link Segmented} choice. */
export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
}

/** Props for {@link Segmented}. */
export interface SegmentedProps<T extends string> {
  /** The currently selected value. */
  value: T;
  /** Called with the newly selected value. */
  onChange: (value: T) => void;
  /** The choices, left to right. */
  options: SegmentedOption<T>[];
  /** Accessible group name (use this or `aria-labelledby`). */
  "aria-label"?: string;
  /** Id of an external label element naming the group. */
  "aria-labelledby"?: string;
  className?: string;
}

/**
 * The recurring 2–3 way choice (rent basis, roof, finish) implemented as a
 * proper WAI-ARIA radiogroup: `role="radiogroup"` with `role="radio"` children,
 * a roving tabindex (only the checked option is tabbable), and Arrow/Home/End
 * keys that move *and* select, wrapping at the ends. Replaces the hand-rolled
 * `aria-pressed` button rows, which announced as toggles rather than a choice.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  ...aria
}: SegmentedProps<T>) {
  const refs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const selectedIndex = options.findIndex((option) => option.value === value);

  function move(nextIndex: number) {
    const wrapped = (nextIndex + options.length) % options.length;
    const next = options[wrapped];
    onChange(next.value);
    refs.current[next.value]?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent, index: number) {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        move(index + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        move(index - 1);
        break;
      case "Home":
        event.preventDefault();
        move(0);
        break;
      case "End":
        event.preventDefault();
        move(options.length - 1);
        break;
      default:
        break;
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label={aria["aria-label"]}
      aria-labelledby={aria["aria-labelledby"]}
      className={cn("grid gap-2", className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option, index) => {
        const checked = option.value === value;
        // When nothing matches (shouldn't happen in practice), keep the first
        // option reachable so the group is never a tab dead-end.
        const tabbable = checked || (selectedIndex === -1 && index === 0);
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[option.value] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={tabbable ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "min-h-11 rounded-[3px] border text-xs font-semibold motion-safe:transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay-ink focus-visible:ring-offset-2",
              checked
                ? "border-lf-espresso bg-lf-espresso text-lf-sand"
                : "border-lf-hairline bg-lf-card text-lf-muted hover:border-lf-taupe/50 hover:bg-lf-sand-2",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Props for {@link Slider}; extends native range input attributes. */
export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Visible + accessible label. */
  label: string;
  /** Human-readable current value (e.g. `"600 sf"`) — visible readout + aria-valuetext. */
  valueText?: string;
  /** Required id linking the label to the input. */
  id: string;
}

/**
 * An accessible range control: a mono {@link FieldLabel} showing the live value,
 * and a native `type=range` whose accessible name is the label and whose current
 * value is announced via `aria-valuetext` (so screen readers hear "600 sf", not
 * a bare number). The tall hit area keeps the thumb comfortable to grab.
 */
export function Slider({ label, valueText, id, className, ...props }: SliderProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <FieldLabel htmlFor={id} value={valueText}>
        {label}
      </FieldLabel>
      <input
        id={id}
        type="range"
        aria-label={label}
        aria-valuetext={valueText}
        className={cn(
          "h-11 w-full cursor-pointer appearance-none bg-transparent",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lf-clay-ink",
          "[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-lf-hairline",
          "[&::-webkit-slider-thumb]:-mt-[7px] [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-lot-ink [&::-webkit-slider-thumb]:bg-lf-clay",
          "[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-lf-hairline",
          "[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-lot-ink [&::-moz-range-thumb]:bg-lf-clay",
        )}
        {...props}
      />
    </div>
  );
}
