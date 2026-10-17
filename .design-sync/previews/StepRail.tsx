import { StepRail } from "@lotfoundry/ui";

// StepRail is the desktop Studio spine. It always sits on the carbon sidebar.
const Sidebar = ({ children }: { children: React.ReactNode }) => (
  <div className="w-64 bg-lot-ink p-4">
    <p className="px-2 pb-2 lf-kicker-dense text-lot-stone-on-dark">Your path</p>
    {children}
  </div>
);

export const StudioPath = () => (
  <Sidebar>
    <StepRail
      aria-label="Studio steps"
      onSelect={() => {}}
      steps={[
        { id: "lot", label: "Your Lot", state: "done" },
        { id: "feasibility", label: "Rules & Fit", state: "current" },
        { id: "design", label: "Design", state: "upcoming" },
        { id: "certificate", label: "Certificate", state: "upcoming", revenue: true },
        { id: "builders", label: "Builders", state: "upcoming", revenue: true },
      ]}
    />
  </Sidebar>
);

// Before an address is found, the paid steps are locked and skipped by arrow keys.
export const BeforeAddress = () => (
  <Sidebar>
    <StepRail
      aria-label="Studio steps"
      onSelect={() => {}}
      steps={[
        { id: "lot", label: "Your Lot", state: "current" },
        { id: "feasibility", label: "Rules & Fit", state: "upcoming" },
        { id: "design", label: "Design", state: "upcoming" },
        { id: "certificate", label: "Certificate", state: "locked", revenue: true },
        { id: "builders", label: "Builders", state: "locked", revenue: true },
      ]}
    />
  </Sidebar>
);

export const NearlyDone = () => (
  <Sidebar>
    <StepRail
      aria-label="Studio steps"
      onSelect={() => {}}
      steps={[
        { id: "lot", label: "Your Lot", state: "done" },
        { id: "feasibility", label: "Rules & Fit", state: "done" },
        { id: "design", label: "Design", state: "done" },
        { id: "certificate", label: "Certificate", state: "current", revenue: true },
        { id: "builders", label: "Builders", state: "upcoming", revenue: true },
      ]}
    />
  </Sidebar>
);
