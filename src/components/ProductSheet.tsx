import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiRequestError } from '@/lib/api';
import { discountPct, maxQtyFor, money, packLabel, qty as qtyText, stepFor } from '@/lib/format';
import { useAddToCart, useCart, useItem, useSetCartQty } from '@/lib/queries';
import { Art, AvailabilityNote, Chip, ErrorNote, Sheet, Stepper } from './ui';
import { Loading } from './Loaders';
import { Price } from './ProductTile';
import type { ShopOffer, Variant } from '@/lib/types';

/**
 * The sheet that opens when a card is tapped, and the only place in the app
 * where a shopper chooses a size and a shop.
 *
 * Both choices are pre-made for them: the smallest size, and the cheapest
 * shop that actually has it. Almost nobody changes either, and the ones who
 * do are the ones who care - so the choice is visible but never in the way.
 */
export function ProductSheet({
  open,
  kind,
  slug,
  onClose,
}: {
  open: boolean;
  kind: 'GROUP' | 'PRODUCT' | null;
  slug: string | null;
  onClose: () => void;
}) {
  const detail = useItem(open ? kind : null, open ? slug : null);
  const cart = useCart();
  const addToCart = useAddToCart();
  const setQty = useSetCartQty();

  const [variantId, setVariantId] = useState<string | null>(null);
  const [offeringId, setOfferingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const variants = detail.data?.variants ?? [];

  const variant: Variant | undefined = useMemo(
    () => variants.find((v) => v.productId === variantId) ?? variants[0],
    [variants, variantId],
  );

  /**
   * Default to the cheapest shop that is open and has stock; fall back to
   * the cheapest in-stock at all.
   */
  const offer: ShopOffer | undefined = useMemo(() => {
    if (!variant) return undefined;
    const chosen = variant.offers.find((o) => o.offeringId === offeringId);
    if (chosen && chosen.availability !== 'OUT') return chosen;

    // Filter to only in-stock offerings
    const inStock = variant.offers.filter((o) => o.availability !== 'OUT');
    if (inStock.length === 0) return undefined;

    // Prefer open shops first
    return (
      inStock.find((o) => o.shopOpenNow)
      ?? inStock[0]
    );
  }, [variant, offeringId]);

  // A new sheet starts with a clean selection, not the last item's.
  useEffect(() => {
    if (!open) return;
    setVariantId(null);
    setOfferingId(null);
    setError(null);
  }, [open, slug]);

  const line = cart.data?.shops
    .flatMap((shop) => shop.lines)
    .find((row) => row.offeringId === offer?.offeringId);

  const step = variant ? stepFor(variant.unitType, variant.unitSize) : 1;
  const pack = variant ? packLabel(variant.unitType, variant.unitSize) : '';

  /*
   * What this shopper may still take. `availablePacks` has every open
   * basket's hold subtracted, this shopper's included, so their own is
   * added back - they are not competing with themselves for the two kilos
   * already in their basket.
   */
  const ownPacks = line && variant ? line.qty / (variant.unitSize || 1) : 0;
  const cap = offer && variant
    ? maxQtyFor(
        offer.maxQtyPerOrder,
        offer.availablePacks == null ? null : offer.availablePacks + ownPacks,
        variant.unitSize,
      )
    : undefined;
  const busy = addToCart.isPending || setQty.isPending;

  async function change(next: number) {
    if (!offer || !variant || !detail.data) return;
    setError(null);

    try {
      if (line) await setQty.mutateAsync({ itemId: line.itemId, qty: next });
      else {
        await addToCart.mutateAsync({
          offeringId: offer.offeringId,
          qty: next,
          guest: {
            name: detail.data.name,
            requiresPrescription: detail.data.requiresPrescription,
            variant,
            offer,
          },
        });
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'That did not work. Try again.');
    }
  }

  const item = detail.data;
  const savedPct = offer ? discountPct(offer.pricePaise, offer.mrpPaise) : null;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      footer={
        offer && variant ? (
          <div className="flex items-center gap-3">
            {/*
              * What this costs as it stands, not what one of them costs.
              * The shop list above already gives every shop's price, so
              * repeating it here would be the same number twice and would
              * sit still while the stepper moved - which reads as a bug
              * even when the arithmetic is right. Once something is in the
              * basket this is the running total, and it changes on every
              * tap.
              */}
            <div className="min-w-0 flex-1">
              {line ? (
                <>
                  <span className="price-now text-xl leading-none">
                    {money(line.linePaise)}
                  </span>
                  <p className="truncate text-2xs text-ink-muted">
                    {qtyText(line.qty, variant.unitType)} &middot; {offer.shopName}
                  </p>
                </>
              ) : (
                <>
                  <p className="truncate text-sm font-semibold text-ink">
                    {variant.label === pack ? pack : `${variant.label} · ${pack}`}
                  </p>
                  <p className="truncate text-2xs text-ink-muted">{offer.shopName}</p>
                </>
              )}
            </div>
            <div className="w-36">
              <Stepper
                value={line ? line.qty : 0}
                step={step}
                max={cap}
                unitSuffix={variant.fractional ? variant.unitType.toLowerCase() : undefined}
                busy={busy}
                onChange={(next) => void change(next)}
              />
            </div>
          </div>
        ) : null
      }
    >
      {detail.isLoading && <Loading label="Loading..." />}

      {item && variant && (
        <div className="animate-fade-up">
          {/* ------------------------------------------------------ head */}
          <div className="flex gap-4">
            <div className="h-28 w-28 shrink-0">
              <Art publicId={item.imagePublicId} name={item.name} size={320} />
            </div>

            <div className="min-w-0 flex-1 pt-1">
              <h2 className="font-display text-xl font-semibold leading-snug tracking-tight">
                {item.name}
              </h2>
              {item.localName && (
                <p className="mt-0.5 text-sm text-ink-soft">{item.localName}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {item.brand && <Chip>{item.brand}</Chip>}
                {item.categoryName && <Chip>{item.categoryName}</Chip>}
                {item.requiresPrescription && <Chip tone="berry">Prescription needed</Chip>}
                {savedPct && <Chip tone="carrot">{savedPct}% off</Chip>}
              </div>
            </div>
          </div>

          {item.description && (
            <p className="mt-4 text-sm leading-relaxed text-ink-soft">{item.description}</p>
          )}

          {/* --------------------------------------------------- sizes */}
          {variants.length > 1 && (
            <section className="mt-6">
              <p className="eyebrow mb-2">Size</p>
              <div className="flex flex-wrap gap-2">
                {variants.map((option) => {
                  const active = option.productId === variant.productId;
                  return (
                    <button
                      key={option.productId}
                      onClick={() => {
                        setVariantId(option.productId);
                        setOfferingId(null);
                      }}
                      className={clsx(
                        'rounded-2xl border px-3.5 py-2 text-left transition-colors',
                        active
                          ? 'border-leaf bg-leaf-soft'
                          : 'border-line-strong bg-surface hover:bg-sand',
                      )}
                    >
                      <span
                        className={clsx(
                          'block text-sm font-semibold',
                          active ? 'text-leaf-dark' : 'text-ink',
                        )}
                      >
                        {option.label}
                      </span>
                      <span className="block text-2xs tabular text-ink-muted">
                        {money(option.fromPricePaise)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* --------------------------------------------------- shops */}
          {!offer ? (
            <section className="mt-6 rounded-2xl border-2 border-carrot-line bg-carrot-soft p-4">
              <p className="text-sm font-semibold text-carrot">Not available today</p>
              <p className="mt-1 text-xs text-carrot/90">
                All shops are out of stock right now. Check back soon.
              </p>
            </section>
          ) : (
            <section className="mt-6">
              <p className="eyebrow mb-2">
                {variant.offers.filter((o) => o.availability !== 'OUT').length === 1
                  ? 'Sold by'
                  : `Sold by ${variant.offers.filter((o) => o.availability !== 'OUT').length} shops`}
              </p>

              <ul className="space-y-2">
                {variant.offers
                  .filter((option) => option.availability !== 'OUT')
                  .map((option) => {
                    const active = option.offeringId === offer?.offeringId;

                    return (
                      <li key={option.offeringId}>
                        <button
                          onClick={() => setOfferingId(option.offeringId)}
                          className={clsx(
                            'flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors',
                            active ? 'border-leaf bg-leaf-soft' : 'border-line bg-surface hover:bg-sand',
                          )}
                        >
                          <div className="h-9 w-9 shrink-0">
                            <Art
                              publicId={option.shopImagePublicId}
                              name={option.shopName}
                              size={96}
                              rounded="rounded-full"
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{option.shopName}</p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                              {!option.shopOpenNow && <Chip>Closed now</Chip>}
                              <AvailabilityNote value={option.availability} />
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <Price pricePaise={option.pricePaise} mrpPaise={option.mrpPaise} size="sm" />
                            {/* Says what the price buys, but only when that
                                is not simply one of the obvious thing. */}
                            {variant.unitSize !== 1 && (
                              <span className="block text-2xs text-ink-muted">per {pack}</span>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </section>
          )}

          {error && <div className="mt-4">{<ErrorNote message={error} />}</div>}

          <Link
            to={`/item/${item.kind}/${item.slug}`}
            onClick={onClose}
            className="btn-secondary btn-sm btn-block mt-5"
          >
            Ingredients, storage and full details
          </Link>
        </div>
      )}

      {!detail.isLoading && !item && (
        <p className="py-10 text-center text-sm text-ink-muted">
          We could not find that item.
        </p>
      )}
    </Sheet>
  );
}
