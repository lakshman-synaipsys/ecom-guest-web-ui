import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { phone as formatPhone } from '@/lib/format';
import { useMe } from '@/lib/queries';

/**
 * What the account menu offers. Adding a destination - a wallet, saved
 * payment methods, help - is one more line here; nothing else changes.
 */
const MENU: { to: string; label: string; hint?: string }[] = [
  { to: '/orders', label: 'Your orders', hint: 'Track and reorder' },
  { to: '/addresses', label: 'Delivery addresses' },
  { to: '/cart', label: 'Your basket' },
  { to: '/account', label: 'My account' },
];

/**
 * The profile control in the header, the way every other app has it.
 *
 * Signed out it is a Sign in button; signed in it is the shopper's initial,
 * opening a small menu with their name and number. The name comes from the
 * server (useMe), so it is never older than the last time it was changed.
 */
export function ProfileMenu() {
  const { signedIn, session, signOut } = useAuth();
  const me = useMe();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // Close on navigation, outside click and Escape.
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!signedIn) {
    return <Link to="/signin" className="btn-secondary btn-sm">Sign in</Link>;
  }

  const phoneNumber = me.data?.phone ?? session?.phone ?? '';
  const rawName = me.data?.displayName ?? session?.displayName ?? '';
  // With no name the server falls back to the phone number; do not show it twice.
  const hasName = rawName !== '' && rawName !== phoneNumber;
  const initial = (hasName ? rawName : phoneNumber.replace(/\D/g, '').slice(-2) || '?')
    .slice(0, 1).toUpperCase();

  return (
    <div className="relative" ref={box}>
      <button
        onClick={() => setOpen((value) => !value)}
        className="grid h-10 w-10 place-items-center rounded-pill bg-leaf font-display
                   text-base font-semibold text-white hover:opacity-90"
        aria-label="Your profile"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {initial}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-2xl border
                     border-line bg-surface shadow-lift animate-fade-up"
        >
          <div className="border-b border-line px-4 py-3">
            <p className="truncate font-display text-base font-semibold">
              {hasName ? rawName : 'Welcome'}
            </p>
            <p className="text-xs tabular text-ink-muted">{formatPhone(phoneNumber)}</p>
            {me.data?.needsName && (
              <Link to="/account" className="mt-1 inline-block text-2xs font-semibold text-leaf">
                Add your name
              </Link>
            )}
          </div>

          <ul className="py-1">
            {MENU.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  role="menuitem"
                  className="flex items-center justify-between px-4 py-2.5 text-sm font-medium
                             hover:bg-sand"
                >
                  <span>{item.label}</span>
                  {item.hint && <span className="text-2xs text-ink-muted">{item.hint}</span>}
                </Link>
              </li>
            ))}
          </ul>

          <button
            role="menuitem"
            className="w-full border-t border-line px-4 py-2.5 text-left text-sm font-medium
                       text-carrot hover:bg-sand"
            onClick={async () => {
              setOpen(false);
              await signOut();
              navigate('/');
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
