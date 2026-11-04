import { ParcelMark } from "@lotfoundry/ui";

// The parcel mark strokes in currentColor; the dot is always signal orange.
export const Default = () => (
  <div className="flex items-center gap-6 p-4 text-lot-ink">
    <ParcelMark className="h-12 w-12" />
    <ParcelMark className="h-8 w-8" />
    <ParcelMark className="h-5 w-5" />
  </div>
);

// The address tile from the Studio sidebar.
export const OnCarbon = () => (
  <div className="flex w-64 gap-3 border border-lot-line-dark bg-lot-surface-dark p-3">
    <div className="flex h-14 w-14 shrink-0 items-center justify-center border border-lot-line-dark bg-lot-ink p-2 text-lot-chalk">
      <ParcelMark className="h-full w-full" />
    </div>
    <div className="min-w-0 flex-1">
      <div className="truncate text-sm font-semibold text-lot-chalk">1234 Oak Street</div>
      <div className="mt-1 truncate text-xs text-lot-stone-on-dark">San Diego, CA 92104</div>
    </div>
  </div>
);

export const StrokeWidths = () => (
  <div className="flex items-center gap-6 p-4 text-lot-ink">
    <ParcelMark className="h-12 w-12" strokeWidth={2} />
    <ParcelMark className="h-12 w-12" strokeWidth={4} />
    <ParcelMark className="h-12 w-12" strokeWidth={6} />
  </div>
);
