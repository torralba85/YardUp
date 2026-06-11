import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";

type Variant = "primary" | "outline" | "inverted";

const SURFACE: Record<Variant, string> = {
  primary:
    "bg-lf-mahogany text-lf-sand shadow-[0_12px_32px_-14px_rgba(38,19,7,0.55)] hover:bg-lf-clay hover:shadow-[0_16px_40px_-14px_rgba(38,19,7,0.5)]",
  outline:
    "border border-lf-hairline bg-lf-card/70 text-lf-espresso backdrop-blur hover:border-lf-taupe hover:bg-lf-card",
  inverted:
    "bg-lf-sand text-lf-espresso shadow-[0_12px_32px_-14px_rgba(0,0,0,0.5)] hover:bg-lf-card",
};

const ICON_WELL: Record<Variant, string> = {
  primary: "bg-lf-sand/15 text-lf-sand",
  outline: "bg-lf-taupe-soft text-lf-clay",
  inverted: "bg-lf-espresso/10 text-lf-espresso",
};

/**
 * Pill CTA with the arrow nested in its own circular well. The well slides
 * forward on hover (kinetic tension) and the whole pill compresses on press.
 */
export function CTAButton({
  href,
  children,
  variant = "primary",
  size = "md",
  arrow = true,
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  size?: "md" | "lg";
  arrow?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "group inline-flex items-center justify-center gap-3 rounded-full font-semibold",
        "transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]",
        size === "lg" ? "min-h-14 pl-8 pr-2.5 text-lg" : "min-h-12 pl-6 pr-2 text-base",
        !arrow && (size === "lg" ? "px-8" : "px-6"),
        SURFACE[variant],
        className
      )}
    >
      {children}
      {arrow && (
        <span
          aria-hidden="true"
          className={clsx(
            "grid place-items-center rounded-full transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5",
            size === "lg" ? "h-9 w-9" : "h-8 w-8",
            ICON_WELL[variant]
          )}
        >
          <ArrowRight className={size === "lg" ? "h-4.5 w-4.5" : "h-4 w-4"} />
        </span>
      )}
    </Link>
  );
}
