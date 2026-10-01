"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Shared visual recipe for native text inputs and selects on chalk surfaces. */
export const fieldControlClass =
  "min-h-11 w-full rounded-[3px] border border-lot-stone bg-lot-chalk px-3 text-base sm:text-sm text-lot-ink placeholder:text-lot-stone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink aria-[invalid=true]:border-status-blocked disabled:cursor-not-allowed disabled:opacity-60";

/** Native text input with the shared field boundary, spacing, and focus treatment. */
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(fieldControlClass, className)} {...props} />;
  },
);
Input.displayName = "Input";

/** Native select with the shared field boundary, spacing, and focus treatment. */
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...props }, ref) {
    return <select ref={ref} className={cn(fieldControlClass, className)} {...props} />;
  },
);
Select.displayName = "Select";

/** Native multiline text control with the shared field boundary and focus treatment. */
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(fieldControlClass, "py-2", className)} {...props} />;
  },
);
Textarea.displayName = "Textarea";

/** Props for {@link FieldLabel}; extends native label attributes. */
export interface FieldLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  /** Optional right-aligned kicker-style value readout with tabular numerals. */
  value?: React.ReactNode;
}

/**
 * A control label in the kicker voice, with an optional value
 * readout on the right (e.g. the live figure a slider controls). Wire `htmlFor`
 * to the control's id.
 */
export function FieldLabel({ value, className, children, ...props }: FieldLabelProps) {
  return (
    <label className={cn("lf-kicker-dense flex items-center justify-between gap-2 text-lot-stone", className)} {...props}>
      <span>{children}</span>
      {value != null ? (
        <span className="font-sans text-xs font-semibold tabular-nums text-lot-ink">{value}</span>
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
              "min-h-11 rounded-[3px] border text-xs font-semibold motion-safe:transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2",
              checked
                ? "border-lot-ink bg-lot-ink text-lot-chalk"
                : "border-lot-line bg-lot-chalk text-lot-stone hover:border-lf-taupe/50 hover:bg-lf-sand-2",
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
 * An accessible range control with a kicker {@link FieldLabel} showing the live value,
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
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lot-orange-ink",
          "[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-lot-line",
          "[&::-webkit-slider-thumb]:-mt-[7px] [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-lot-ink [&::-webkit-slider-thumb]:bg-lot-orange",
          "[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-lot-line",
          "[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-lot-ink [&::-moz-range-thumb]:bg-lot-orange",
        )}
        {...props}
      />
    </div>
  );
}
