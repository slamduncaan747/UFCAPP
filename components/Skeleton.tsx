'use client';

/** A single shimmering placeholder block. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-md ${className}`} aria-hidden="true" />;
}

/** Placeholder shaped like a roster / list card (avatar + two text lines + stat). */
export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-[#050507] border-2 border-zinc-800/70 rounded-2xl p-4 flex items-center gap-4 ${className}`}
      aria-hidden="true"
    >
      <Skeleton className="w-14 h-14 rounded-full flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-2.5 w-2/5" />
      </div>
      <Skeleton className="h-7 w-9" />
    </div>
  );
}

/** A vertical stack of card skeletons for list-loading states. */
export function CardSkeletonList({ count = 6, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
