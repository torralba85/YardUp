import * as React from "react";
import { cn } from "@/lib/utils";

/** Heading level for {@link PanelHeader}, so the document outline stays correct. */
export type PanelHeadingLevel = "h1" | "h2" | "h3" | "h4";

/** Props for {@link PanelHeader}. */
export interface PanelHeaderProps {
  /** Optional uppercase kicker above the title, in deep orange ink. */
  eyebrow?: React.ReactNode;
  /** The panel title, set in the display face. */
  title: React.ReactNode;
  /** Optional muted supporting line under the title. */
  sub?: React.ReactNode;
  /** Optional trailing controls (aligned to the header's top-right). */
  actions?: React.ReactNode;
  /** Heading element; defaults to `"h2"`. */
  as?: PanelHeadingLevel;
  /** Id applied to the heading so a panel can reference it via `aria-labelledby`. */
  id?: string;
  /** Extra classes for the header row. */
  className?: string;
}

/**
 * The standard panel header row: an optional kicker eyebrow, a display-face title,
 * an optional muted sub-line, and optional trailing actions — with the hairline
 * divider and the canonical `px-6 pt-5 pb-4` rhythm baked in (replacing the
 * hand-rolled `px-[22px] pt-[18px]` variants scattered across the studio).
 */
export function PanelHeader({ eyebrow, title, sub, actions, as: Heading = "h2", id, className }: PanelHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 border-b border-lot-line px-6 pb-4 pt-5", className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="lf-kicker pb-1 text-lot-orange-ink">{eyebrow}</p> : null}
        <Heading id={id} className="lf-panel-heading text-lot-ink">
          {title}
        </Heading>
        {sub ? <p className="lf-body-sm mt-1 text-lot-stone">{sub}</p> : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
