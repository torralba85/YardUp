export function AmbientBackdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="lf-backdrop lf-grain relative min-h-screen text-lf-espresso">
      {children}
    </div>
  );
}
