import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { money } from '@/lib/format';
import { useWhere } from '@/lib/location';
import { useHome } from '@/lib/queries';
import { placeholderColours } from '@/lib/media';
import { ProductSheet } from '@/components/ProductSheet';
import { ProductTile, TileGrid, TileRail } from '@/components/ProductTile';
import { Art, Chip } from '@/components/ui';
import { TileSkeletons } from '@/components/Loaders';
import type { Banner, Category, HomeSection, Offer, ShopCard, Tile, Zone } from '@/lib/types';

/**
 * The home page.
 *
 * Ordered by what a person actually needs, not by what is easiest to
 * build: what is on offer, what kind of thing they want, which shops are
 * open, one shop given room, then the things most shops carry.
 *
 * Everything above the fold works with no images and no location
 * permission, because on the first visit that is exactly what we have.
 */
export function HomePage() {
  const { where } = useWhere();
  const home = useHome(where ? { lat: where.lat, lng: where.lng } : null);
  const [open, setOpen] = useState<Tile | null>(null);

  const feed = home.data;

  return (
    <div className="space-y-9">
      {/*
        * Every block on this page, in the order the console says.
        *
        * There is deliberately no fixed running order here any more. A new
        * offer goes above the banners because somebody moved it there this
        * morning, not because a developer shipped it - and the two cases
        * that used to need code, "same section twice" and "hide this for a
        * week", are now just rows.
        *
        * A kind this build does not know is skipped rather than crashed
        * on, so the console can be taught a new section before the app
        * that draws it has shipped.
        */}
      {feed?.sections.map((section, index) => (
        <Section
          key={`${section.kind}-${index}`}
          section={section}
          zone={feed.zone}
          near={where !== null}
          onOpen={setOpen}
        />
      ))}

      {/* The one thing that is not a section: the first paint, before any
          of this has arrived. */}
      {home.isLoading && (
        <section>
          <TileGrid><TileSkeletons count={10} /></TileGrid>
        </section>
      )}

      <ProductSheet
        open={open !== null}
        kind={open?.kind ?? null}
        slug={open?.slug ?? null}
        onClose={() => setOpen(null)}
      />
    </div>
  );
}

/* ==================================================================== */

/**
 * What each kind of section is called when the admin has not named it.
 * Kept here rather than in the database so that a shop which never opens
 * the layout tab still gets sentences somebody wrote on purpose.
 */
function defaultTitle(kind: HomeSection['kind'], near: boolean): string | null {
  switch (kind) {
    case 'OFFERS':     return 'Offers on right now';
    case 'CATEGORIES': return 'What are you after?';
    case 'SHOPS':      return near ? 'Shops near you' : 'Shops in town';
    case 'TRENDING':   return 'Things people are buying';
    default:           return null;
  }
}

function Section({
  section,
  zone,
  near,
  onOpen,
}: {
  section: HomeSection;
  zone: Zone;
  near: boolean;
  onOpen: (tile: Tile) => void;
}) {
  const title = section.title ?? defaultTitle(section.kind, near);

  switch (section.kind) {
    case 'HEADLINE':
      return (
        <section className="animate-fade-up">
          <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
            {section.title ?? (
              <>
                Everything from the shops
                <br className="hidden sm:block" /> around you, at your door.
              </>
            )}
          </h1>
          <p className="mt-1.5 max-w-lg text-sm text-ink-soft">
            {section.subtitle
              ?? `Groceries, vegetables, flowers and medicines within `
                 + `${(zone.radiusMetres / 1000).toFixed(0)} km`
                 + (zone.openNow ? ` - usually in ${zone.promisedEtaMinutes} minutes.` : '.')}
          </p>
        </section>
      );

    case 'BANNERS': {
      const banners = section.banners ?? [];
      // Wide strips stack full width; the hero ones swipe sideways. The
      // banner's own placement decides, so one section can be either.
      const wide = banners[0]?.placement === 'WIDE';
      return (
        <section>
          {title && <h2 className="section-title mb-3">{title}</h2>}
          {wide ? (
            <div className="space-y-3">
              {banners.map((banner) => <WideBanner key={banner.id} banner={banner} />)}
            </div>
          ) : (
            <div className="rail">
              {banners.map((banner) => <BannerCard key={banner.id} banner={banner} />)}
            </div>
          )}
        </section>
      );
    }

    case 'OFFERS':
      return (
        <section>
          {title && <h2 className="section-title mb-3">{title}</h2>}
          {section.subtitle && (
            <p className="-mt-2 mb-3 text-sm text-ink-soft">{section.subtitle}</p>
          )}
          <div className="rail items-stretch">
            {(section.offers ?? []).map((offer) => <OfferCard key={offer.id} offer={offer} />)}
          </div>
        </section>
      );

    case 'CATEGORIES':
      return (
        <section>
          {title && <h2 className="section-title mb-3">{title}</h2>}
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
            {(section.categories ?? []).map((category) => (
              <CategoryChip key={category.id} category={category} />
            ))}
          </div>
        </section>
      );

    case 'SHOPS': {
      const shops = section.shops ?? [];
      return (
        <section>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="section-title">{title}</h2>
            <Link to="/shops" className="text-xs font-semibold text-leaf hover:underline">
              See all
            </Link>
          </div>
          <div className="rail">
            {shops.map((shop) => <ShopChip key={shop.id} shop={shop} />)}
          </div>
        </section>
      );
    }

    case 'FEATURED_SHOP':
      return section.featured ? (
        <FeaturedShop
          shop={section.featured.shop}
          pitch={section.subtitle ?? section.featured.pitch}
          items={section.featured.items}
          onOpen={onOpen}
        />
      ) : null;

    case 'TRENDING':
      return (
        <section>
          {title && <h2 className="section-title mb-3">{title}</h2>}
          <TileGrid>
            {(section.tiles ?? []).map((tile) => (
              <ProductTile key={`${tile.kind}-${tile.id}`} tile={tile} onOpen={onOpen} />
            ))}
          </TileGrid>
        </section>
      );

    default:
      return null;
  }
}

