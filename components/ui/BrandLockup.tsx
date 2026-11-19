import { cn } from "@/lib/utils";
import { COLOR } from "@/lib/design-tokens";


export function ParcelMark({ className, strokeWidth = 4 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
      <path
        d="M27 9H9v30h30V21M24 24 39 9M28 9h11v11"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
      />
      <circle cx="39" cy="9" r="3" fill={COLOR["lot-orange"]} />
    </svg>
  );
}

/** Shared landing-aligned identity for product, account, and legal shells. */
export function BrandLockup({ inverse = false, className }: { inverse?: boolean; className?: string }) {
  return (
    <span role="img" aria-label="LotFoundry" className={cn("inline-flex items-center gap-1.5 whitespace-nowrap min-[360px]:gap-2.5", inverse ? "text-lot-chalk" : "text-lot-ink", className)}>
      <ParcelMark className="h-full max-h-10 w-auto shrink-0" />
      <span aria-hidden="true" className="font-display text-lg font-semibold tracking-[-0.055em] min-[360px]:text-2xl">LotFoundry.</span>
    </span>
  );
}
