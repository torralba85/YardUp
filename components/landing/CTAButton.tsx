import Link, { LinkProps } from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

// Extend native anchor properties and Next.js Link props, omitting conflicting motion/event handlers
interface CTAButtonProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps | "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart">, LinkProps {
  children: React.ReactNode;
  size?: "md" | "lg";
  className?: string;
}

// Convert Next.js Link into a motion element
const MotionLink = motion.create(Link);

export function CTAButton({ 
  href, 
  children, 
  size = "md", 
  className,
  ...props 
}: CTAButtonProps) {
  const reducedMotion = useReducedMotion();
  
  const sizeClasses =
    size === "lg"
      ? "min-h-14 gap-3 pl-7 pr-2.5 text-lg"
      : "min-h-12 gap-3 pl-5 pr-2 text-base";

  return (
    <MotionLink
      href={href}
      whileHover={reducedMotion ? undefined : { scale: 1.02 }}
      whileTap={reducedMotion ? undefined : { scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
      className={`group inline-flex items-center justify-between gap-4 rounded-full bg-lf-mahogany font-semibold text-lf-sand border border-lf-sand/15 transition-colors duration-300 hover:bg-lf-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-amber focus-visible:ring-offset-2 ${sizeClasses} ${className ?? ""}`}
      {...props}
    >
      <span>{children}</span>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lf-sand/15 transition-transform duration-300 group-hover:translate-x-0.5">
        <ArrowRight className="h-4 w-4" />
      </span>
    </MotionLink>
  );
}


