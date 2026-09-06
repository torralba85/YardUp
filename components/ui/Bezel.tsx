import * as React from "react";
import { cn } from "@/lib/utils";

/** Props for {@link Bezel}; extends the standard `div` props. */
export interface BezelProps extends React.ComponentPropsWithRef<"div"> {
  /** Class names applied to the inner card surface. */
  innerClassName?: string;
}

/**
 * A square architectural drawing-board container used to give
 * panels the paper surface from `docs/design/design-system.md`. Forwards a ref
 * and spreads remaining props onto the outer element.
 */
export const Bezel = React.forwardRef<HTMLDivElement, BezelProps>(
  ({ children, className, innerClassName, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col rounded-none border border-lf-hairline bg-lf-card shadow-[12px_16px_0_#E7E7DF]",
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "flex flex-col flex-1 rounded-none bg-lf-card",
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
