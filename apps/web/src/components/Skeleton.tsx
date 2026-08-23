import { Nav } from './Shell';

/**
 * Placeholders shown while a route loads.
 *
 * The rule these follow: a skeleton is the *shape* of the thing that is
 * coming, not a spinner in a box. A block where the name will be and a row of
 * blocks where the list will be tells you the page is arriving and roughly
 * what it will look like, so the real content replacing it reads as the page
 * settling rather than as a second, different page.
 *
 * The shimmer is animated in CSS (`globals.css`) so it costs no JavaScript and
 * so `prefers-reduced-motion` can switch it for a static tint in one place.
 */
export function Skeleton({
  className = '',
  width,
}: {
  className?: string;
  width?: string;
}): React.ReactElement {
  return (
    <div
      className={`jade-skeleton ${className}`}
      style={width ? { width } : undefined}
      aria-hidden="true"
    />
  );
}

/** The page chrome plus a caller-supplied body. Announced politely to screen readers. */
export function LoadingShell({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div className="mx-auto max-w-5xl px-5 pb-24 pt-6 sm:px-8">
      <Nav />
      <div role="status" aria-live="polite">
        <span className="sr-only">Loading…</span>
        {children}
      </div>
    </div>
  );
}

/** Heading block: a kicker line and a title. */
export function HeaderSkeleton(): React.ReactElement {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3" width="7rem" />
        <Skeleton className="h-9" width="14rem" />
      </div>
      <Skeleton className="h-10" width="7rem" />
    </div>
  );
}

/** The people list: controls, then a grid of person cards. */
export function PeopleSkeleton(): React.ReactElement {
  return (
    <LoadingShell>
      <HeaderSkeleton />
      <div className="mb-5 flex flex-wrap gap-2">
        <Skeleton className="h-9 grow" width="12rem" />
        <Skeleton className="h-9" width="9rem" />
        <Skeleton className="h-9" width="7rem" />
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <li key={i} className="border border-[var(--rule)] bg-[var(--surface)] p-4">
            <Skeleton className="mb-2 h-6" width="60%" />
            <Skeleton className="h-3" width="80%" />
          </li>
        ))}
      </ul>
    </LoadingShell>
  );
}

/**
 * One person: the chart is the slow part, so it gets a square of its own.
 *
 * A chart is a cache lookup on a good day and a full computation on a bad one,
 * and the difference is invisible from the outside — which is exactly why the
 * placeholder has to be there on both.
 */
export function PersonSkeleton(): React.ReactElement {
  return (
    <LoadingShell>
      <HeaderSkeleton />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="border border-[var(--rule)] bg-[var(--surface)] p-5">
          <Skeleton className="aspect-square w-full" />
        </div>
        <div className="flex flex-col gap-3">
          <div className="border border-[var(--rule)] bg-[var(--surface)] p-5">
            <Skeleton className="mb-3 h-3" width="6rem" />
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="mb-2 h-4" width={`${94 - i * 4}%`} />
            ))}
          </div>
          <div className="border border-[var(--rule)] bg-[var(--surface)] p-5">
            <Skeleton className="mb-3 h-3" width="5rem" />
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="mb-2 h-4" width={`${80 - i * 12}%`} />
            ))}
          </div>
        </div>
      </div>
    </LoadingShell>
  );
}

/** A generic stack of panels, for pages without a distinctive shape. */
export function PanelsSkeleton({ panels = 2 }: { panels?: number }): React.ReactElement {
  return (
    <LoadingShell>
      <HeaderSkeleton />
      <div className="flex flex-col gap-4">
        {Array.from({ length: panels }, (_, i) => (
          <div key={i} className="border border-[var(--rule)] bg-[var(--surface)] p-5">
            <Skeleton className="mb-3 h-3" width="6rem" />
            <Skeleton className="mb-2 h-4" width="92%" />
            <Skeleton className="mb-2 h-4" width="78%" />
            <Skeleton className="h-4" width="60%" />
          </div>
        ))}
      </div>
    </LoadingShell>
  );
}
