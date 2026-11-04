import { BrandLockup } from "@lotfoundry/ui";

// Size the lockup by height; the wordmark is fixed at text-2xl.
export const Default = () => (
  <div className="p-4">
    <BrandLockup className="h-8 w-auto" />
  </div>
);

export const Inverse = () => (
  <div className="bg-lot-ink p-6">
    <BrandLockup inverse className="h-8 w-auto" />
  </div>
);

// As in the Studio sidebar header.
export const SidebarHeader = () => (
  <div className="flex w-64 flex-col gap-1 bg-lot-ink p-4">
    <BrandLockup inverse className="h-8 w-auto" />
    <p className="pl-0.5 lf-dataprint text-lot-stone-on-dark">ADU planning</p>
  </div>
);
