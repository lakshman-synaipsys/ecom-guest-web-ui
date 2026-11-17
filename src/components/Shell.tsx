import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { money } from '@/lib/format';
import { useWhere } from '@/lib/location';
import { useCart, useStoreConfig } from '@/lib/queries';
import { setMediaConfig } from '@/lib/media';
import { Sheet } from '@/components/ui';
import { LocationDialog } from './LocationDialog';
import { Logo } from './Brand';
import { ProfileMenu } from './ProfileMenu';
import { SearchBox } from './SearchBox';

/**
 * The frame.
 *
 * One header on every screen size: logo, where you are, search, the basket
 * and the profile - the same places a shopper finds them in any other app.
 * Everything else lives in the footer at the bottom of the page, which is
 * links rather than navigation, so nothing sits in the way of the thumb.
 *
 * The basket is a sticky bar rather than only a badge: on a shopping app the
 * total is the thing people keep glancing at, and a number in a corner does
 * not answer "how much is this going to be".
 */
const FOOTER_LINKS: { title: string; links: { to: string; label: string }[] }[] = [
  {
    title: 'Shop',
    links: [
      { to: '/', label: 'Home' },
      { to: '/shops', label: 'All shops' },
      { to: '/search', label: 'Search' },
    ],
  },
  {
    title: 'Your account',
    links: [
      { to: '/orders', label: 'Your orders' },
      { to: '/addresses', label: 'Addresses' },
      { to: '/cart', label: 'Basket' },
      { to: '/account', label: 'My account' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { to: '/terms', label: 'Terms of use' },
      { to: '/privacy', label: 'Privacy policy' },
    ],
  },
];

export function Shell() {
  const config = useStoreConfig();
  const cart = useCart();
  const { where } = useWhere();
  const location = useLocation();
  const [locationOpen, setLocationOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [detectOnOpen, setDetectOnOpen] = useState(false);

  useEffect(() => {
    if (where) {
      setWelcomeOpen(false);
      return;
    }
    if (location.pathname.startsWith('/checkout')) {
      setWelcomeOpen(false);
      return;
    }
    if (!localStorage.getItem('qc.store.location-skipped')) setWelcomeOpen(true);
  }, [where, location.pathname]);

  useEffect(() => {
    const openPicker = () => setLocationOpen(true);
    window.addEventListener('qc-store-open-location', openPicker);
    return () => window.removeEventListener('qc-store-open-location', openPicker);
  }, []);

  function skipLocation() {
    localStorage.setItem('qc.store.location-skipped', '1');
    setWelcomeOpen(false);
  }

  // Every image on the page needs the cloud name; publish it once it lands.
  useEffect(() => {
    setMediaConfig(config.data ?? null);
  }, [config.data]);

  const zone = config.data?.zone;
  const count = cart.data?.itemCount ?? 0;
  const showCartBar = count > 0 && !location.pathname.startsWith('/cart')
                      && !location.pathname.startsWith('/checkout');

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      {/* ---------------------------------------------------------- head */}
      <header className="sticky top-0 z-40 border-b border-line bg-cream/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="Angadi, home">
            <Logo size={36} />
            <span className="hidden font-display text-lg font-semibold tracking-tight sm:block">
              Angadi
            </span>
          </Link>

          <button
            onClick={() => setLocationOpen(true)}
            className="flex min-w-0 items-center gap-1.5 rounded-pill bg-sand px-3 py-1.5
                       text-left text-xs text-ink-soft hover:bg-line"
            title="Choose your delivery location"
          >
            <span aria-hidden>📍</span>
            <span className="truncate font-medium">
              {where?.area || where?.label || 'Set location'}
            </span>
          </button>

          <SearchBox className="ml-auto hidden flex-1 sm:block sm:max-w-md" />

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:ml-0">
            <Link
              to="/cart"
              className="relative grid h-10 w-10 place-items-center rounded-pill bg-sand
                         text-lg hover:bg-line"
              aria-label="Basket"
            >
              <span aria-hidden>🧺</span>
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center
                                 rounded-pill bg-carrot px-1 text-2xs font-bold text-white">
                  {count}
                </span>
              )}
            </Link>

            <ProfileMenu />
          </div>
        </div>

        {/* the search box moves under the header on a phone */}
        <div className="px-4 pb-3 sm:hidden">
          <SearchBox />
        </div>

        {zone && !zone.openNow && (
          <p className="bg-sun-soft px-4 py-1.5 text-center text-2xs font-medium text-sun">
            {zone.closedReason ?? 'We are closed right now.'} You can still order for later.
          </p>
        )}
      </header>

      {/* ---------------------------------------------------------- body */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-4 sm:px-6 sm:pb-16">
        <Outlet />
      </main>

      {/* ------------------------------------------------------ cart bar */}
      {showCartBar && cart.data && (
        <Link
          to="/cart"
          className="fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40
                     flex items-center justify-between gap-3 rounded-pill bg-leaf px-5 py-3
                     text-white shadow-lift animate-fade-up sm:inset-x-auto sm:bottom-5
                     sm:left-1/2 sm:w-[26rem] sm:-translate-x-1/2"
        >
          <span className="text-sm font-semibold">
            {count} item{count === 1 ? '' : 's'}
            <span className="mx-1.5 opacity-50">|</span>
            <span className="tabular">{money(cart.data.itemsPaise)}</span>
          </span>
          <span className="text-sm font-semibold">View basket &rsaquo;</span>
        </Link>
      )}

      {/* --------------------------------------------------------- footer */}
      <footer className="border-t border-line bg-surface pb-24 sm:pb-0">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-6 px-4 py-8 text-sm
                        sm:grid-cols-4 sm:px-6">
          <div className="col-span-2 sm:col-span-1">
            <Link to="/" className="flex items-center gap-2" aria-label="Angadi, home">
              <Logo size={28} />
              <span className="font-display text-base font-semibold tracking-tight">Angadi</span>
            </Link>
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">
              Your town's shops, delivered.
            </p>
            {zone && (
              <p className="mt-2 text-2xs leading-relaxed text-ink-muted">
                Delivering within {(zone.radiusMetres / 1000).toFixed(0)} km &middot;{' '}
                {zone.opensAt?.slice(0, 5)} to {zone.closesAt?.slice(0, 5)}
              </p>
            )}
          </div>

          {FOOTER_LINKS.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                {group.title}
              </p>
              <ul className="space-y-1.5">
                {group.links.map((link) => (
                  <li key={link.to + link.label}>
                    <Link to={link.to} className="text-xs text-ink-muted hover:text-leaf">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <p className="border-t border-line px-4 py-3 text-center text-2xs text-ink-faint">
          &copy; {new Date().getFullYear()} Angadi
        </p>
      </footer>

      <Sheet open={welcomeOpen} onClose={skipLocation} title="Welcome to Angadi">
        <div className="space-y-3 pb-2">
          <p className="text-sm leading-relaxed text-ink-soft">
            Please provide your delivery location to see products at nearby stores.
          </p>
          <button
            className="btn-primary btn-block"
            onClick={() => {
              localStorage.removeItem('qc.store.location-skipped');
              setWelcomeOpen(false);
              setDetectOnOpen(true);
              setLocationOpen(true);
            }}
          >
            Detect my current location
          </button>
          <button className="btn-ghost btn-block" onClick={skipLocation}>Skip / Set up later</button>
        </div>
      </Sheet>

      <LocationDialog
        open={locationOpen}
        onClose={() => setLocationOpen(false)}
        initialCoords={{ lat: zone?.centreLat ?? 13.445006584996664, lng: zone?.centreLng ?? 79.55304637537404 }}
        detectOnOpen={detectOnOpen}
        onDetectHandled={() => setDetectOnOpen(false)}
      />
    </div>
  );
}