/* ==================================================================== */

/**
 * An offer, as a card you can read at a glance.
 *
 * A code is shown in a dashed box because that is what a code looks like
 * everywhere else and people know to copy it. An offer that applies itself
 * says so instead of showing an empty box - there is nothing to type.
 */
function OfferCard({ offer }: { offer: Offer }) {
  const accent = offer.accentHex ?? '#B4661E';

  return (
    <div
      className="flex w-[17rem] shrink-0 flex-col rounded-card border p-4 sm:w-[19rem]"
      style={{ borderColor: `${accent}44`, background: `${accent}0F` }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="rounded-pill px-2.5 py-1 text-2xs font-bold text-white"
              style={{ background: accent }}>
          {offer.label}
        </span>
        {offer.automatic && <Chip tone="leaf">Applied for you</Chip>}
      </div>

      <p className="mt-2.5 font-display text-[0.9375rem] font-semibold leading-snug text-ink">
        {offer.title}
      </p>
      {offer.description && (
        <p className="mt-1 text-xs leading-relaxed text-ink-soft">{offer.description}</p>
      )}

      <div className="mt-auto pt-3">
        {offer.code ? (
          <span className="inline-block rounded-lg border border-dashed px-2.5 py-1
                           font-mono text-xs font-bold tracking-wider"
                style={{ borderColor: accent, color: accent }}>
            {offer.code}
          </span>
        ) : (
          <span className="text-2xs font-medium text-ink-muted">Nothing to type</span>
        )}
        {offer.whyNot && (
          <p className="mt-1.5 text-2xs text-ink-muted">{offer.whyNot}</p>
        )}
      </div>
    </div>
  );
}

/**
 * The full-width strip between sections.
 *
 * Wider and shorter than the cards at the top, so it reads as a divider
 * with a message rather than as another thing to swipe through.
 */
function WideBanner({ banner }: { banner: Banner }) {
  const navigate = useNavigate();
  const accent = banner.accentHex ?? '#12764A';
  const target = bannerTarget(banner);

  return (
    <button
      onClick={() => target && navigate(target)}
      disabled={!target}
      className="relative block h-28 w-full overflow-hidden rounded-card text-left shadow-card
                 transition-shadow enabled:hover:shadow-lift sm:h-36"
      style={{ background: accent }}
    >
      {banner.imagePublicId && (
        <div className="absolute inset-0">
          <Art publicId={banner.imagePublicId} name={banner.title} size={1400} ratio={21 / 6}
               rounded="rounded-none" />
        </div>
      )}
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(95deg, ${accent} 30%, ${accent}D9 60%, ${accent}55 100%)` }}
      />

      <div className="relative flex h-full max-w-2xl flex-col justify-center px-5 text-white sm:px-8">
        <h3 className="font-display text-base font-semibold leading-snug sm:text-xl">
          {banner.title}
        </h3>
        {banner.subtitle && (
          <p className="mt-1 text-xs leading-relaxed text-white/85 sm:text-sm">{banner.subtitle}</p>
        )}
        {target && (
          <span className="mt-2 text-xs font-semibold text-white/95">Have a look &rsaquo;</span>
        )}
      </div>
    </button>
  );
}

function bannerTarget(banner: Banner): string | null {
  if (banner.linkType === 'SHOP' && banner.linkValue)          return `/shops/${banner.linkValue}`;
  if (banner.linkType === 'CATEGORY' && banner.linkValue)      return `/c/${banner.linkValue}`;
  if (banner.linkType === 'PRODUCT_GROUP' && banner.linkValue) return `/item/GROUP/${banner.linkValue}`;
  return null;
}

/**
 * A banner with no photograph is not a broken banner. It is a coloured
 * card with words on it - which is what a small shop's promotion actually
 * looks like, and it means the strip is useful on day one.
 */
function BannerCard({ banner }: { banner: Banner }) {
  const navigate = useNavigate();
  const accent = banner.accentHex ?? '#12764A';

  const target = bannerTarget(banner);

  return (
    <button
      onClick={() => target && navigate(target)}
      disabled={!target}
      className="relative h-36 w-[19rem] shrink-0 overflow-hidden rounded-card text-left
                 shadow-card transition-shadow enabled:hover:shadow-lift sm:h-40 sm:w-[24rem]"
      style={{ background: accent }}
    >
      {banner.imagePublicId && (
        <div className="absolute inset-0 opacity-45">
          <Art
            publicId={banner.imagePublicId}
            name={banner.title}
            size={800}
            ratio={16 / 9}
            rounded="rounded-none"
          />
        </div>
      )}

      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(100deg, ${accent} 20%, ${accent}CC 55%, ${accent}66 100%)` }}
      />

      <div className="relative flex h-full flex-col justify-end p-5 text-white">
        <h3 className="font-display text-lg font-semibold leading-snug">{banner.title}</h3>
        {banner.subtitle && (
          <p className="mt-1 text-xs leading-relaxed text-white/85">{banner.subtitle}</p>
        )}
        {target && (
          <span className="mt-2.5 text-xs font-semibold text-white/95">Have a look &rsaquo;</span>
        )}
      </div>
    </button>
  );
}

