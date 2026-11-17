/**
 * Error translator: maps API error codes to user-friendly messages.
 */
import type { ApiError } from './types';

export function translateError(error: ApiError | string): string {
  if (typeof error === 'string') return error;

  const { code, message, details } = error;

  // Specific error code mappings
  switch (code) {
    case 'CONFLICT':
    case '409':
      return 'This item is no longer available - check back soon.';

    /*
     * These two carry the useful sentence from the server - which item,
     * and how many are left - so they are passed through rather than
     * flattened into a generic line. "Only 2 kg of apples left at Ganga
     * Market" tells a shopper what to do next; "out of stock" does not.
     */
    case 'OUT_OF_STOCK':
      return message || 'This item ran out while you were shopping.';

    case 'INSUFFICIENT_STOCK':
      return message || 'There is not that much left. Lower the quantity.';

    case 'VALIDATION_FAILED':
    case '400':
      if (details?.reason === 'address-not-serviceable') {
        return 'We do not deliver to that address. Pick another.';
      }
      if (details?.reason === 'slot-unavailable') {
        return 'That delivery slot is no longer available. Pick another.';
      }
      if (details?.reason === 'shop-closed') {
        return 'The shop closed before we can deliver. Try another shop.';
      }
      return message || 'Something was not right. Check and try again.';

    case 'TOKEN_INVALID':
    case '401':
      return 'Your session expired. Please sign in again.';

    case 'NOT_FOUND':
    case '404':
      return 'That was not found. It may have been removed.';

    case 'CART_ITEM_NOT_AVAILABLE':
      return 'One of your items is no longer available. Check your cart.';

    case 'MINIMUM_ORDER_NOT_MET':
      return 'Your order is below the minimum. Add more items.';

    case 'SHOP_UNAVAILABLE':
      return 'That shop is not taking orders right now.';

    default:
      return message || 'Something went wrong. Please try again.';
  }
}

export function isRetryable(error: ApiError | string): boolean {
  if (typeof error === 'string') return false;
  const { code } = error;
  return !['VALIDATION_FAILED', '400', 'NOT_FOUND', '404', 'TOKEN_INVALID', '401'].includes(code);
}
