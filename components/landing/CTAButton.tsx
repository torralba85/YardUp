import Link, { LinkProps } from "next/link";
import { ArrowRight } from "lucide-react";

interface CTAButtonProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>, LinkProps {
  children: React.ReactNode;
  size?: "md" | "lg";
  className?: string;
}

/**
 * Pill-shaped primary call-to-action link with a trailing arrow and motion-safe
 * hover/active transforms. Wraps Next.js `Link`, so it accepts all link props
 * plus a `size` ("md" | "lg").
 *
 * @param props - Link props plus `size` and `className`.
 */
export function CTAButton({
  href,
  children,
  size = "md",
  className,
  ...props
}: CTAButtonProps) {
  const sizeClasses =
    size === "lg"
      ? "min-h-14 gap-3 pl-7 pr-2.5 text-lg"
      : "min-h-12 gap-3 pl-5 pr-2 text-base";

  return (
    <Link
      href={href}
      className={`group inline-flex items-center justify-between gap-4 rounded-full border border-lf-sand/15 bg-lf-mahogany font-semibold text-lf-sand transition-[background-color,border-color,color,transform] duration-300 hover:bg-lf-clay motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2 ${sizeClasses} ${className ?? ""}`}
      {...props}
    >
      <span>{children}</span>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lf-sand/15 transition-transform duration-300 group-hover:translate-x-0.5">
        <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}
