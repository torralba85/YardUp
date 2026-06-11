import { clsx } from "clsx";

/**
 * Double-bezel container: a soft outer shell with a hairline ring wrapping an
 * inner core that carries its own surface and a warm inset highlight — the
 * "machined hardware" depth the flat single-layer cards lack. Radii are
 * concentric (outer 1.75rem − 0.375rem padding ≈ inner 1.375rem).
 */
export function Bezel({
  children,
  tone = "light",
  className,
  innerClassName,
}: {
  children: React.ReactNode;
  tone?: "light" | "dark";
  className?: string;
  innerClassName?: string;
}) {
  return (
    <div
      className={clsx(
        "rounded-[1.75rem] p-1.5",
        tone === "light"
          ? "border border-lf-hairline/70 bg-lf-taupe-soft"
          : "border border-white/10 bg-white/5",
        className
      )}
    >
      <div
        className={clsx(
          "h-full rounded-[1.375rem]",
          tone === "light"
            ? "border border-lf-hairline/60 bg-lf-card shadow-[inset_0_1px_1px_rgba(255,250,240,0.6),0_1px_3px_rgba(38,19,7,0.05)]"
            : "border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_1px_rgba(255,250,240,0.08)]",
          innerClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}
