import { cn } from "@/lib/utils";

/** Shared landing-aligned identity for product, account, and legal shells. */
export function BrandLockup({ inverse = false, className }: { inverse?: boolean; className?: string }) {
  return (
    <span role="img" aria-label="LotFoundry" className={cn("inline-flex items-center gap-2.5 whitespace-nowrap", inverse ? "text-lot-chalk" : "text-lot-ink", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/landing/a-lot-more/mark.svg" alt="" aria-hidden="true" className="h-full max-h-10 w-auto" />
      <span aria-hidden="true" className="font-display text-2xl font-semibold tracking-[-0.055em]">LotFoundry.</span>
    </span>
  );
}
