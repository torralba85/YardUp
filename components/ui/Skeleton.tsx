import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A loading placeholder block that stands in for content while it loads.
 *
 * Uses a warm taupe fill with a subtle pulse; the global
 * `prefers-reduced-motion` rule disables the animation. Wrap a group of
 * skeletons in an element with `role="status"` + an `aria-label` (and an
 * `sr-only` "Loading…") so the loading state is announced to assistive tech.
 *
 * @param props.className - Sizing/shape utilities; defaults to sharp corners to
 *   match the surface it replaces (override per-use, e.g. `rounded-full`).
 */
export function Skeleton({
  className,
  ...props
}: React.ComponentPropsWithRef<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn("motion-safe:animate-pulse rounded-none bg-lf-taupe-soft", className)}
      {...props}
    />
  );
}
