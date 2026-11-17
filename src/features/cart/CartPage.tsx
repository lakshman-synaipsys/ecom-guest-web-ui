import clsx from 'clsx';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiRequestError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { takeSkipped } from '@/lib/guestCart';
import { maxQtyFor, money, packLabel, stepFor } from '@/lib/format';
import {
  useApplyPromo, useCart, useClearCart, useClearPromo, useRemoveCartItem,
  useSetCartNote, useSetCartQty,
} from '@/lib/queries';
import { Art, Chip, EmptyState, ErrorNote, Stepper } from '@/components/ui';
import { Loading } from '@/components/Loaders';
import { AvailabilityBadge } from '@/components/AvailabilityBadge';
import type { CartShop } from '@/lib/types';

/**
 * The basket, grouped by shop.
 *
 * A flat list would be simpler to build and worse to use. Seeing that three
 * things come from the flower stall and five from the kirana is the honest
 * picture of what has been asked for, and it is what makes the multi-shop
 * fee make sense instead of looking like a surcharge.
 */
export function CartPage() {
  const navigate = useNavigate();
  const { signedIn, requestSignIn } = useAuth();
  const cart = useCart();
  const clear = useClearCart();
  const setNote = useSetCartNote();

  const [note, setNoteDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Items from before sign-in that the shop could no longer sell; said once.
  const [skipped] = useState<string[]>(() => takeSkipped());

  if (cart.isLoading) return <Loading label="Loading your basket..." />;

  const data = cart.data;
  if (!data || data.itemCount === 0) {
    return (
      <EmptyState
        emoji="🧺"
        title="Nothing in the basket yet"
        body="Add something from a shop and it will show up here."
        action={<Link to="/" className="btn-primary">Start shopping</Link>}
      />
    );
  }

  const noteValue = note ?? data.customerNote ?? '';

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Your basket</h1>
          <button
            className="text-xs font-semibold text-ink-muted hover:text-carrot"
            disabled={clear.isPending}
            onClick={() => void clear.mutateAsync()}
          >
            Empty it
          </button>
        </div>
        <p className="mt-0.5 text-sm text-ink-muted">
          {data.itemCount} item{data.itemCount === 1 ? '' : 's'} from {data.shops.length}{' '}
          shop{data.shops.length === 1 ? '' : 's'}
        </p>

        {error && <div className="mt-4">{<ErrorNote message={error} />}</div>}

        {skipped.length > 0 && (
          <div className="mt-4">
            <ErrorNote
              message={`We could not add ${skipped.join(', ')} to your basket - it may have sold out or reached its limit.`}
            />
          </div>
        )}

        {data.notices.length > 0 && (
          <ul className="mt-4 space-y-1.5 rounded-2xl border border-sun-soft bg-sun-soft
                         px-4 py-3 text-xs leading-relaxed text-sun">
            {data.notices.map((notice, index) => <li key={index}>&bull; {notice}</li>)}
          </ul>
        )}

        <div className="mt-5 space-y-5">
          {data.shops.map((shop) => (
            <ShopGroup key={shop.shopId} shop={shop} onError={setError} />
          ))}
        </div>

        {signedIn && <PromoBox cart={data} />}

        {signedIn && (
        <section className="card mt-5 p-4">
          <label className="label">Anything we should know?</label>
          <textarea
            className="input min-h-20"
            placeholder="Ripe bananas please, ring the bell twice, leave with the neighbour..."
            value={noteValue}
            onChange={(event) => setNoteDraft(event.target.value)}
          />
          <button
            className="btn-secondary btn-sm mt-2"
            disabled={note === null || setNote.isPending}
            onClick={async () => {
              await setNote.mutateAsync(noteValue);
              setNoteDraft(null);
            }}
          >
            {setNote.isPending ? 'Saving...' : 'Save note'}
          </button>
        </section>
        )}
      </div>

      {/* ------------------------------------------------------- summary */}
      <aside className="card sticky top-24 p-4">
        <h2 className="section-title mb-3">What it comes to</h2>

        <Row label="Items" value={money(data.itemsPaise)} />
        {!signedIn && (
          <p className="mt-2 text-xs text-ink-muted">
            Delivery, offers and the final total are worked out at checkout.
          </p>
        )}
        {signedIn && data.discountPaise > 0 && (
          <Row
            label={data.promo ? data.promo.title : 'Offer'}
            value={`-${money(data.discountPaise)}`}
            good
          />
        )}
        {signedIn && (
          <Row
            label="Delivery"
            value={data.deliveryFeePaise === 0 ? 'Free' : money(data.deliveryFeePaise)}
            quiet={data.deliveryFeePaise === 0}
          />
        )}
        {signedIn && data.handlingFeePaise > 0 && (
          <Row
            label={`Extra shops (${data.shops.length})`}
            value={money(data.handlingFeePaise)}
          />
        )}

        <div className="my-3 h-px bg-line" />

        {signedIn && (
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold">Total</span>
            <span className="font-display text-2xl font-semibold tabular">
              {money(data.totalPaise)}
            </span>
          </div>
        )}

        {signedIn && !data.meetsMinimum && (
          <p className="mt-3 rounded-2xl bg-carrot-soft px-3 py-2 text-xs font-medium text-carrot">
            Orders start at {money(data.minOrderPaise)}. Add{' '}
            {money(data.minOrderPaise - data.itemsPaise)} more.
          </p>
        )}

        {signedIn && data.meetsMinimum && data.awayFromFreeDeliveryPaise > 0 && (
          <p className="mt-3 rounded-2xl bg-leaf-soft px-3 py-2 text-xs font-medium text-leaf-dark">
            {money(data.awayFromFreeDeliveryPaise)} more and delivery is free.
          </p>
        )}

        <button
          className="btn-primary btn-block mt-4"
          disabled={signedIn && !data.meetsMinimum}
          onClick={() => {
            if (signedIn) {
              navigate('/checkout');
              return;
            }
            // The wall goes up here, at checkout. They come back to this basket.
            requestSignIn('/cart');
            navigate('/signin');
          }}
        >
          {signedIn ? 'Checkout' : 'Sign in to checkout'}
        </button>

        <Link to="/" className="btn-ghost btn-sm btn-block mt-1">
          Keep shopping
        </Link>
      </aside>
    </div>
  );
}

