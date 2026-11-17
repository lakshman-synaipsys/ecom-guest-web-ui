import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSearch } from '@/lib/queries';
import { ProductSheet } from '@/components/ProductSheet';
import { ProductTile, TileGrid } from '@/components/ProductTile';
import { EmptyState } from '@/components/ui';
import { TileSkeletons } from '@/components/Loaders';
import type { Tile } from '@/lib/types';

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const term = params.get('q') ?? '';
  const results = useSearch(term);
  const [open, setOpen] = useState<Tile | null>(null);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold tracking-tight">Search</h1>

      <input
        className="input mt-3 max-w-lg"
        autoFocus
        placeholder="Rice, tomatoes, paracetamol, marigold..."
        value={term}
        onChange={(event) => setParams(event.target.value ? { q: event.target.value } : {})}
      />

      {term.trim().length >= 2 && (
        <p className="mt-2 text-sm text-ink-muted">
          {results.data ? `${results.data.length} matches for "${term}"` : 'Searching...'}
        </p>
      )}

      <div className="mt-5">
        <TileGrid>
          {results.isFetching && !results.data && <TileSkeletons count={8} />}
          {results.data
            ?.filter((tile) => {
              // Only show products with at least one in-stock offering
              // But still show products marked as OUT if they were LIVE before going OUT
              return tile.availability !== 'UNKNOWN';
            })
            .map((tile) => (
              <ProductTile key={`${tile.kind}-${tile.id}`} tile={tile} onOpen={setOpen} />
            ))}
        </TileGrid>

        {term.trim().length < 2 && (
          <EmptyState
            emoji="🔎"
            title="What are you looking for?"
            body="Type at least two letters. English or the local name both work."
          />
        )}

        {term.trim().length >= 2 && results.data && results.data.length === 0 && (
          <div className="card">
            <EmptyState
              emoji="🤷"
              title={`Nothing for "${term}"`}
              body="No shop in town has priced anything by that name yet."
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
