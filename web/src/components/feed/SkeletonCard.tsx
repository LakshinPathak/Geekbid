/** Shimmer skeleton placeholders matching the final layout shapes,
 * shown while `loading`/`loadingApi` is true. Purely presentational. */

export function SkeletonKpiCard() {
  return (
    <div className="glass-panel rounded-[3px] p-4 border border-[rgba(201,168,76,0.22)] flex items-center gap-3">
      <div className="feed-skeleton w-9 h-9 rounded-[3px] shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="feed-skeleton h-2.5 w-16 rounded" />
        <div className="feed-skeleton h-4 w-20 rounded" />
      </div>
    </div>
  );
}

export function SkeletonJobCard() {
  return (
    <div className="glass-panel p-5 h-full flex flex-col gap-4">
      <div className="flex gap-1.5">
        <div className="feed-skeleton h-4 w-16 rounded" />
        <div className="feed-skeleton h-4 w-14 rounded" />
      </div>
      <div className="feed-skeleton h-4 w-3/4 rounded" />
      <div className="flex gap-1.5">
        <div className="feed-skeleton h-4 w-12 rounded" />
        <div className="feed-skeleton h-4 w-14 rounded" />
        <div className="feed-skeleton h-4 w-10 rounded" />
      </div>
      <div className="feed-skeleton h-6 w-24 rounded" />
      <div className="feed-skeleton h-0.5 w-full rounded" />
      <div className="mt-auto pt-3 border-t border-[rgba(201,168,76,0.15)]">
        <div className="feed-skeleton h-8 w-full rounded-[3px]" />
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="glass-panel rounded-[3px] p-4 flex items-center gap-3">
      <div className="feed-skeleton h-9 w-9 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="feed-skeleton h-3 w-1/3 rounded" />
        <div className="feed-skeleton h-2.5 w-1/2 rounded" />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 3, Card = SkeletonJobCard }: { count?: number; Card?: () => React.JSX.Element }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: count }, (_, i) => <Card key={i} />)}
    </div>
  );
}
