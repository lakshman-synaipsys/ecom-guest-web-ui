import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCategories, useCategoryItems } from '@/lib/queries';
import { ProductSheet } from '@/components/ProductSheet';
import { ProductTile, TileGrid } from '@/components/ProductTile';
import { EmptyState } from '@/components/ui';
import { TileSkeletons } from '@/components/Loaders';
import type { Tile } from '@/lib/types';

export function CategoryPage() {
  const { slug = '' } = useParams();
  const categories = useCategories();
  const items = useCategoryItems(slug);
  const [open, setOpen] = useState<Tile | null>(null);

  const category = categories.data?.find((row) => row.slug === slug);

  return (
    <div>
      <Link to="/" className="text-xs font-semibold text-ink-muted hover:text-leaf">
        &lsaquo; Home
      </Link>

      <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight">
        {category?.name ?? 'Category'}
      </h1>
      <p className="mt-0.5 text-sm text-ink-muted">
        {items.data ? `${items.data.length} things to buy` : 'Loading...'}
      </p>

      {/* Sideways through the other categories, so nobody has to go back
          to the home page to change their mind. */}
      {categories.data && categories.data.length > 1 && (
        <div className="rail mt-4">
          {categories.data.map((row) => (
            <Link
              key={row.id}
              to={`/c/${row.slug}`}
              className={
                row.slug === slug
                  ? 'shrink-0 rounded-pill bg-leaf px-3.5 py-1.5 text-xs font-semibold text-white'
                  : 'shrink-0 rounded-pill border border-line-strong bg-surface px-3.5 py-1.5 text-xs font-medium text-ink-soft hover:bg-sand'
              }
            >
              {row.name}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-5">
        <TileGrid>
          {items.isLoading && <TileSkeletons count={10} />}
          {items.data?.map((tile) => (
            <ProductTile key={`${tile.kind}-${tile.id}`} tile={tile} onOpen={setOpen} />
          ))}
        </TileGrid>

        {items.data && items.data.length === 0 && (
          <div className="card">
            <EmptyState
              emoji="🌾"
              title="Nothing here yet"
              body="No shop has priced anything in this category. Try another one."
            />
          </div>
        )}
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