function CategoryChip({ category }: { category: Category }) {
  const [from, to] = placeholderColours(category.name);
  const accent = category.accentHex ?? '#12764A';

  return (
    <Link to={`/c/${category.slug}`} className="group flex flex-col items-center gap-1.5">
      <div
        className="grid aspect-square w-full place-items-center overflow-hidden rounded-[16px]
                   border border-line transition-transform group-hover:-translate-y-0.5"
        style={{ background: `linear-gradient(140deg, ${from}, ${to})` }}
      >
        {category.imagePublicId ? (
          <Art
            publicId={category.imagePublicId}
            name={category.name}
            size={160}
            rounded="rounded-[16px]"
          />
        ) : (
          <span
            className="font-display text-lg font-bold"
            style={{ color: accent }}
            aria-hidden
          >
            {category.name.slice(0, 1)}
          </span>
        )}
      </div>
      <span className="line-clamp-2 text-center text-2xs font-medium leading-tight text-ink-soft">
        {category.name}
      </span>
    </Link>
  );
}

function ShopChip({ shop }: { shop: ShopCard }) {
  return (
    <Link
      to={`/shops/${shop.slug}`}
      className="tile flex w-[15rem] shrink-0 items-center gap-3 p-3"
    >
      <div className="h-12 w-12 shrink-0">
        <Art publicId={shop.imagePublicId} name={shop.name} size={120} rounded="rounded-full" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{shop.name}</p>
        <p className="truncate text-2xs text-ink-muted">
          {shop.sells.length > 0 ? shop.sells.join(' · ') : `${shop.itemCount} items`}
        </p>
        <div className="mt-1 flex items-center gap-1.5">
          {shop.openNow
            ? <Chip tone="leaf">Open</Chip>
            : <Chip>Closed</Chip>}
          {shop.distanceKm !== null && (
            <span className="text-2xs tabular text-ink-faint">{shop.distanceKm} km</span>
          )}
        </div>
      </div>
    </Link>
  );
}

/**
 * One shop given room to breathe.
 *
 * In a town with twelve shops this beats any recommendation engine: it is
 * how somebody finds out the flower stall exists at all, which no amount
 * of "customers also bought" will tell them.
 */
