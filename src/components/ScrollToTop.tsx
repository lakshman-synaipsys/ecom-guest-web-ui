import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Start every page at the top.
 *
 * A browser scrolls a new document to the top; a single-page app does not,
 * because as far as the browser is concerned nothing happened. So tapping
 * a product two thirds of the way down a category opens its page two
 * thirds of the way down - past the picture, past the price, somewhere in
 * the storage instructions - and the shopper has to scroll up to find out
 * what they just opened.
 *
 * Going *back* is left alone. The browser restores the old position
 * itself, and that is the right behaviour: somebody returning to a
 * category wants the row they were looking at, not the top of a grid they
 * have already scrolled through once.
 *
 * Keyed on the path alone, not the query string - the search page rewrites
 * `?q=` on every keystroke, and yanking the results to the top mid-word
 * would be worse than the problem this fixes.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (navigationType === 'POP') return;
    // The two-argument form on purpose: it is instant everywhere and needs
    // no opinion from the DOM lib about whether "instant" is a word.
    window.scrollTo(0, 0);
  }, [pathname, navigationType]);

  return null;
}
