import { ArrowRight, Button, FileDown, Search, Trash2 } from "@lotfoundry/ui";

// The landing and Studio primary action: signal orange, carbon label, trailing arrow.
export const Primary = () => (
  <Button rightIcon={<ArrowRight size={18} />}>Check this address</Button>
);

// One signal-orange action per panel; everything else steps down.
export const Variants = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button variant="primary">View certificate</Button>
    <Button variant="commit">Save scenario</Button>
    <Button variant="secondary">Change address</Button>
    <Button variant="ghost">Start over</Button>
    <Button variant="selected">Detached</Button>
    <Button variant="destructive">Delete account</Button>
  </div>
);

// Compact sizes shrink type and padding, never the 44px touch target.
export const Sizes = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button size="xs" variant="secondary">Edit</Button>
    <Button size="sm" variant="secondary">Edit layout</Button>
    <Button size="md" variant="secondary">Edit layout</Button>
    <Button size="lg" variant="secondary">Edit layout</Button>
  </div>
);

export const WithIcons = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button leftIcon={<Search size={16} />}>Search</Button>
    <Button variant="secondary" leftIcon={<FileDown size={16} />}>Download PDF</Button>
    <Button variant="destructive" leftIcon={<Trash2 size={16} />}>Delete scenario</Button>
  </div>
);

export const States = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button loading>Checking parcel</Button>
    <Button variant="commit" loading>Saving</Button>
    <Button disabled>View certificate</Button>
  </div>
);

export const FullWidth = () => (
  <div className="w-80">
    <Button fullWidth rightIcon={<ArrowRight size={18} />}>
      Continue to design
    </Button>
  </div>
);
