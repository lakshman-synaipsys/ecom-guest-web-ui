import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ApiRequestError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useWhere } from '@/lib/location';
import { clockTime, money } from '@/lib/format';
import {
  useCheckout, usePlaceOrder, useSetCartAddress, useSetDelivery, useStoreConfig,
} from '@/lib/queries';
import { LocationDialog } from '@/components/LocationDialog';
import { Chip, ErrorNote } from '@/components/ui';
import { Loading, PlacingOverlay } from '@/components/Loaders';
import type { Address, DeliveryOptions } from '@/lib/types';

/**
 * Checkout, in one screen.
 *
 * Three decisions - where, when, how to pay - and a button that says
 * exactly what is missing rather than failing when it is pressed. The
 * server computes the blockers so the button and the API can never
 * disagree about whether this order is placeable.
 */
export function CheckoutPage() {
  const navigate = useNavigate();
  const { signedIn, requestSignIn } = useAuth();
  const review = useCheckout();
  const setAddress = useSetCartAddress();
  const config = useStoreConfig();
  const { where, useAddress } = useWhere();
  const setDelivery = useSetDelivery();
  const place = usePlaceOrder();

  const [addOpen, setAddOpen] = useState(false);
  const [payment, setPayment] = useState('COD');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (review.data?.cart.itemCount && !where) setAddOpen(true);
  }, [review.data?.cart.itemCount, where]);

  // Checkout is where an account is needed: sign in, then come straight back.
  if (!signedIn) {
    requestSignIn('/checkout');
    return <Navigate to="/signin" replace />;
  }

  if (review.isLoading) return <Loading label="Getting things ready..." />;

  const data = review.data;
  if (!data) return <ErrorNote message="We could not load your checkout." />;

  const { cart, addresses, delivery } = data;

  if (cart.itemCount === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-ink-muted">There is nothing to check out.</p>
        <Link to="/" className="btn-primary mt-4">Start shopping</Link>
      </div>
    );
  }

  async function placeOrder() {
    setError(null);

    // Validate before showing payment UI
    if (data.blockers.length > 0) {
      setError('Please fix the issues above before placing your order.');
      return;
    }

    try {
      const placed = await place.mutateAsync({ paymentMode: payment });
      navigate(`/orders/${placed.orderId}?placed=1`);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        const backendMessage =
          typeof err.message === 'string' && err.message.trim().length > 0
            ? err.message.trim()
            : null;
        // Handle specific API error codes
        const code = (err as any).code;
        if (code === 'CONFLICT' || code === '409') {
          if(backendMessage) {
            setError(backendMessage);
          } else {
            setError('One or more items are no longer available. Check your cart.');
          }
        } else if (code === 'VALIDATION_FAILED' || code === '400') {
          setError('Your address or delivery slot changed. Please review and try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError('We could not place that order. Please try again.');
      }
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <div className="space-y-5">
        <div>
          <Link to="/cart" className="text-xs font-semibold text-ink-muted hover:text-leaf">
            &lsaquo; Basket
          </Link>
          <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight">Checkout</h1>
        </div>

        {error && <ErrorNote message={error} />}

        {/* ------------------------------------------------------ where */}
        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="section-title">Where should it go?</h2>
            <button className="btn-secondary btn-sm" onClick={() => setAddOpen(true)}>
              Add address
            </button>
          </div>

          {addresses.length === 0 ? (
            <p className="text-sm text-ink-muted">
              No address saved yet. Add one and we will check that we deliver there.
            </p>
          ) : (
            <div className="space-y-2">
              {addresses.map((address) => (
                <AddressOption
                  key={address.id}
                  address={address}
                  selected={cart.addressId === address.id}
                  busy={setAddress.isPending}
                  onSelect={() => {
                    useAddress(address.lat, address.lng, address.area || address.oneLine, address.area ?? undefined, address.pincode ?? undefined, address.city ?? undefined);
                    void setAddress.mutateAsync(address.id);
                  }}
                />
              ))}
            </div>
          )}
        </section>

        {/* ------------------------------------------------------- when */}
        <section className="card p-4">
          <h2 className="section-title mb-3">When do you want it?</h2>
          <WhenPicker
            options={delivery}
            mode={cart.deliveryMode}
            from={cart.scheduledFrom}
            busy={setDelivery.isPending}
            onInstant={() => void setDelivery.mutateAsync({ mode: 'INSTANT' })}
            onSlot={(slotFrom, slotTo) =>
              void setDelivery.mutateAsync({ mode: 'SCHEDULED', from: slotFrom, to: slotTo })}
          />
        </section>

        {/* ------------------------------------------------------- pay */}
        <section className="card p-4">
          <h2 className="section-title mb-3">How would you like to pay?</h2>

          <div className="space-y-2">
            {data.paymentModes.map((mode) => (
              <button
                key={mode}
                onClick={() => setPayment(mode)}
                className={clsx(
                  'flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left',
                  payment === mode
                    ? 'border-leaf bg-leaf-soft'
                    : 'border-line bg-surface hover:bg-sand',
                )}
              >
                <span className="text-lg" aria-hidden>{mode === 'COD' ? '💵' : '📱'}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">
                    {mode === 'COD' ? 'Cash on delivery' : 'Pay online (UPI)'}
                  </span>
                  <span className="block text-2xs text-ink-muted">
                    {mode === 'COD'
                      ? 'Pay the rider at the door'
                      : 'Pay now with any UPI app'}
                  </span>
                </span>
              </button>
            ))}
          </div>

          {data.paymentNote && (
            <p className="mt-3 text-2xs text-ink-muted">{data.paymentNote}</p>
          )}
        </section>
      </div>

      {/* ----------------------------------------------------- summary */}
      <aside className="card sticky top-24 p-4">
        <h2 className="section-title mb-3">Your order</h2>

        <ul className="mb-3 space-y-1 text-xs text-ink-soft">
          {cart.shops.map((shop) => (
            <li key={shop.shopId} className="flex justify-between gap-3">
              <span className="truncate">{shop.shopName}</span>
              <span className="shrink-0 tabular">{money(shop.subtotalPaise)}</span>
            </li>
          ))}
        </ul>

        <div className="h-px bg-line" />

        <div className="flex items-baseline justify-between py-1.5">
          <span className="text-sm text-ink-soft">Items</span>
          <span className="text-sm tabular">{money(cart.itemsPaise)}</span>
        </div>
        {cart.discountPaise > 0 && (
          <div className="flex items-baseline justify-between gap-3 py-1.5">
            <span className="truncate text-sm text-leaf">
              {cart.promo ? cart.promo.title : 'Offer'}
            </span>
            <span className="shrink-0 text-sm font-medium tabular text-leaf">
              -{money(cart.discountPaise)}
            </span>
          </div>
        )}
        <div className="flex items-baseline justify-between py-1.5">
          <span className="text-sm text-ink-soft">Delivery</span>
          <span className={clsx('text-sm tabular',
                                cart.deliveryFeePaise === 0 && 'font-medium text-leaf')}>
            {cart.deliveryFeePaise === 0 ? 'Free' : money(cart.deliveryFeePaise)}
          </span>
        </div>
        {cart.handlingFeePaise > 0 && (
          <div className="flex items-baseline justify-between py-1.5">
            <span className="text-sm text-ink-soft">Extra shops</span>
            <span className="text-sm tabular">{money(cart.handlingFeePaise)}</span>
          </div>
        )}

        <div className="my-2 h-px bg-line" />

        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold">Total</span>
          <span className="font-display text-2xl font-semibold tabular">
            {money(cart.totalPaise)}
          </span>
        </div>

        {data.blockers.length > 0 && (
          <ul className="mt-3 space-y-1 rounded-2xl bg-carrot-soft px-3 py-2.5
                         text-xs font-medium text-carrot">
            {data.blockers.map((blocker, index) => <li key={index}>&bull; {blocker}</li>)}
          </ul>
        )}

        <button
          className="btn-primary btn-block mt-4"
          disabled={!data.canPlace || place.isPending}
          onClick={() => void placeOrder()}
        >
          {place.isPending
            ? 'Placing your order...'
            : `Place order  ${money(cart.totalPaise)}`}
        </button>

        <p className="mt-2 text-center text-2xs text-ink-muted">
          You can cancel free of charge until someone starts shopping it.
        </p>
        <p className="mt-2 text-center text-2xs text-ink-faint">
          By placing this order you agree to our{' '}
          <Link to="/terms" className="underline hover:text-ink-muted">terms</Link>.
        </p>
      </aside>

      <LocationDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        initialCoords={{
          lat: where?.lat ?? config.data?.zone.centreLat ?? 13.445006584996664,
          lng: where?.lng ?? config.data?.zone.centreLng ?? 79.55304637537404,
        }}
        onAddressSaved={(address) => {
          useAddress(address.lat, address.lng, address.area || address.oneLine, address.area ?? undefined, address.pincode ?? undefined, address.city ?? undefined);
          void setAddress.mutateAsync(address.id).catch((reason: unknown) => {
            setError(reason instanceof Error ? reason.message : 'Address saved, but could not select it for checkout.');
          });
        }}
      />

      <PlacingOverlay open={place.isPending} />
    </div>
  );
}

/* ==================================================================== */

function AddressOption({
  address,
  selected,
  busy,
  onSelect,
}: {
  address: Address;
  selected: boolean;
  busy: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      disabled={busy || !address.servicable}
      className={clsx(
        'flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors',
        selected ? 'border-leaf bg-leaf-soft' : 'border-line bg-surface hover:bg-sand',
        !address.servicable && 'opacity-60',
      )}
    >
      <span
        className={clsx(
          'mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border-2',
          selected ? 'border-leaf bg-leaf' : 'border-line-strong',
        )}
      >
        {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-sm font-semibold">{address.label}</span>
          {address.isDefault && <Chip tone="leaf">Default</Chip>}
          {!address.servicable && <Chip tone="carrot">Outside our area</Chip>}
        </span>
        <span className="mt-0.5 block text-xs text-ink-soft">{address.oneLine}</span>
        {address.landmark && (
          <span className="block text-2xs text-ink-muted">near {address.landmark}</span>
        )}
      </span>
    </button>
  );
}

/**
 * Now, or a window.
 *
 * Windows rather than exact times on purpose: a scooter in a town with one
 * level crossing cannot hit a minute, and a promise that cannot be kept is
 * worse than a vaguer one that can.
 */
function WhenPicker({
  options,
  mode,
  from,
  busy,
  onInstant,
  onSlot,
}: {
  options: DeliveryOptions;
  mode: string;
  from: string | null;
  busy: boolean;
  onInstant: () => void;
  onSlot: (from: string, to: string) => void;
}) {
  const [day, setDay] = useState(0);
  const chosenDay = options.days[day];

  return (
    <div>
      <button
        onClick={onInstant}
        disabled={busy || !options.instantAvailable}
        className={clsx(
          'flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors',
          mode === 'INSTANT' && options.instantAvailable
            ? 'border-leaf bg-leaf-soft'
            : 'border-line bg-surface hover:bg-sand',
          !options.instantAvailable && 'opacity-55',
        )}
      >
        <span className="text-lg" aria-hidden>⚡</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Deliver now</span>
          <span className="block text-2xs text-ink-muted">{options.instantNote}</span>
        </span>
      </button>

      {options.days.length > 0 && (
        <>
          <p className="eyebrow mb-2 mt-4">Or pick a window</p>

          {options.days.length > 1 && (
            <div className="mb-2 flex gap-2">
              {options.days.map((option, index) => (
                <button
                  key={option.date}
                  onClick={() => setDay(index)}
                  className={clsx(
                    'rounded-pill px-3 py-1.5 text-xs font-semibold transition-colors',
                    day === index
                      ? 'bg-ink text-white'
                      : 'border border-line-strong bg-surface text-ink-soft hover:bg-sand',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {chosenDay?.slots.map((slot) => {
              const active = mode === 'SCHEDULED' && from === slot.from;
              return (
                <button
                  key={slot.from}
                  disabled={busy}
                  onClick={() => onSlot(slot.from, slot.to)}
                  className={clsx(
                    'rounded-2xl border px-3 py-2.5 text-xs font-medium transition-colors',
                    active
                      ? 'border-leaf bg-leaf-soft text-leaf-dark'
                      : 'border-line bg-surface text-ink-soft hover:bg-sand',
                  )}
                >
                  {clockTime(slot.from)} - {clockTime(slot.to)}
                </button>
              );
            })}
          </div>

          {chosenDay && chosenDay.slots.length === 0 && (
            <p className="text-xs text-ink-muted">No windows left on that day.</p>
          )}
        </>
      )}
    </div>
  );
}
