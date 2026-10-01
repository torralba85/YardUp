"use client";

import * as React from "react";

/** Props for each option element returned by {@link useRadioGroup}'s `getRadioProps`. */
export interface RadioItemProps {
  role: "radio";
  "aria-checked": boolean;
  tabIndex: 0 | -1;
  onClick: () => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
  ref: (element: HTMLElement | null) => void;
}

/**
 * The WAI-ARIA radio-group behaviour of `Segmented` (components/ui/Field) for
 * single-choice groups whose options need their own visuals (swatches, icons,
 * dark overlays). Spread `groupProps` on the container (and give it an
 * `aria-label`) and `getRadioProps(value)` on each option: a roving tabindex
 * keeps only the checked option tabbable, and Arrow/Home/End move focus *and*
 * select, wrapping at the ends.
 */
export function useRadioGroup<T extends string | number>({
  value,
  onChange,
  values,
}: {
  value: T;
  onChange: (value: T) => void;
  values: readonly T[];
}): { groupProps: { role: "radiogroup" }; getRadioProps: (option: T) => RadioItemProps } {
  const refs = React.useRef<Record<string | number, HTMLElement | null>>({});
  const selectedIndex = values.indexOf(value);

  function move(nextIndex: number) {
    const wrapped = (nextIndex + values.length) % values.length;
    const next = values[wrapped];
    onChange(next);
    refs.current[next]?.focus();
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
        move(values.length - 1);
        break;
      default:
        break;
    }
  }

  return {
    groupProps: { role: "radiogroup" },
    getRadioProps: (option: T) => {
      const index = values.indexOf(option);
      const checked = option === value;
      // When nothing matches, keep the first option reachable so the group is
      // never a tab dead-end.
      const tabbable = checked || (selectedIndex === -1 && index === 0);
      return {
        role: "radio",
        "aria-checked": checked,
        tabIndex: tabbable ? 0 : -1,
        onClick: () => onChange(option),
        onKeyDown: (event: React.KeyboardEvent) => handleKeyDown(event, index),
        ref: (element: HTMLElement | null) => {
          refs.current[option] = element;
        },
      };
    },
  };
}
