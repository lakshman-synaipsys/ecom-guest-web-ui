import clsx from 'clsx';

/**
 * Angadi.
 *
 * "Angadi" is shop - the everyday word for it in Telugu, Tamil and
 * Kannada, so in the town this serves it needs no explaining, and outside
 * it sounds like a name rather than a description. Three syllables, all
 * open, no cluster anybody has to think about before saying it out loud.
 *
 * The mark is a shopfront: a scalloped awning over a doorway. Not a
 * scooter, not a bag, not a lightning bolt - every delivery app in India
 * already owns those, and a shop is the thing this is actually about. It
 * reads at 20px on a tab bar and at 200px on a poster, which is the only
 * real test a logo has to pass.
 */
export function Logo({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="Angadi"
      className={className}
    >
      <rect width="48" height="48" rx="13" fill="var(--brand-bg, #12764A)" />

      {/* the awning: four scallops, the shape of every cloth shade in a
          market street */}
      <path
        d="M9 19.5V16.5C9 15.9 9.3 15.4 9.8 15.1L23.2 8.3C23.7 8.05 24.3 8.05 24.8 8.3L38.2 15.1C38.7 15.4 39 15.9 39 16.5V19.5H9Z"
        fill="var(--brand-fg, #FFFFFF)"
        opacity="0.92"
      />
      <path
        d="M9 19.5C11.1 19.5 11.1 23 13.2 23C15.3 23 15.3 19.5 17.4 19.5C19.5 19.5 19.5 23 21.6 23C23.7 23 23.7 19.5 25.8 19.5C27.9 19.5 27.9 23 30 23C32.1 23 32.1 19.5 34.2 19.5C36.3 19.5 36.3 23 38.4 23C38.6 23 38.8 22.95 39 22.86V19.5H9Z"
        fill="var(--brand-fg, #FFFFFF)"
      />

      {/* the doorway */}
      <path
        d="M17 40V30.5C17 28.6 18.6 27 20.5 27H27.5C29.4 27 31 28.6 31 30.5V40H17Z"
        fill="var(--brand-fg, #FFFFFF)"
        opacity="0.92"
      />
      <rect x="22.6" y="32.5" width="2.8" height="2.8" rx="1.4" fill="var(--brand-bg, #12764A)" />
    </svg>
  );
}

/** The mark plus the name, for headers and the sign-in screen. */
export function Wordmark({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const mark = size === 'lg' ? 52 : size === 'sm' ? 30 : 38;
  const text = size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-base' : 'text-xl';

  return (
    <span className={clsx('inline-flex items-center gap-2.5', className)}>
      <Logo size={mark} />
      <span className="leading-none">
        <span className={clsx('block font-display font-semibold tracking-tight', text)}>
          Angadi
        </span>
        {size !== 'sm' && (
          <span className="mt-0.5 block text-2xs font-medium tracking-[0.06em] text-ink-muted">
            YOUR TOWN&rsquo;S SHOPS, DELIVERED
          </span>
        )}
      </span>
    </span>
  );
}

/**
 * The favicon, as a data URI.
 *
 * Inlined rather than shipped as a file so the mark has exactly one
 * definition: change the SVG above and the tab icon follows, instead of
 * quietly staying the old one until somebody remembers to re-export it.
 */
export const FAVICON =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
       <rect width="48" height="48" rx="13" fill="#12764A"/>
       <path d="M9 19.5V16.5C9 15.9 9.3 15.4 9.8 15.1L23.2 8.3C23.7 8.05 24.3 8.05 24.8 8.3L38.2 15.1C38.7 15.4 39 15.9 39 16.5V19.5H9Z" fill="#fff" opacity=".92"/>
       <path d="M9 19.5C11.1 19.5 11.1 23 13.2 23C15.3 23 15.3 19.5 17.4 19.5C19.5 19.5 19.5 23 21.6 23C23.7 23 23.7 19.5 25.8 19.5C27.9 19.5 27.9 23 30 23C32.1 23 32.1 19.5 34.2 19.5C36.3 19.5 36.3 23 38.4 23C38.6 23 38.8 22.95 39 22.86V19.5H9Z" fill="#fff"/>
       <path d="M17 40V30.5C17 28.6 18.6 27 20.5 27H27.5C29.4 27 31 28.6 31 30.5V40H17Z" fill="#fff" opacity=".92"/>
       <rect x="22.6" y="32.5" width="2.8" height="2.8" rx="1.4" fill="#12764A"/>
     </svg>`.replace(/\s+/g, ' '),
  );
