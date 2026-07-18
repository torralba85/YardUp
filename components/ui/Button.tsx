"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Visual intent:
 * - `commit` — forest; the action that pays (generate certificate, connect).
 *   Forest is money/readiness only, so it is reserved for value-completing CTAs.
 * - `primary` — clay; the everyday interactive accent ("the hand you click").
 * - `secondary` — hairline outline on card.
 * - `ghost` — text-only clay.
 */
export type ButtonVariant = "commit" | "primary" | "secondary" | "ghost";
export type ButtonSize = "xs" | "sm" | "md" | "lg";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  commit: "bg-lf-forest text-lf-sand hover:bg-lf-forest-strong",
  primary: "bg-lf-clay text-lf-sand hover:bg-lf-clay-strong",
  secondary:
    "border border-lf-hairline bg-lf-card text-lf-espresso hover:border-lf-taupe/50 hover:bg-lf-sand-2",
  ghost: "text-lf-clay-ink hover:bg-lf-clay-soft",
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  // xs is the compact-density step for the builder inbox's inline action rows,
  // where a 36px control would crowd the table detail panel.
  xs: "h-8 gap-1.5 px-3 text-xs",
  sm: "h-9 gap-1.5 px-3.5 text-sm",
  md: "h-11 gap-2 px-5 text-sm",
  lg: "h-12 gap-2 px-6 text-base",
};

/** Props for {@link Button}; extends native button attributes. */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual intent; defaults to `"primary"`. */
  variant?: ButtonVariant;
  /** Height/padding step; defaults to `"md"` (44px comfortable target). */
  size?: ButtonSize;
  /** Icon before the label. Suppressed while loading. */
  leftIcon?: React.ReactNode;
  /** Icon after the label. Suppressed while loading. */
  rightIcon?: React.ReactNode;
  /** Show a spinner, mark `aria-busy`, and disable interaction. */
  loading?: boolean;
  /** Stretch to the container width. */
  fullWidth?: boolean;
}

/**
 * The one button. Pill radius (clickable controls are pills per DESIGN.md),
 * accessible clay-ink focus ring (never amber — amber is a status color), and a settle-not-
 * bounce active press guarded by `motion-safe`. `loading` disables the control
 * and swaps the leading icon for a spinner without shifting the label.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      leftIcon,
      rightIcon,
      loading = false,
      fullWidth = false,
      disabled,
      type,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type ?? "button"}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(
          "inline-flex select-none items-center justify-center rounded-full font-semibold transition-[color,background-color,border-color,scale]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay-ink focus-visible:ring-offset-2",
          "motion-safe:active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-60",
          VARIANT_CLASS[variant],
          SIZE_CLASS[size],
          fullWidth && "w-full",
          className,
        )}
        {...props}
      >
        {loading ? (
          <span
            aria-hidden
            className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        ) : leftIcon ? (
          <span aria-hidden className="shrink-0">
            {leftIcon}
          </span>
        ) : null}
        {children}
        {!loading && rightIcon ? (
          <span aria-hidden className="shrink-0">
            {rightIcon}
          </span>
        ) : null}
      </button>
    );
  },
);

Button.displayName = "Button";
