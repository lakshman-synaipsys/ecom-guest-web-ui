import clsx from 'clsx';

/**
 * Waiting, made to feel deliberate.
 *
 * Three rules the whole app follows:
 *
 *   1. **Skeletons over spinners for content.** A grid that is loading
 *      should look like a grid, so the page does not jump when the data
 *      lands. A spinner in a content area is an admission that we did not
 *      know what shape was coming.
 *   2. **Spinners only for actions.** Pressing "Place order" needs a
 *      spinner, because the wait belongs to the button, not the page.
 *   3. **Nothing animates for under 200ms.** A flash of loading state is
 *      worse than a beat of nothing, so the delayed variants below simply
 *      do not appear if the answer arrives quickly.
 */

/* -------------------------------------------------------------- spinner */

export function Spinner({
  size = 20,
  className,
  tone = 'leaf',
}: {
  size?: number;
  className?: string;
  tone?: 'leaf' | 'white' | 'ink';
}) {
  const colour = tone === 'white' ? 'border-white/35 border-t-white'
               : tone === 'ink'   ? 'border-line-strong border-t-ink'
               : 'border-leaf/25 border-t-leaf';

  return (
    <span
      className={clsx('inline-block animate-spin rounded-full border-2', colour, className)}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  );
}

/** A spinner with words, for a whole screen that has nothing else to show. */
export function Loading({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink-muted">
      <Spinner size={28} />
      {label && <p className="text-sm animate-fade-up">{label}</p>}
    </div>
  );
}

/* ------------------------------------------------------------ skeletons */

export function Skeleton({ className }: { className?: string }) {
  return <span className={clsx('skeleton block', className)} />;
}

export function TileSkeletons({ count = 8 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="tile p-2.5">
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="mt-2.5 h-3 w-4/5 rounded" />
          <Skeleton className="mt-1.5 h-3 w-1/2 rounded" />
          <Skeleton className="mt-3 h-8 w-full rounded-pill" />
        </div>
      ))}
    </>
  );
}

export function RowSkeletons({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="card flex items-center gap-3 p-4">
          <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-3.5 w-1/3 rounded" />
            <Skeleton className="mt-2 h-3 w-2/3 rounded" />
          </div>
          <Skeleton className="h-6 w-16 rounded" />
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------- order pulse */

/**
 * The one place a bespoke animation earns its keep: the moment after
 * "Place order", and the tracking screen while an order is being shopped.
 * Three dots walking is the visual promise that somebody is moving.
 */
export function WalkingDots({ tone = 'leaf' }: { tone?: 'leaf' | 'white' }) {
  const dot = tone === 'white' ? 'bg-white' : 'bg-leaf';
  return (
    <span className="inline-flex items-end gap-1" aria-hidden>
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className={clsx('h-1.5 w-1.5 rounded-full', dot)}
          style={{
            animation: 'walk 1.05s ease-in-out infinite',
            animationDelay: `${index * 0.14}s`,
          }}
        />
      ))}
    </span>
  );
}

/**
 * A soft pulsing ring around a live status chip - just enough motion that
 * the eye finds "being shopped" on a page of static text, and not so much
 * that it is annoying to sit with.
 */
export function LivePulse({ className }: { className?: string }) {
  return (
    <span className={clsx('relative inline-flex h-2 w-2', className)} aria-hidden>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-leaf opacity-60" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-leaf" />
    </span>
  );
}

/** A full-screen curtain for the seconds between placing and the receipt. */
export function PlacingOverlay({ open, message }: { open: boolean; message?: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4
                    bg-cream/92 backdrop-blur-sm">
      <span className="grid h-16 w-16 place-items-center rounded-[20px] bg-leaf">
        <WalkingDots tone="white" />
      </span>
      <p className="font-display text-lg font-semibold">{message ?? 'Placing your order'}</p>
      <p className="text-sm text-ink-muted">One moment - we are checking every price.</p>
    </div>
  );
}
