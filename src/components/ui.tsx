import clsx from 'clsx';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { initials, placeholderColours, square, wide } from '@/lib/media';

/* ====================================================================
 * Images
 * ==================================================================== */

/**
 * A picture, or a convincing stand-in for one.
 *
 * On day one there are no photographs at all, so the stand-in has to look
 * deliberate rather than broken: a wash of two warm colours derived from
 * the item's own name, with its initials set in it. The same tomato is the
 * same colour on every screen and every reload, which is what makes a grid
 * of them read as design instead of as missing data.
 */
export function Art({
  publicId,
  name,
  size = 320,
  ratio,
  className,
  rounded = 'rounded-tile',
}: {
  publicId: string | null | undefined;
  name: string;
  size?: number;
  /** Set for a wide crop (banners, covers); omit for a square. */
  ratio?: number;
  className?: string;
  rounded?: string;
}) {
  const src = ratio ? wide(publicId, size, ratio) : square(publicId, size);
  const [failed, setFailed] = useState(false);
  const [from, to] = placeholderColours(name);

  if (!src || failed) {
    return (
      <div
        className={clsx('flex items-center justify-center overflow-hidden', rounded, className)}
        style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
        aria-hidden
      >
        <span
          className="font-display font-semibold tracking-tight"
          style={{ color: 'rgba(0,0,0,0.32)', fontSize: 'clamp(0.9rem, 30%, 2.4rem)' }}
        >
          {initials(name)}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={clsx('h-full w-full object-cover', rounded, className)}
      style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
    />
  );
}

/* ====================================================================
 * Small pieces
 * ==================================================================== */

export function Chip({
  tone = 'quiet',
  children,
  className,
}: {
  tone?: 'quiet' | 'leaf' | 'carrot' | 'berry' | 'sun';
  children: ReactNode;
  className?: string;
}) {
  return <span className={clsx(`chip-${tone}`, className)}>{children}</span>;
}

export function EmptyState({
  emoji,
  title,
  body,
  action,
}: {
  emoji?: string;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {emoji && <div className="mb-3 text-4xl" aria-hidden>{emoji}</div>}
      <h3 className="section-title">{title}</h3>
      {body && <p className="mt-1.5 max-w-sm text-sm text-ink-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-carrot-line bg-carrot-soft px-4 py-3 text-sm text-carrot">
      {message}
    </div>
  );
}

/* ====================================================================
 * Bottom sheet
 * ==================================================================== */

/**
 * A sheet rather than a modal, because most of this app is used one-handed
 * on a phone: it rises from the thumb, and on a desktop it centres itself
 * so it does not look like a mistake.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-[2px]
                 sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-[26px] bg-surface
                   shadow-sheet animate-sheet-in sm:rounded-[24px] ${className ?? 'sm:max-w-lg'}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex shrink-0 items-center justify-between gap-4 px-5 pt-4">
          <span className="mx-auto h-1 w-10 rounded-full bg-line-strong sm:hidden" />
        </div>

        <div className="flex shrink-0 items-start justify-between gap-4 px-5 pb-3 pt-2">
          {title ? (
            <h2 className="min-w-0 font-display text-xl font-semibold tracking-tight">{title}</h2>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sand text-ink-soft
                       transition-colors hover:bg-line hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>

        {footer && (
          <div className="shrink-0 border-t border-line bg-surface px-5 py-3
                          pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ====================================================================
 * Quantity stepper
 * ==================================================================== */

/**
 * Two shapes in one control: a single "Add" button until there is
 * something in the basket, then a - n + stepper in the same footprint.
 * Swapping in place is what stops the grid reflowing every time somebody
 * adds an onion.
 */
export function Stepper({
  value,
  step = 1,
  max,
  unitSuffix,
  busy,
  onChange,
  size = 'md',
}: {
  value: number;
  step?: number;
  max?: number;
  unitSuffix?: string;
  busy?: boolean;
  onChange: (next: number) => void;
  size?: 'sm' | 'md';
}) {
  const pad = size === 'sm' ? 'h-8 text-xs' : 'h-10 text-sm';

  if (value <= 0) {
    return (
      <button
        className={clsx(
          'w-full rounded-pill border border-leaf bg-leaf-soft font-semibold text-leaf-dark',
          'transition-colors hover:bg-leaf hover:text-white disabled:opacity-50',
          pad,
        )}
        disabled={busy}
        onClick={() => onChange(step)}
      >
        Add
      </button>
    );
  }

  const atMax = max !== undefined && value + step > max;

  return (
    <div
      className={clsx(
        'flex w-full items-center justify-between rounded-pill bg-leaf px-1 font-semibold text-white',
        pad,
      )}
    >
      <button
        className="grid h-full w-8 place-items-center rounded-pill text-lg leading-none
                   hover:bg-white/15 disabled:opacity-50"
        disabled={busy}
        onClick={() => onChange(Math.max(0, +(value - step).toFixed(3)))}
        aria-label="Less"
      >
        &minus;
      </button>

      <span className="tabular px-1 text-center">
        {Number.isInteger(value) ? value : value.toFixed(step < 1 ? 1 : 0)}
        {unitSuffix && <span className="ml-0.5 text-[0.7em] opacity-80">{unitSuffix}</span>}
      </span>

      <button
        className="grid h-full w-8 place-items-center rounded-pill text-lg leading-none
                   hover:bg-white/15 disabled:opacity-40"
        disabled={busy || atMax}
        title={atMax ? `This shop sells at most ${max} per order` : undefined}
        onClick={() => onChange(+(value + step).toFixed(3))}
        aria-label="More"
      >
        +
      </button>
    </div>
  );
}

/* ====================================================================
 * Availability
 * ==================================================================== */

export function AvailabilityNote({ value }: { value: string }) {
  if (value === 'OUT')  return <Chip tone="carrot">Out of stock</Chip>;
  if (value === 'LOW')  return <Chip tone="sun">Only a few left</Chip>;
  return null;
}
