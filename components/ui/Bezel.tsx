export function Bezel({
  children,
  className,
  innerClassName,
}: {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  return (
    <div
      className={`rounded-[2rem] border border-lf-hairline/25 bg-lf-taupe-soft p-1.5 ${className ?? ""}`}
    >
      <div 
        className={`rounded-[calc(2rem-6px)] bg-lf-card shadow-[inset_0_1px_2px_rgba(255,250,240,0.95),0_1px_3px_rgba(38,19,7,0.05)] ${innerClassName ?? ""}`}
      >
        {children}
      </div>
    </div>
  );
}

