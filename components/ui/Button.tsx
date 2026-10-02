"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

/**
 * Visual intent in A LOT MORE:
 * - `primary` — Signal Orange (#FF5B24) fill with carbon label (#161616); hover #EE4B17.
 * - `commit` — Carbon (#161616) fill with chalk label (#F5F5F0); hover #33332F.
 * - `selected` — Carbon fill with chalk label in toggle sets.
 * - `secondary` — Stone control boundary on chalk ground (#F5F5F0).
 * - `ghost` — Text-only carbon with soft hover wash.
 * - `destructive` — Blocked red (#A82D16) fill with chalk label.
 */
export type ButtonVariant =
  | "commit"
  | "primary"
  | "selected"
  | "secondary"
  | "ghost"
  | "destructive";
export type ButtonSize = "xs" | "sm" | "md" | "lg";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "bg-lot-orange text-lot-ink hover:bg-lot-orange-hover",
  commit: "bg-lot-ink text-lot-chalk hover:bg-lot-ink-hover",
  selected:
    "border border-lot-ink bg-lot-ink text-lot-chalk ring-1 ring-lot-ink/20",
  secondary:
    "border border-lot-stone bg-lot-chalk text-lot-ink hover:border-lot-ink hover:bg-lot-surface",
  ghost: "text-lot-ink hover:bg-lot-line/30",
  destructive:
    "bg-status-blocked text-lot-chalk hover:bg-status-blocked-hover focus-visible:ring-status-blocked",
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  // Compact variants reduce type and padding, never the 44px touch target.
  xs: "min-h-11 gap-1.5 px-3 text-xs",
  sm: "min-h-11 gap-1.5 px-3.5 text-sm",
  // The design-system §6 button: min-height 48px, padding 12px 19px, 14px.
  // Leading icons keep an 8px gap; §6's 18px gap separates a trailing arrow.
  md: "min-h-12 gap-2 px-[19px] py-3 text-sm",
  lg: "h-12 gap-2 px-6 text-base",
};

/** Props for {@link Button}; extends native button attributes. */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual intent; defaults to `"primary"`. */
  variant?: ButtonVariant;
  /** Height/padding step; defaults to `"md"` (the 48px §6 button). */
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
 * The canonical button for A LOT MORE: 3px control radius, ground-pinned
 * focus ring (2px solid), and a settle-not-bounce active press guarded by
 * `motion-safe`. `loading` disables the control and swaps the leading icon
 * for a spinner without shifting the label.
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
      onClick,
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
          "inline-flex select-none items-center justify-center rounded-control font-bold motion-safe:transition",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2",
          "motion-safe:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
          VARIANT_CLASS[variant],
          SIZE_CLASS[size],
          fullWidth && "w-full",
          className,
        )}
        onClick={(event) => {
          // Commit gets the weightier pattern and ordinary primary actions get
          // a light tick. Selection variants describe pre-click state, so
          // buzzing here would fire on an already-selected choice rather than
          // the newly selected one. Secondary, ghost, selected, and destructive
          // controls therefore stay silent.
          if (variant === "commit") {
            haptic("commit");
          } else if (variant === "primary") {
            haptic("tap");
          }
          onClick?.(event);
        }}
        {...props}
      >
        {loading ? (
          <span
            aria-hidden
            className="h-4 w-4 shrink-0 motion-safe:animate-spin rounded-full border-2 border-current border-t-transparent"
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
