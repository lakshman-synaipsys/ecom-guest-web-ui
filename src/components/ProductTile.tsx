import clsx from 'clsx';
import type { ReactNode } from 'react';
import { discountPct, money } from '@/lib/format';
import { Art, AvailabilityNote, Chip } from './ui';
import type { Tile } from '@/lib/types';

/**
 * The price block, everywhere.
 *
 * Three things in one order that never changes: what you pay, what it was,
 * and how much that saves. Written once so no card can accidentally shout
 * the saving louder than the price, and so a struck-out MRP can never go
 * missing on one screen and not another.
 *
 * The old price only appears when there is a real one - an MRP equal to the
 * price is not a discount, it is noise, and a fake strike-through is the
 * fastest way to stop being believed.
 */
export function Price({
  pricePaise,
  mrpPaise,
  from,
  size = 'md',
}: {
  pricePaise: number;
  mrpPaise?: number | null;
  /** "from Rs 45" when a group has several sizes. */
  from?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const off = discountPct(pricePaise, mrpPaise);
  const now = size === 'lg' ? 'text-xl' : size === 'sm' ? 'text-[0.8125rem]' : 'text-[0.9375rem]';

  return (
    <span className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
      {from && <span className="text-2xs font-normal text-ink-muted">from</span>}
      <span className={clsx('price-now leading-none', now)}>{money(pricePaise)}</span>
      {off !== null && (
        <>
          <span className="price-was">{money(mrpPaise)}</span>
          <span className="price-save">{off}% off</span>
        </>
      )}
    </span>
  );
}

/**
 * One card in a grid or a rail.
 *
 * The same component whether it is a single product or a group of sizes -
 * a group just says "3 sizes" under the price. Keeping one card is what
 * stops a grid looking like two apps stitched together.
 *
 * Every part of the card has a fixed height so that in a row of them the
 * names, the prices and the buttons line up across cards regardless of how
 * long each name is. Ragged rows are the single thing that makes a
 * catalogue look unfinished.
 *
 * Tapping opens the sheet rather than adding straight to the basket. On a
 * multi-shop catalogue, adding without a shop chosen is either a guess or
 * a surprise at checkout.
 */
export function ProductTile({
  tile,
  onOpen,
  className,
  allowOutOfStockOpen = false,
}: {
  tile: Tile;
  onOpen: (tile: Tile) => void;
  className?: string;
  /** Let catalogue cards navigate to details even when the item is out of stock. */
  allowOutOfStockOpen?: boolean;
}) {
  const out = tile.availability === 'OUT';
  const off = discountPct(tile.fromPricePaise, tile.mrpPaise);
  const canAddToCart = !out;

  return (
    <button
      onClick={() => onOpen(tile)}
      disabled={!canAddToCart && !allowOutOfStockOpen}
      className={clsx('tile group flex h-full flex-col p-2.5 text-left',
                      out && 'opacity-60', out && !allowOutOfStockOpen && 'cursor-not-allowed',
                      className)}
    >
      <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-[10px]">
        <Art publicId={tile.imagePublicId} name={tile.name} size={320} rounded="rounded-[10px]" />

        {off !== null && (
          <span className="absolute left-1.5 top-1.5 rounded-pill bg-carrot px-2 py-0.5
                           text-2xs font-bold text-white shadow-card">
            {off}% off
          </span>
        )}
        {tile.requiresPrescription && (
          <span className="absolute right-1.5 top-1.5 rounded-pill bg-berry px-2 py-0.5
                           text-2xs font-bold text-white">
            Rx
          </span>
        )}
      </div>

      {/* fixed two lines, so every price in the row sits on the same baseline */}
      <div className="mt-2.5 h-[2.4rem] shrink-0">
        <p className="line-clamp-2 text-[0.8125rem] font-medium leading-[1.2] text-ink">
          {tile.name}
        </p>
      </div>

      <p className="h-4 shrink-0 truncate text-2xs text-ink-muted">
        {tile.localName ?? tile.brand ?? ''}
      </p>

      {/* pushed to the bottom, so short and long names end the same way */}
      <div className="mt-auto flex items-end justify-between gap-2 pt-2">
        <span className="min-w-0">
          {!out && (
            <>
              <Price
                pricePaise={tile.fromPricePaise}
                mrpPaise={tile.mrpPaise}
                from={tile.variantCount > 1}
                size="sm"
              />
              <span className="mt-1 block truncate text-2xs text-ink-muted">
                {tile.variantCount > 1
                  ? `${tile.variantCount} sizes`
                  : (tile.unitLabel ?? `${tile.shopCount} shop${tile.shopCount === 1 ? '' : 's'}`)}
              </span>
            </>
          )}
          {out && (
            <span className="text-xs font-semibold text-carrot">Out of stock</span>
          )}
        </span>

        {!out && (
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-pill border border-leaf
                       bg-leaf-soft text-lg font-semibold leading-none text-leaf-dark
                       transition-colors group-hover:bg-leaf group-hover:text-white"
            aria-hidden
          >
            +
          </span>
        )}
      </div>

      {(out || tile.availability === 'LOW') && (
        <div className="mt-2 shrink-0">
          {out ? <AvailabilityNote value="OUT" /> : <Chip tone="sun">Only a few left</Chip>}
        </div>
      )}
    </button>
  );
}

/** The grid these live in, so column counts are decided in one place. */
export function TileGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {children}
    </div>
  );
}

/**
 * The same tiles in a swipeable row. Fixed width and stretched height, so
 * a rail never has one tall card and one short one next to it - which is
 * exactly what happens if you let flex children size themselves.
 */
export function TileRail({ children }: { children: ReactNode }) {
  return <div className="rail items-stretch">{children}</div>;
}
