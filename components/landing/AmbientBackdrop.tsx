export function AmbientBackdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="lf-backdrop lf-grain relative min-h-[100dvh] text-lf-espresso">
      {children}
    </div>
  );
}
