import { useWhere } from '@/lib/location';
import { useShops } from '@/lib/queries';
import { ShopGridCard } from '@/features/home/HomePage';
import { EmptyState } from '@/components/ui';
import { Loading } from '@/components/Loaders';

export function ShopsPage() {
  const { where } = useWhere();
  const shops = useShops(where ? { lat: where.lat, lng: where.lng } : null);

  const open = (shops.data ?? []).filter((shop) => shop.openNow);
  const closed = (shops.data ?? []).filter((shop) => !shop.openNow);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Shops in town</h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            {shops.data
              ? `${open.length} open now of ${shops.data.length}`
              : 'Loading...'}
          </p>
        </div>

        {!where && (
          <button className="btn-secondary btn-sm" onClick={() => window.dispatchEvent(new Event('qc-store-open-location'))}>
            Set delivery location
          </button>
        )}
      </div>


      {shops.isLoading && <Loading label="Loading shops..." />}

      {open.length > 0 && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {open.map((shop) => <ShopGridCard key={shop.id} shop={shop} />)}
        </div>
      )}

      {closed.length > 0 && (
        <section className="mt-8">
          <h2 className="section-title mb-3">Closed right now</h2>
          <p className="mb-3 text-xs text-ink-muted">
            You can still add things from these - they go out when the shop opens.
          </p>
          <div className="grid gap-4 opacity-75 sm:grid-cols-2 lg:grid-cols-3">
            {closed.map((shop) => <ShopGridCard key={shop.id} shop={shop} />)}
          </div>
        </section>
      )}

      {shops.data && shops.data.length === 0 && (
        <div className="card mt-5">
          <EmptyState emoji="🏪" title="No shops yet" body="Nothing has been switched on for customers." />
        </div>
      )}
    </div>
  );
}
