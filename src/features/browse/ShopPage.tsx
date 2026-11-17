import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useShop } from '@/lib/queries';
import { placeholderColours } from '@/lib/media';
import { ProductSheet } from '@/components/ProductSheet';
import { ProductTile, TileGrid } from '@/components/ProductTile';
import { Art, Chip, EmptyState } from '@/components/ui';
import { Loading, TileSkeletons } from '@/components/Loaders';
import { ShopReviewSection } from '@/components/ReviewSection';
import { Tile } from '@/lib/types';
import { useWhere } from '@/lib/location';

/**
 * One shop, from the inside.
 *
 * Prices here are this shop's prices - not the cheapest in town. Showing a
 * town-wide "from" price on a single shop's page would be a lie the shopper
 * only discovers at the basket.
 */
export function ShopPage() {
  const { slug = '' } = useParams();
  const { where } = useWhere();
  const shop = useShop(
    slug,
    where ? {
      lat: where.lat,
      lng: where.lng,
    } : null
  );
  const [open, setOpen] = useState<Tile | null>(null);
  const [category, setCategory] = useState('ALL');
  const [term, setTerm] = useState('');

  const items = useMemo(() => {
    const all = shop.data?.items ?? [];
    const needle = term.trim().toLowerCase();
    return all.filter((tile) => {
      if (category !== 'ALL' && tile.categoryName !== category) return false;
      if (!needle) return true;
      return (
        tile.name.toLowerCase().includes(needle)
        || (tile.localName ?? '').toLowerCase().includes(needle)
        || (tile.brand ?? '').toLowerCase().includes(needle)
      );
    });
  }, [shop.data, category, term]);

  if (shop.isLoading) return <Loading label="Opening the shop..." />;
  if (!shop.data) {
    return (
      <EmptyState
        emoji="🏪"
        title="That shop is not open here"
        body="It may have been switched off."
        action={<Link to="/shops" className="btn-secondary btn-sm">All shops</Link>}
      />
    );
  }

  const { shop: card, categories } = shop.data;
  const [from, to] = placeholderColours(card.name);

  return (
    <div>
      {/*
        * A breadcrumb rather than a back link, and it says Home, because
        * most people arrive at a shop from the home page rather than from
        * the shop list - so "< Shops" pointed at a page they had never
        * seen. Same shape as the one on a product page, so the two read as
        * one app.
        */}
      <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
        <Link to="/" className="hover:text-leaf">Home</Link>
        <span>&rsaquo;</span>
        <span className="truncate text-ink-soft">{card.name}</span>
      </nav>

      {/* ---------------------------------------------------------- head */}
      <div className="overflow-hidden rounded-card border border-line shadow-card">
        <div className="relative h-32 sm:h-40"
             style={{ background: `linear-gradient(120deg, ${from}, ${to})` }}>
          {card.coverPublicId && (
            <Art publicId={card.coverPublicId} name={card.name} size={1200} ratio={21 / 9}
                 rounded="rounded-none" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/55 to-transparent" />
        </div>

        <div className="relative bg-surface px-4 pb-4">
          <div className="-mt-8 mb-2 h-16 w-16 rounded-full ring-4 ring-white">
            <Art publicId={card.imagePublicId} name={card.name} size={200} rounded="rounded-full" />
          </div>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl font-semibold tracking-tight">{card.name}</h1>
                {card.openNow ? (
                  <Chip tone="leaf">Open now</Chip>
                ) : (
                  <Chip tone="carrot">Closed</Chip>
                )}
              </div>
              <p className="mt-0.5 text-sm text-ink-soft">
                {card.addressText ?? 'In town'}
                {card.landmark && ` · near ${card.landmark}`}
              </p>
              <p className="mt-1 text-2xs text-ink-muted">
                Hours: {card.opensAt?.slice(0, 5)} to {card.closesAt?.slice(0, 5)}
                {card.distanceKm !== null && ` · ${card.distanceKm} km away`}
                {` · ${card.itemCount} products`}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {card.sells.map((what) => <Chip key={what}>{what}</Chip>)}
            </div>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------- filters */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input
          className="input max-w-xs py-2.5"
          placeholder={`Search inside ${card.name}`}
          value={term}
          onChange={(event) => setTerm(event.target.value)}
        />
        <span className="text-xs text-ink-muted">{items.length} items</span>
      </div>

      {categories.length > 1 && (
        <div className="rail mt-3">
          {[{ id: 'ALL', name: 'Everything', slug: 'ALL' }, ...categories].map((row) => (
            <button
              key={row.id}
              onClick={() => setCategory(row.name === 'Everything' ? 'ALL' : row.name)}
              className={
                (category === 'ALL' && row.name === 'Everything') || category === row.name
                  ? 'shrink-0 rounded-pill bg-leaf px-3.5 py-1.5 text-xs font-semibold text-white'
                  : 'shrink-0 rounded-pill border border-line-strong bg-surface px-3.5 py-1.5 text-xs font-medium text-ink-soft hover:bg-sand'
              }
            >
              {row.name}
            </button>
          ))}
        </div>
      )}

      <div className="mt-5">
        <TileGrid>
          {shop.isFetching && items.length === 0 && <TileSkeletons count={8} />}
          {items.map((tile) => (
            <ProductTile key={`${tile.kind}-${tile.id}`} tile={tile} onOpen={setOpen} />
          ))}
        </TileGrid>

        {items.length === 0 && !shop.isFetching && (
          <div className="card">
            <EmptyState title="Nothing matches" body="Try a different search or category." />
          </div>
        )}
      </div>

      <div className="mt-7">
        <ShopReviewSection shopId={card.id} />
      </div>

      <ProductSheet
        open={open !== null}
        kind={open?.kind ?? null}
        slug={open?.slug ?? null}
        onClose={() => setOpen(null)}
      />
    </div>
  );
}
