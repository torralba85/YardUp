import * as React from "react";
import { cn } from "@/lib/utils";

/** Panel surface tint. */
export type PanelSurface = "card" | "sand" | "raised";

const SURFACE_CLASS: Record<PanelSurface, string> = {
  card: "bg-lf-card",
  sand: "bg-lf-sand-2",
  raised: "bg-lf-card shadow-[0_1px_3px_rgba(38,19,7,0.06)]",
};

/** Props for {@link Panel}. */
export interface PanelProps extends React.HTMLAttributes<HTMLElement> {
  /** Surface tint; defaults to `"card"`. */
  surface?: PanelSurface;
  /** Apply the standard panel padding to the whole surface. */
  padded?: boolean;
  /** Element/landmark to render as; defaults to `"section"`. */
  as?: React.ElementType;
}

/**
 * The standard studio rail/card surface: `lf-card` (or sand/raised) with the
 * hairline border every panel shares. Callers stop re-declaring
 * `border border-lf-hairline bg-lf-card` inline, so surfaces stay consistent.
 * Render as `aside`/`section`/`div` via `as` to keep the correct landmark.
 */
export function Panel({ surface = "card", padded = false, as, className, children, ...props }: PanelProps) {
  const Component = as ?? "section";
  // createElement keeps the polymorphic `as` element from collapsing its child
  // prop to `never` across the ElementType union.
  return React.createElement(
    Component,
    {
      className: cn("flex flex-col border border-lf-hairline", SURFACE_CLASS[surface], padded && "p-5", className),
      ...props,
    },
    children,
  );
}

/** Heading level for {@link PanelHeader}, so the document outline stays correct. */
export type PanelHeadingLevel = "h1" | "h2" | "h3" | "h4";

/** Props for {@link PanelHeader}. */
export interface PanelHeaderProps {
  /** Optional mono uppercase kicker above the title (clay). */
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
 * The standard panel header row: an optional mono eyebrow, a display-face title,
 * an optional muted sub-line, and optional trailing actions — with the hairline
 * divider and the canonical `px-6 pt-5 pb-4` rhythm baked in (replacing the
 * hand-rolled `px-[22px] pt-[18px]` variants scattered across the studio).
 */
export function PanelHeader({ eyebrow, title, sub, actions, as: Heading = "h2", id, className }: PanelHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 border-b border-lf-hairline px-6 pb-4 pt-5", className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="lf-kicker pb-1 text-lf-clay-ink">{eyebrow}</p> : null}
        <Heading id={id} className="lf-panel-heading text-lf-espresso">
          {title}
        </Heading>
        {sub ? <p className="lf-body-sm mt-1 text-lf-muted">{sub}</p> : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
