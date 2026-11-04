import { Button, PanelHeader } from "@lotfoundry/ui";

// Panels in the Studio are square chalk surfaces with a drafting-line border;
// PanelHeader supplies the title row and its hairline divider.
export const Default = () => (
  <aside className="w-[420px] rounded-none border border-lot-line bg-lot-chalk">
    <PanelHeader title="Estimate Summary" sub="Current feasibility snapshot for 1234 Oak Street." />
    <div className="px-6 py-5">
      <p className="lf-body-sm text-lot-stone">
        The selected concept appears to fit the current coverage assumptions.
      </p>
    </div>
  </aside>
);

export const WithEyebrow = () => (
  <aside className="w-[420px] rounded-none border border-lot-line bg-lot-chalk">
    <PanelHeader
      eyebrow="Property constraints"
      title="What this lot allows"
      sub="Zoning, setbacks and coverage for the modeled parcel."
    />
    <div className="px-6 py-5">
      <p className="lf-body-sm text-lot-stone">Estimated area after modeled setbacks: 2,400 sf.</p>
    </div>
  </aside>
);

export const WithActions = () => (
  <aside className="w-[460px] rounded-none border border-lot-line bg-lot-chalk">
    <PanelHeader
      eyebrow="Design"
      title="Backyard home"
      sub="600 sf detached, one bedroom."
      actions={
        <Button size="sm" variant="secondary">
          Edit
        </Button>
      }
    />
    <div className="px-6 py-5">
      <p className="lf-body-sm text-lot-stone">Placed 11 ft from the main house, clear of the rear setback.</p>
    </div>
  </aside>
);
