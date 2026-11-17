import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiRequestError } from '@/lib/api';
import { maxQtyFor, money, packLabel, qty as qtyText, stepFor } from '@/lib/format';
import { useAddToCart, useCart, useCategories, useCategoryItems, useItem, useSetCartQty } from '@/lib/queries';
import { Price, ProductTile, TileGrid } from '@/components/ProductTile';
import { Art, AvailabilityNote, Chip, EmptyState, ErrorNote, Stepper } from '@/components/ui';
import { Loading, TileSkeletons } from '@/components/Loaders';
import { ProductReviewSection } from '@/components/ReviewSection';
import type { ShopOffer, Variant } from '@/lib/types';

/**
 * The full product page.
 *
 * The sheet is for a quick decision inside a grid; this is the page a
 * shopper opens when they actually want to know what is in the packet, or
 * when they arrive from a shared link or a search engine. Same data, more
 * room, and it has a URL - which is the part that matters, because a
 * product you cannot send to somebody is a product nobody talks about.
 */
export function ProductPage() {
  const { kind = 'PRODUCT', slug = '' } = useParams();
  const navigate = useNavigate();

  const detail = useItem(kind, slug);
  const categories = useCategories();
  const cart = useCart();
  const addToCart = useAddToCart();
  const setQty = useSetCartQty();

  const [variantId, setVariantId] = useState<string | null>(null);
  const [offeringId, setOfferingId] = useState<string | null>(null);
  const [shownImage, setShownImage] = useState<string | null>(null);
  const [openSpec, setOpenSpec] = useState<string | null>('Ingredients');
  const [error, setError] = useState<string | null>(null);

  const item = detail.data;
  const categorySlug = item?.categoryId
    ? categories.data?.find((category) => category.id === item.categoryId)?.slug
      ?? (item.categoryName ? slugify(item.categoryName) : '')
    : item?.categoryName ? slugify(item.categoryName) : '';
  const categoryItems = useCategoryItems(categorySlug);
  const relatedItems = (categoryItems.data ?? []).filter(
    (tile) => tile.id !== item?.id && tile.slug !== slug,
  );
  const variants = item?.variants ?? [];

  const variant: Variant | undefined = useMemo(
    () => variants.find((v) => v.productId === variantId) ?? variants[0],
    [variants, variantId],
  );

  /** Cheapest shop that is open and has it; failing that, cheapest in-stock. */
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

  useEffect(() => {
    setVariantId(null);
    setOfferingId(null);
    setShownImage(null);
    setError(null);
  }, [slug, kind]);

  if (detail.isLoading) return <Loading label="Loading..." />;

  if (!item || !variant) {
    return (
      <EmptyState
        emoji="🔍"
        title="We do not have that item"
        body="It may have been retired, or no shop is stocking it today."
        action={<Link to="/" className="btn-primary">Back to shopping</Link>}
      />
    );
  }

  const line = cart.data?.shops.flatMap((shop) => shop.lines)
    .find((row) => row.offeringId === offer?.offeringId);

  const gallery = item.gallery.length > 0 ? item.gallery : [item.imagePublicId ?? ''];
  const hero = shownImage ?? gallery[0] ?? null;
  const step = stepFor(variant.unitType, variant.unitSize);
  const pack = packLabel(variant.unitType, variant.unitSize);

  /* Own hold added back - see ProductSheet for why. */
  const ownPacks = line ? line.qty / (variant.unitSize || 1) : 0;
  const cap = offer
    ? maxQtyFor(
        offer.maxQtyPerOrder,
        offer.availablePacks == null ? null : offer.availablePacks + ownPacks,
        variant.unitSize,
      )
    : undefined;

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

  return (
    <div className="pb-24">
      <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
        <Link to="/" className="hover:text-leaf">Home</Link>
        {item.categoryName && (
          <>
            <span>&rsaquo;</span>
            <Link to={`/c/${slugify(item.categoryName)}`} className="hover:text-leaf">
              {item.categoryName}
            </Link>
          </>
        )}
        <span>&rsaquo;</span>
        <span className="text-ink-soft">{item.name}</span>
      </nav>

      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        {/* ------------------------------------------------------ gallery */}
        <div className="lg:sticky lg:top-24">
          <div className="overflow-hidden rounded-card border border-line bg-surface">
            <div className="aspect-square w-full">
              <Art publicId={hero} name={item.name} size={900} rounded="rounded-none" />
            </div>
          </div>

          {gallery.length > 1 && (
            <div className="rail mt-3">
              {gallery.map((publicId, index) => (
                <button
                  key={`${publicId}-${index}`}
                  onClick={() => setShownImage(publicId)}
                  className={clsx(
                    'h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors',
                    hero === publicId ? 'border-leaf' : 'border-line hover:border-line-strong',
                  )}
                >
                  <Art publicId={publicId} name={item.name} size={120} rounded="rounded-none" />
                </button>
              ))}
            </div>
          )}

          {/* the three things worth promising, in the space a carousel
              would otherwise waste */}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Promise emoji="🛵" title="Fast" body="Usually under an hour" />
            <Promise emoji="🧾" title="Shop prices" body="No markup on the shelf price" />
            <Promise emoji="↩️" title="Not right?" body="Tell the rider, we take it back" />
          </div>
        </div>

        {/* ------------------------------------------------------- detail */}
        <div>
          <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight">
            {item.name}
          </h1>
          {item.localName && (
            <p className="mt-1 text-base text-ink-soft">{item.localName}</p>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {variant.isVeg === true && <VegMark veg />}
            {variant.isVeg === false && <VegMark veg={false} />}
            {item.brand && <Chip>{item.brand}</Chip>}
            {item.categoryName && <Chip>{item.categoryName}</Chip>}
            {item.requiresPrescription && <Chip tone="berry">Prescription needed</Chip>}
          </div>

          {/* ------------------------------------------------------ price */}
          {offer && (
            <div className="mt-5">
              <Price pricePaise={offer.pricePaise} mrpPaise={offer.mrpPaise} size="lg" />
              <p className="mt-1 text-xs text-ink-muted">
                {variant.unitSize === 1 ? variant.label : `for ${pack}`}
                {' at '}
                <Link to={`/shops/${offer.shopSlug}`} className="font-medium text-leaf hover:underline">
                  {offer.shopName}
                </Link>
              </p>
            </div>
          )}

          {/* ------------------------------------------------------ sizes */}
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
                        'rounded-2xl border px-4 py-2.5 text-left transition-colors',
                        active ? 'border-leaf bg-leaf-soft'
                               : 'border-line-strong bg-surface hover:bg-sand',
                      )}
                    >
                      <span className={clsx('block text-sm font-semibold',
                                            active ? 'text-leaf-dark' : 'text-ink')}>
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

          {/* ------------------------------------------------------ shops */}
          {!offer ? (
            <section className="mt-6 rounded-2xl border-2 border-carrot-line bg-carrot-soft p-4">
              <p className="text-sm font-semibold text-carrot">Not available today</p>
              <p className="mt-1 text-xs text-carrot/90">
                Check back soon - all shops are out of stock right now.
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
                  .map((option) => (
                    <li key={option.offeringId}>
                      <button
                        onClick={() => setOfferingId(option.offeringId)}
                        className={clsx(
                          'flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors',
                          option.offeringId === offer?.offeringId
                            ? 'border-leaf bg-leaf-soft' : 'border-line bg-surface hover:bg-sand',
                        )}
                      >
                        <span className="h-9 w-9 shrink-0">
                          <Art publicId={option.shopImagePublicId} name={option.shopName}
                               size={96} rounded="rounded-full" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{option.shopName}</span>
                          <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                            {!option.shopOpenNow && <Chip>Closed now</Chip>}
                            <AvailabilityNote value={option.availability} />
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <Price pricePaise={option.pricePaise} mrpPaise={option.mrpPaise} size="sm" />
                          {variant.unitSize !== 1 && (
                            <span className="block text-2xs text-ink-muted">per {pack}</span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
              </ul>
            </section>
          )}

          {error && <div className="mt-4">{<ErrorNote message={error} />}</div>}

          {/* ------------------------------------------------- highlights */}
          {(item.highlights.length > 0 || variant.highlights.length > 0) && (
            <section className="mt-7">
              <h2 className="section-title mb-2">Why this one</h2>
              <ul className="space-y-1.5">
                {(variant.highlights.length > 0 ? variant.highlights : item.highlights)
                  .map((point, index) => (
                    <li key={index} className="flex gap-2 text-sm text-ink-soft">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf" />
                      {point}
                    </li>
                  ))}
              </ul>
            </section>
          )}

          {item.description && (
            <section className="mt-6">
              <h2 className="section-title mb-2">About this item</h2>
              <p className="text-sm leading-relaxed text-ink-soft">{item.description}</p>
            </section>
          )}

          {/* ------------------------------------------------------ specs */}
          {variant.specs.length > 0 && (
            <section className="mt-6">
              <h2 className="section-title mb-2">Product information</h2>
              <div className="divide-y divide-line overflow-hidden rounded-card border border-line
                              bg-surface">
                {variant.specs.map((spec) => {
                  const open = openSpec === spec.label;
                  return (
                    <div key={spec.label}>
                      <button
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                        onClick={() => setOpenSpec(open ? null : spec.label)}
                      >
                        <span className="text-sm font-medium">{spec.label}</span>
                        <span className={clsx('text-ink-faint transition-transform',
                                              open && 'rotate-180')}>&#9662;</span>
                      </button>
                      {open && (
                        <p className="px-4 pb-3.5 text-sm leading-relaxed text-ink-soft">
                          {spec.value}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {offer && <ProductReviewSection productId={variant.productId} shopId={offer.shopId} />}

        </div>
      </div>

      {/* ------------------------------------------- related category items */}
      {categorySlug && (categoryItems.isLoading || relatedItems.length > 0) && (
        <section className="mt-10 border-t border-line pt-7">
          <div className="mb-4">
            <h2 className="section-title">More from {item.categoryName ?? 'this category'}</h2>
            <p className="mt-1 text-sm text-ink-muted">Explore other products in the same category.</p>
          </div>
          <TileGrid>
            {categoryItems.isLoading && <TileSkeletons count={4} />}
            {relatedItems.map((tile) => (
              <ProductTile
                key={`${tile.kind}-${tile.id}`}
                tile={tile}
                allowOutOfStockOpen
                onOpen={(selected) => navigate(`/item/${selected.kind}/${selected.slug}`)}
              />
            ))}
          </TileGrid>
        </section>
      )}

      {/* ------------------------------------------------------ sticky bar */}
      {offer ? (
        <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40
                        border-t border-line bg-surface/95 px-4 py-3 backdrop-blur
                        sm:bottom-0 sm:pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6">
          <div className="mx-auto flex max-w-6xl items-center gap-4">
            {/* The running total, for the same reason as in the sheet: the
                price of one is already up the page, and a number beside a
                stepper that does not move when the stepper does reads as a
                bug. */}
            <div className="min-w-0 flex-1">
              {line ? (
                <>
                  <span className="price-now text-lg leading-none">
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
            <div className="w-40 shrink-0">
              <Stepper
                value={line ? line.qty : 0}
                step={step}
                max={cap}
                unitSuffix={variant.fractional ? variant.unitType.toLowerCase() : undefined}
                busy={addToCart.isPending || setQty.isPending}
                onChange={(next) => void change(next)}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-carrot-soft/95
                        px-4 py-3 backdrop-blur pb-[calc(0.75rem+env(safe-area-inset-bottom))]
                        sm:px-6">
          <div className="mx-auto flex max-w-6xl items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-carrot">Out of stock</p>
              <p className="text-2xs text-carrot/80">Not available at any shop right now</p>
            </div>
            <button className="btn-ghost text-carrot" disabled>
              Add to cart
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==================================================================== */

/**
 * The green or brown square on every packet of food sold in India. It is a
 * legal marking, not decoration, so it is drawn rather than emoji - an
 * emoji renders differently on every phone and this one has to be exact.
 */
function VegMark({ veg }: { veg: boolean }) {
  const colour = veg ? '#0B7A3B' : '#9A2B2B';
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md border px-1.5 py-1 text-2xs font-semibold"
      style={{ borderColor: colour, color: colour }}
      title={veg ? 'Vegetarian' : 'Non-vegetarian'}
    >
      <span className="grid h-3 w-3 place-items-center rounded-[2px] border-[1.5px]"
            style={{ borderColor: colour }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: colour }} />
      </span>
      {veg ? 'Veg' : 'Non-veg'}
    </span>
  );
}

function Promise({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-2 py-3">
      <div className="text-lg" aria-hidden>{emoji}</div>
      <p className="mt-1 text-2xs font-semibold text-ink">{title}</p>
      <p className="mt-0.5 text-2xs leading-tight text-ink-muted">{body}</p>
    </div>
  );
}

/** Category names come back as text; the route wants the slug. */
function slugify(name: string): string {
  return name.toLowerCase().replace(/&/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