function FeaturedShop({
  shop,
  pitch,
  items,
  onOpen,
}: {
  shop: ShopCard;
  pitch: string;
  items: Tile[];
  onOpen: (tile: Tile) => void;
}) {
  const [from, to] = placeholderColours(shop.name);

  return (
    <section className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
      <div
        className="relative h-36 sm:h-44"
        style={{ background: `linear-gradient(120deg, ${from}, ${to})` }}
      >
        {shop.coverPublicId && (
          <Art
            publicId={shop.coverPublicId}
            name={shop.name}
            size={1200}
            ratio={21 / 9}
            rounded="rounded-none"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-4">
          <div className="h-14 w-14 shrink-0 rounded-full ring-[3px] ring-white">
            <Art publicId={shop.imagePublicId} name={shop.name} size={160} rounded="rounded-full" />
          </div>
          <div className="min-w-0 flex-1 pb-0.5 text-white">
            <p className="text-2xs font-semibold uppercase tracking-[0.09em] text-white/75">
              Shop of the day
            </p>
            <h2 className="truncate font-display text-xl font-semibold tracking-tight">
              {shop.name}
            </h2>
            <p className="truncate text-xs text-white/85">{pitch}</p>
          </div>
          <Link
            to={`/shops/${shop.slug}`}
            className="hidden shrink-0 rounded-pill bg-white px-4 py-2 text-xs font-semibold
                       text-ink shadow-card hover:bg-sand sm:inline-block"
          >
            Visit shop
          </Link>
        </div>
      </div>

      <div className="p-4">
        <TileRail>
          {items.map((tile) => (
            <ProductTile
              key={`${tile.kind}-${tile.id}`}
              tile={tile}
              onOpen={onOpen}
              className="w-[9.5rem] shrink-0"
            />
          ))}
        </TileRail>

        <Link
          to={`/shops/${shop.slug}`}
          className="btn-secondary btn-sm btn-block mt-3 sm:hidden"
        >
          Everything at {shop.name}
        </Link>

        {shop.addressText && (
          <p className="mt-3 hidden text-2xs text-ink-muted sm:block">
            {shop.addressText}
            {shop.landmark && ` · near ${shop.landmark}`}
            {shop.distanceKm !== null && ` · ${shop.distanceKm} km away`}
            {shop.opensAt && ` · ${shop.opensAt.slice(0, 5)} to ${shop.closesAt?.slice(0, 5)}`}
          </p>
        )}
      </div>
    </section>
  );
}

/** Exported for the shops page, which shows the same card in a grid. */
export function ShopGridCard({ shop }: { shop: ShopCard }) {
  const [from, to] = placeholderColours(shop.name);

  return (
    <Link to={`/shops/${shop.slug}`} className="tile overflow-hidden">
      <div className="relative h-24" style={{ background: `linear-gradient(120deg, ${from}, ${to})` }}>
        {shop.coverPublicId && (
          <Art publicId={shop.coverPublicId} name={shop.name} size={640} ratio={21 / 9}
               rounded="rounded-none" />
        )}
        <div className="absolute -bottom-6 left-4 h-12 w-12 rounded-full ring-[3px] ring-white">
          <Art publicId={shop.imagePublicId} name={shop.name} size={120} rounded="rounded-full" />
        </div>
      </div>

      <div className="px-4 pb-4 pt-8">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold">{shop.name}</p>
            <p className="truncate text-2xs text-ink-muted">
              {shop.sells.length > 0 ? shop.sells.join(' · ') : shop.shopType.toLowerCase()}
            </p>
          </div>
          {shop.openNow ? <Chip tone="leaf">Open</Chip> : <Chip>Closed</Chip>}
        </div>

        <p className="mt-2 line-clamp-1 text-xs text-ink-soft">
          {shop.addressText ?? 'In town'}
          {shop.landmark && ` · near ${shop.landmark}`}
        </p>

        <div className="mt-2.5 flex items-center gap-2 text-2xs text-ink-muted">
          <span className="tabular">{shop.itemCount} items</span>
          {shop.distanceKm !== null && <span className="tabular">{shop.distanceKm} km</span>}
          {shop.opensAt && <span>{shop.opensAt.slice(0, 5)}-{shop.closesAt?.slice(0, 5)}</span>}
        </div>
      </div>
    </Link>
  );
}

/** Small helper the cart and checkout also use for a total line. */
export function TotalLine({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between py-1.5">
      <span className={strong ? 'text-sm font-semibold' : 'text-sm text-ink-soft'}>{label}</span>
      <span className={strong ? 'font-display text-lg font-semibold tabular' : 'text-sm tabular'}>
        {money(value)}
      </span>
    </div>
  );
}
