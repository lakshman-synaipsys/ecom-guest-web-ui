import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { money } from '@/lib/format';
import { useSuggest } from '@/lib/queries';
import { Art, Chip } from './ui';
import { Spinner } from './Loaders';
import type { Suggestion } from '@/lib/types';

/**
 * Search that answers while you type.
 *
 * Three things make this feel right rather than merely present:
 *
 *   1. **Debounced, not throttled.** 180ms after the last keystroke, so a
 *      person typing "tomato" makes one request, not six. Fast enough that
 *      nobody notices the wait; slow enough that nobody notices the load.
 *   2. **The list never blinks.** The previous results stay on screen while
 *      the next ones load, so the dropdown does not flash empty between
 *      letters - which is the single thing that makes suggestions feel
 *      broken.
 *   3. **Shops and products together.** Somebody typing "tul" is as likely
 *      to want the Tulasi flower stall as tulsi leaves. Making them pick a
 *      tab first is making them guess what we filed it under.
 *
 * Arrow keys and Enter work, because on a desktop that is how people use a
 * box like this and nothing about it should require a mouse.
 */
export function SearchBox({
  placeholder = 'Search for rice, tomatoes, flowers...',
  autoFocus,
  className,
}: {
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(-1);
  const box = useRef<HTMLDivElement>(null);

  const suggestions = useSuggest(debounced);
  const rows = suggestions.data ?? [];

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term), 180);
    return () => clearTimeout(timer);
  }, [term]);

  /*
   * This box also lives in the header, so it is mounted the whole time
   * somebody is on the search results page. Its own state does not know
   * about the page's own search field - without this, editing the query
   * down there left this box frozen on whatever was typed to get here,
   * disagreeing with the results on screen.
   */
  useEffect(() => {
    if (location.pathname !== '/search') return;
    setTerm(params.get('q') ?? '');
  }, [location.pathname, params]);

  // Clicking anywhere else closes it, which is what people expect and
  // what a plain onBlur gets wrong when the click lands on a suggestion.
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function go(row: Suggestion) {
    setOpen(false);
    setTerm('');
    navigate(row.kind === 'SHOP' ? `/shops/${row.slug}` : `/item/${row.kind}/${row.slug}`);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (!open || rows.length === 0) {
      if (event.key === 'Enter' && term.trim().length >= 2) {
        setOpen(false);
        navigate(`/search?q=${encodeURIComponent(term.trim())}`);
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor((current) => Math.min(rows.length - 1, current + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor((current) => Math.max(-1, current - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (cursor >= 0) go(rows[cursor]);
      else if (term.trim().length >= 2) {
        setOpen(false);
        navigate(`/search?q=${encodeURIComponent(term.trim())}`);
      }
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={box} className={clsx('relative', className)}>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
              aria-hidden>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
        </span>

        <input
          className="input py-2.5 pl-10 pr-9"
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={term}
          onChange={(event) => {
            setTerm(event.target.value);
            setCursor(-1);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          aria-autocomplete="list"
          aria-expanded={open}
        />

        {term && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
            onClick={() => { setTerm(''); setCursor(-1); }}
            aria-label="Clear"
          >
            &times;
          </button>
        )}
      </div>

      {open && term.trim().length >= 2 && (
        <div className="absolute inset-x-0 top-[calc(100%+0.4rem)] z-50 overflow-hidden
                        rounded-card border border-line bg-surface shadow-lift animate-fade-up">
          {rows.length === 0 ? (
            <div className="flex items-center gap-2.5 px-4 py-4 text-sm text-ink-muted">
              {suggestions.isFetching
                ? <><Spinner size={16} /> Looking...</>
                : <>Nothing matches &ldquo;{term.trim()}&rdquo; yet.</>}
            </div>
          ) : (
            <>
              <ul className="max-h-[22rem] overflow-y-auto">
                {rows.map((row, index) => (
                  <li key={`${row.kind}-${row.id}`}>
                    <button
                      onMouseEnter={() => setCursor(index)}
                      onClick={() => go(row)}
                      className={clsx(
                        'flex w-full items-center gap-3 px-3 py-2.5 text-left',
                        cursor === index ? 'bg-sand' : 'hover:bg-sand/60',
                      )}
                    >
                      <span className="h-9 w-9 shrink-0">
                        <Art
                          publicId={row.imagePublicId}
                          name={row.name}
                          size={96}
                          rounded={row.kind === 'SHOP' ? 'rounded-full' : 'rounded-lg'}
                        />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-medium">{row.name}</span>
                          {row.kind === 'SHOP' && <Chip>Shop</Chip>}
                          {row.availability === 'OUT' && <Chip tone="carrot">Out</Chip>}
                        </span>
                        {row.sub && (
                          <span className="block truncate text-2xs text-ink-muted">{row.sub}</span>
                        )}
                      </span>

                      {row.fromPricePaise !== null && (
                        <span className="shrink-0 text-sm font-semibold tabular">
                          {money(row.fromPricePaise)}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>

              <button
                className="block w-full border-t border-line px-4 py-2.5 text-left text-xs
                           font-semibold text-leaf hover:bg-sand"
                onClick={() => {
                  setOpen(false);
                  navigate(`/search?q=${encodeURIComponent(term.trim())}`);
                }}
              >
                See everything for &ldquo;{term.trim()}&rdquo;
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
