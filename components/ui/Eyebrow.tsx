import { clsx } from "clsx";

/** Micro-tag chip preceding section headings. */
export function Eyebrow({
  children,
  tone = "light",
  className,
}: {
  children: React.ReactNode;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <p
      className={clsx(
        "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em]",
        tone === "light"
          ? "border-lf-hairline bg-lf-card/70 text-lf-muted"
          : "border-white/15 bg-white/5 text-lf-taupe",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={clsx(
          "h-1.5 w-1.5 rounded-full",
          tone === "light" ? "bg-lf-clay" : "bg-lf-amber"
        )}
      />
      {children}
    </p>
  );
}
