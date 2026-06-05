import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface CTAButtonProps {
  href: string;
  children: React.ReactNode;
  size?: "md" | "lg";
  className?: string;
}

export function CTAButton({ href, children, size = "md", className }: CTAButtonProps) {
  const sizeClasses =
    size === "lg"
      ? "min-h-14 gap-3 px-7 text-lg"
      : "min-h-12 gap-3 px-5 text-base";

  return (
    <Link
      href={href}
      className={`group inline-flex items-center rounded-full bg-lf-mahogany font-semibold text-lf-sand transition-colors active:scale-[0.98] hover:bg-lf-clay ${sizeClasses} ${className ?? ""}`}
    >
      {children}
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-lf-sand/15 transition-transform duration-300 group-hover:translate-x-0.5">
        <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}
