"use client";

import * as React from "react";
import { formatCurrency } from "@/lib/feasibility";
import { useCountUp } from "@/components/ui/use-count-up";
import { cn } from "@/lib/utils";

/** Money display size, mapped to the `lf-money-*` Major Third scale in globals.css. */
export type MoneyFigureSize = "hero" | "band" | "inline" | "sm";
/** Money surface tone. Money is always carbon or chalk — never green. */
export type MoneyFigureTone = "onLight" | "onDark" | "forest";
/** Small trailing unit (Manrope). Empty string renders no unit. */
export type MoneyFigureUnit = "/mo" | "/yr" | "yrs" | "";

/* Sizes sit on the Major Third money scale (globals.css `lf-money-*`): 20 · 25 · 31 · 39 ·
   49 · 61–76. `sm` stays on the body ramp for money set inside prose rows. */
const SIZE_CLASS: Record<MoneyFigureSize, string> = {
  hero: "text-[3.8125rem] leading-none sm:text-[4.75rem]",
  band: "text-[3.0625rem] leading-none",
  inline: "text-[1.25rem] leading-none",
  sm: "text-sm leading-none",
};

const UNIT_SIZE_CLASS: Record<MoneyFigureSize, string> = {
  hero: "text-base",
  band: "text-sm",
  inline: "text-[10px]",
  sm: "text-[10px]",
};

const TONE_CLASS: Record<MoneyFigureTone, string> = {
  onLight: "text-lf-espresso",
  onDark: "text-lf-money-on-dark",
  // Vestigial name: A LOT MORE retired money-green, so this renders carbon like
  // every other recorded fact across the product.
  forest: "text-lf-money",
};

const UNIT_TONE_CLASS: Record<MoneyFigureTone, string> = {
  onLight: "text-lf-muted",
  onDark: "text-lf-unit-on-dark",
  forest: "text-lf-muted",
};

/** Props for {@link MoneyFigure}. */
export interface MoneyFigureProps {
  /** The dollar amount. Rounded to whole dollars for display. */
  value: number;
  /** Trailing unit; defaults to `"/mo"`. Pass `""` to omit. */
  unit?: MoneyFigureUnit;
  /** Size step; defaults to `"band"`. */
  size?: MoneyFigureSize;
  /** Surface tone; defaults to `"onLight"`. */
  tone?: MoneyFigureTone;
  /** Count up to the value when motion is allowed; snaps under reduced motion. */
  animate?: boolean;
  /** Element to render as; defaults to `"span"`. */
  as?: React.ElementType;
  /** Extra classes merged onto the root element. */
  className?: string;
}

/**
 * The single canonical way to render a money figure across LotFoundry — Space Grotesk
 * numerals, tabular figures, and a small Manrope unit. Replaces the four
 * divergent `$/mo` treatments the studio grew (band / rail / metrics / estimate)
 * so the asset figure reads with one voice everywhere.
 *
 * `animate` opts into the mechanical count-up (design-system §5: things settle, nothing bounces). The underlying
 * {@link useCountUp} snaps immediately under `prefers-reduced-motion` and in
 * jsdom, so the final value is always present without extra wiring.
 */
export function MoneyFigure({
  value,
  unit = "/mo",
  size = "band",
  tone = "onLight",
  animate = false,
  as,
  className,
}: MoneyFigureProps) {
  const Component = as ?? "span";
  // The hook must be called unconditionally; select the static value when the
  // caller has not opted into motion.
  const animated = useCountUp(value);
  const shown = animate ? animated : value;

  // Rendered via createElement so the polymorphic `as` element accepts children
  // without TS collapsing the child prop of the ElementType union to `never`.
  return React.createElement(
    Component,
    {
      "data-money": true,
      className: cn(
        "inline-flex items-baseline font-display font-semibold tabular-nums",
        SIZE_CLASS[size],
        TONE_CLASS[tone],
        className,
      ),
    },
    <span>{formatCurrency(Math.round(shown))}</span>,
    unit ? (
      <span className={cn("ml-1 font-sans font-medium", UNIT_SIZE_CLASS[size], UNIT_TONE_CLASS[tone])}>
        {unit}
      </span>
    ) : null,
  );
}
