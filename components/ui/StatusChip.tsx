import * as React from "react";
import { AlertTriangle, BadgeDollarSign, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/** Constraint/verdict status. */
export type StatusChipStatus = "clear" | "review" | "blocked" | "info";
/** Chip density. */
export type StatusChipSize = "sm" | "md";

interface StatusConfig {
  icon: typeof CheckCircle2;
  label: string;
  className: string;
}

// Tones are chosen for WCAG AA on light surfaces: `review` uses the deepened
// amber ink (#8A5300, ~6:1 on card), never the base amber fill hue which fails
// as small text. Label + icon always carry the meaning, so colour is never the
// sole signal.
const CONFIG: Record<StatusChipStatus, StatusConfig> = {
  clear: {
    icon: CheckCircle2,
    label: "Clear",
    className: "text-lf-forest bg-lf-forest-soft border-lf-forest/30",
  },
  review: {
    icon: AlertTriangle,
    label: "Review",
    className: "text-lf-amber-ink bg-lf-amber-soft border-lf-amber-ink/30",
  },
  blocked: {
    icon: XCircle,
    label: "Blocked",
    className: "text-lf-brick bg-lf-brick-soft border-lf-brick/30",
  },
  info: {
    icon: BadgeDollarSign,
    label: "Info",
    className: "text-lf-muted bg-lf-taupe-soft border-lf-hairline",
  },
};

/** Props for {@link StatusChip}. */
export interface StatusChipProps {
  /** The status the chip reports. */
  status: StatusChipStatus;
  /** Override the default per-status label. */
  label?: string;
  /** Density; defaults to `"sm"`. */
  size?: StatusChipSize;
  /** Extra classes. */
  className?: string;
}

/**
 * The one status chip (clear / review / blocked / info). Rectangular because
 * chips are read-only recorded data, not clickable controls (radius policy), and
 * always icon + label so status never rides on colour alone.
 */
export function StatusChip({ status, label, size = "sm", className }: StatusChipProps) {
  const config = CONFIG[status];
  const Icon = config.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-none border font-sans font-semibold uppercase tracking-[0.14em]",
        size === "sm" ? "h-[22px] px-2 text-[9.5px]" : "h-6 px-2.5 text-[11px]",
        config.className,
        className,
      )}
    >
      <Icon size={size === "sm" ? 11 : 13} aria-hidden className="shrink-0" />
      {label ?? config.label}
    </span>
  );
}
