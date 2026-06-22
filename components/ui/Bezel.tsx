import * as React from "react";
import { cn } from "@/lib/utils";

/** Props for {@link Bezel}; extends the standard `div` props. */
export interface BezelProps extends React.ComponentPropsWithRef<"div"> {
  /** Class names applied to the inner card surface. */
  innerClassName?: string;
}

/**
 * A double-framed "bezel" container (outer rim + inset card) used to give
 * panels the engraved, instrument-like surface from `DESIGN.md`. Forwards a ref
 * and spreads remaining props onto the outer element.
 */
export const Bezel = React.forwardRef<HTMLDivElement, BezelProps>(
  ({ children, className, innerClassName, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col rounded-[2rem] border border-lf-hairline/25 bg-lf-taupe-soft p-1.5",
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "flex flex-col flex-1 rounded-[1.625rem] bg-lf-card shadow-[inset_0_1px_2px_rgba(255,250,240,0.95),0_1px_3px_rgba(38,19,7,0.05)]",
            innerClassName
          )}
        >
          {children}
        </div>
      </div>
    );
  }
);

Bezel.displayName = "Bezel";