function Row({
  label,
  value,
  quiet,
  good,
}: {
  label: string;
  value: string;
  quiet?: boolean;
  good?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className={clsx('truncate text-sm', good ? 'text-leaf' : 'text-ink-soft')}>{label}</span>
      <span className={clsx('shrink-0 text-sm tabular',
                            quiet || good ? 'font-medium text-leaf' : 'text-ink')}>
        {value}
      </span>
    </div>
  );
}

/**
 * Offer codes.
 *
 * Three states in one box, because they are the same box to a shopper:
 * nothing applied, something applied, and something typed that did not
 * work. The last one shows the reason - "that code needs an order over
 * Rs 300" is a far better answer than the field going quiet.
 *
 * Offers that apply themselves show as applied with no code and no field,
 * because there is nothing to type and pretending otherwise is a puzzle.
 */
function PromoBox({ cart }: { cart: import('@/lib/types').Cart }) {
  const apply = useApplyPromo();
  const clear = useClearPromo();
  const [code, setCode] = useState('');
  const [showAll, setShowAll] = useState(false);

  const busy = apply.isPending || clear.isPending;
  const applied = cart.promo;
  const usable = cart.offers.filter((offer) => offer.code && offer.usable);
  const rest = cart.offers.filter((offer) => offer.code && !offer.usable);

  if (applied) {
    return (
      <section className="mt-5 rounded-card border border-leaf-line bg-leaf-soft p-4">
        <div className="flex items-start gap-3">
          <span className="text-lg" aria-hidden>🎁</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-leaf-dark">{applied.title}</p>
            <p className="mt-0.5 text-xs text-leaf-dark/80">
              {applied.label}
              {applied.code && <span className="ml-1 font-mono font-semibold">{applied.code}</span>}
              {applied.automatic && ' - applied for you, nothing to type'}
            </p>
          </div>
          {!applied.automatic && (
            <button
              className="shrink-0 text-xs font-semibold text-leaf-dark hover:underline"
              disabled={busy}
              onClick={() => void clear.mutateAsync()}
            >
              Remove
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="card mt-5 p-4">
      <label className="label">Have an offer code?</label>

      <div className="flex gap-2">
        <input
          className="input font-mono uppercase tracking-wider"
          placeholder="WELCOME50"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && code.trim()) void apply.mutateAsync(code.trim());
          }}
        />
        <button
          className="btn-secondary shrink-0"
          disabled={code.trim().length < 3 || busy}
          onClick={() => void apply.mutateAsync(code.trim())}
        >
          {busy ? 'Checking...' : 'Apply'}
        </button>
      </div>

      {cart.promoRejection && (
        <p className="mt-2 text-xs font-medium text-carrot">{cart.promoRejection}</p>
      )}

      {usable.length > 0 && (
        <div className="mt-3 space-y-2">
          {usable.map((offer) => (
            <button
              key={offer.id}
              className="flex w-full items-center gap-3 rounded-2xl border border-line
                         px-3 py-2.5 text-left hover:bg-sand"
              disabled={busy}
              onClick={() => void apply.mutateAsync(offer.code!)}
            >
              <span className="rounded-lg border border-dashed border-leaf px-2 py-1
                               font-mono text-2xs font-bold text-leaf">
                {offer.code}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{offer.title}</span>
                <span className="block text-2xs text-ink-muted">{offer.label}</span>
              </span>
              <span className="shrink-0 text-xs font-semibold text-leaf">Use</span>
            </button>
          ))}
        </div>
      )}

      {rest.length > 0 && (
        <>
          <button
            className="mt-3 text-xs font-semibold text-ink-muted hover:text-ink"
            onClick={() => setShowAll((current) => !current)}
          >
            {showAll ? 'Hide' : `${rest.length} more offer${rest.length === 1 ? '' : 's'}`}
          </button>

          {showAll && (
            <ul className="mt-2 space-y-2">
              {rest.map((offer) => (
                <li key={offer.id} className="rounded-2xl bg-sand px-3 py-2.5">
                  <p className="text-sm font-medium">{offer.title}</p>
                  <p className="text-2xs text-ink-muted">
                    <span className="font-mono font-semibold">{offer.code}</span>
                    {offer.whyNot && ` - ${offer.whyNot}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function ShopGroup({
  shop,
  onError,
}: {
  shop: CartShop;
  onError: (message: string | null) => void;
}) {
  const setQty = useSetCartQty();
  const remove = useRemoveCartItem();

  async function run(action: () => Promise<unknown>) {
    onError(null);
    try {
      await action();
    } catch (err) {
      onError(err instanceof ApiRequestError ? err.message : 'That did not work.');
    }
  }

  return (
    <section className="card overflow-hidden">
      <header className="flex items-center gap-3 border-b border-line bg-sand/60 px-4 py-3">
        <div className="h-9 w-9 shrink-0">
          <Art publicId={shop.shopImagePublicId} name={shop.shopName} size={96}
               rounded="rounded-full" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-ink-muted">From</span>
            <Link to={`/shops/${shop.shopSlug}`} className="truncate text-sm font-semibold hover:text-leaf">
              {shop.shopName}
            </Link>
          </div>
          <p className="text-2xs text-ink-muted">
            {shop.lines.length} item{shop.lines.length === 1 ? '' : 's'}
          </p>
        </div>
        {!shop.openNow && <Chip tone="sun">Closed now</Chip>}
        <span className="shrink-0 text-sm font-semibold tabular">{money(shop.subtotalPaise)}</span>
      </header>

      <ul className="divide-y divide-line">
        {shop.lines.map((line) => {
          const isOutOfStock = line.availability === 'OUT';

          return (
            <li
              key={line.itemId}
              className={clsx('flex items-center gap-3 px-4 py-3', isOutOfStock && 'opacity-60')}
            >
              <div className="h-14 w-14 shrink-0">
                <Art publicId={line.imagePublicId} name={line.name} size={140} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {line.name}
                  {line.variantLabel && !line.name.includes(line.variantLabel) && (
                    <span className="ml-1 text-ink-muted">{line.variantLabel}</span>
                  )}
                </p>
                {/* The price of one, and what one is. Those were the same
                    sentence while everything was sold by the kilo; a 100 g
                    packet needs them said together or the number looks
                    wrong. */}
                <p className="mt-0.5 text-2xs text-ink-muted">
                  {money(line.unitPricePaise)} &middot;{' '}
                  {line.unitLabel ?? packLabel(line.unitType, line.unitSize)}
                </p>

                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <AvailabilityBadge availability={line.availability} />
                </div>
              </div>

              <div className="w-28 shrink-0 text-right">
                <div className="mb-1.5 flex items-center justify-end gap-1.5">
                  <p className="text-sm font-semibold tabular">{money(line.linePaise)}</p>
                  <button
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-ink-faint
                               transition-colors hover:bg-carrot-soft hover:text-carrot
                               disabled:opacity-40"
                    disabled={setQty.isPending || remove.isPending}
                    aria-label={`Remove ${line.name} from basket`}
                    title="Remove from basket"
                    onClick={() => void run(() => remove.mutateAsync(line.itemId))}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 7h16" />
                      <path d="M9 7V4h6v3" />
                      <path d="M6 7l1 13h10l1-13" />
                      <path d="M10 11v6M14 11v6" />
                    </svg>
                  </button>
                </div>
                <Stepper
                  size="sm"
                  value={line.qty}
                  step={stepFor(line.unitType, line.unitSize)}
                  /* the per-order cap or what is left, whichever bites first */
                  max={maxQtyFor(line.maxQtyPerOrder, line.availablePacks, line.unitSize)}
                  unitSuffix={line.fractional ? line.unitType.toLowerCase() : undefined}
                  busy={setQty.isPending || remove.isPending || isOutOfStock}
                  onChange={(next) =>
                    void run(() =>
                      next <= 0
                        ? remove.mutateAsync(line.itemId)
                        : setQty.mutateAsync({ itemId: line.itemId, qty: next }))
                  }
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
