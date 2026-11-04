import { Skeleton } from "@lotfoundry/ui";

// Wrap a group of skeletons in role="status" with an sr-only label.
export const TextLines = () => (
  <div role="status" aria-label="Loading parcel" className="flex w-80 flex-col gap-2">
    <span className="sr-only">Loading…</span>
    <Skeleton className="h-3 w-24" />
    <Skeleton className="h-7 w-56" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-4/5" />
  </div>
);

export const Card = () => (
  <div role="status" aria-label="Loading estimate" className="w-80 border border-lot-line bg-lot-chalk p-5">
    <span className="sr-only">Loading…</span>
    <div className="flex items-center gap-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
    <Skeleton className="mt-5 h-12 w-40" />
    <Skeleton className="mt-3 h-3 w-full" />
  </div>
);
