export function Bezel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[2rem] border border-lf-hairline bg-lf-taupe-soft p-1.5 ${className ?? ""}`}
    >
      <div className="rounded-[1.625rem] bg-lf-card shadow-[inset_0_1px_1px_rgba(255,250,240,0.5)]">
        {children}
      </div>
    </div>
  );
}
