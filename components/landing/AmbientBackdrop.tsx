/**
 * Full-height page wrapper applying the LotFoundry ambient backdrop and grain
 * texture behind its children.
 *
 * @param props.children - The page content to render over the backdrop.
 */
export function AmbientBackdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="lf-backdrop lf-grain relative min-h-[100dvh] text-lf-espresso">
      {children}
    </div>
  );
}
