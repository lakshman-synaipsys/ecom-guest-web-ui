import { useSyncExternalStore } from 'react';
import type { Availability, Cart, CartLine, CartShop, ShopOffer, UnitType, Variant } from './types';

/**
 * The basket of somebody who has not signed in.
 *
 * Browsing and filling a basket should not need an account - the wall goes up
 * at checkout, like any shopping app. The server's basket belongs to a user,
 * so until there is one the lines live in this browser, with enough about
 * each (name, shop, price) to draw the basket without asking anyone.
 *
 * Prices here are as of when the item was added. They are never charged:
 * signing in replays every line into the real basket (see replayInto) and from
 * then on the server's numbers are the only ones that count.
 */
const KEY = 'qc-guest-cart';
const EVENT = 'qc-guest-cart';

export interface GuestLine {
  offeringId: string;
  productId: string;
  name: string;
  variantLabel: string | null;
  unitLabel: string | null;
  unitType: UnitType;
  fractional: boolean;
  unitSize: number;
  imagePublicId: string | null;
  qty: number;
  pricePaise: number;
  availability: Availability;
  maxQtyPerOrder: number;
  availablePacks: number | null;
  requiresPrescription: boolean;
  shopId: string;
  shopName: string;
  shopSlug: string;
  shopImagePublicId: string | null;
  shopOpenNow: boolean;
}

/** What a product page knows when somebody taps Add. */
export interface GuestSnapshot {
  name: string;
  requiresPrescription: boolean;
  variant: Variant;
  offer: ShopOffer;
}

let cache: { raw: string | null; lines: GuestLine[] } = { raw: null, lines: [] };

export function readGuestLines(): GuestLine[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    /* private window: fall through to the in-memory copy */
    return cache.lines;
  }
  if (raw === cache.raw) return cache.lines;
  let lines: GuestLine[] = [];
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) lines = parsed as GuestLine[];
  } catch {
    lines = [];
  }
  cache = { raw, lines };
  return lines;
}

function write(lines: GuestLine[]) {
  const raw = JSON.stringify(lines);
  cache = { raw, lines };
  try {
    localStorage.setItem(KEY, raw);
  } catch {
    /* kept in memory for this tab */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function guestAdd(snapshot: GuestSnapshot, qty: number) {
  const { variant, offer } = snapshot;
  const lines = readGuestLines().filter((line) => line.offeringId !== offer.offeringId);
  if (qty > 0) {
    lines.push({
      offeringId: offer.offeringId,
      productId: variant.productId,
      name: snapshot.name,
      variantLabel: variant.label,
      unitLabel: variant.unitLabel,
      unitType: variant.unitType,
      fractional: variant.fractional,
      unitSize: variant.unitSize,
      imagePublicId: variant.imagePublicId,
      qty,
      pricePaise: offer.pricePaise,
      availability: offer.availability,
      maxQtyPerOrder: offer.maxQtyPerOrder,
      availablePacks: offer.availablePacks ?? null,
      requiresPrescription: snapshot.requiresPrescription,
      shopId: offer.shopId,
      shopName: offer.shopName,
      shopSlug: offer.shopSlug,
      shopImagePublicId: offer.shopImagePublicId,
      shopOpenNow: offer.shopOpenNow,
    });
  }
  write(lines);
}

export function guestSetQty(offeringId: string, qty: number) {
  const lines = readGuestLines();
  write(qty > 0
    ? lines.map((line) => (line.offeringId === offeringId ? { ...line, qty } : line))
    : lines.filter((line) => line.offeringId !== offeringId));
}

export function guestRemove(offeringId: string) {
  write(readGuestLines().filter((line) => line.offeringId !== offeringId));
}

export function guestClear() {
  write([]);
}

/**
 * Put every line into the signed-in shopper's real basket, then forget them.
 * A line the server will not take (gone, over the limit) is skipped rather
 * than blocking the rest - the basket they land on shows what actually went in.
 */
export async function replayInto(
  add: (offeringId: string, qty: number) => Promise<unknown>,
): Promise<string[]> {
  const lines = readGuestLines();
  const skipped: string[] = [];
  for (const line of lines) {
    try {
      await add(line.offeringId, line.qty);
    } catch {
      skipped.push(line.name);
    }
  }
  if (lines.length > 0) guestClear();
  return skipped;
}

/** Names of items that could not be carried into the basket at sign-in; read once. */
const SKIPPED_KEY = 'qc-guest-skipped';

export function rememberSkipped(names: string[]) {
  try {
    if (names.length > 0) sessionStorage.setItem(SKIPPED_KEY, JSON.stringify(names));
  } catch {
    /* the notice is a courtesy */
  }
}

export function takeSkipped(): string[] {
  try {
    const raw = sessionStorage.getItem(SKIPPED_KEY);
    sessionStorage.removeItem(SKIPPED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/* --------------------------------------------------------- as a Cart */

/** The same shape the server's basket has, so one page draws either. */
export function guestCartView(lines: GuestLine[]): Cart {
  const shops = new Map<string, CartShop>();
  let itemsPaise = 0;

  for (const line of lines) {
    // Price is per sale unit; qty is physical, so units = qty / unitSize.
    const units = line.qty / (line.unitSize || 1);
    const linePaise = Math.round(line.pricePaise * units);
    itemsPaise += linePaise;

    const cartLine: CartLine = {
      itemId: line.offeringId,
      offeringId: line.offeringId,
      productId: line.productId,
      name: line.name,
      localName: null,
      variantLabel: line.variantLabel,
      unitLabel: line.unitLabel,
      unitType: line.unitType,
      fractional: line.fractional,
      imagePublicId: line.imagePublicId,
      qty: line.qty,
      unitPricePaise: line.pricePaise,
      linePaise,
      availability: line.availability,
      maxQtyPerOrder: line.maxQtyPerOrder,
      requiresPrescription: line.requiresPrescription,
      unitSize: line.unitSize,
      availablePacks: line.availablePacks,
    };

    const shop = shops.get(line.shopId) ?? {
      shopId: line.shopId,
      shopName: line.shopName,
      shopSlug: line.shopSlug,
      shopImagePublicId: line.shopImagePublicId,
      openNow: line.shopOpenNow,
      subtotalPaise: 0,
      lines: [],
    };
    shop.lines.push(cartLine);
    shop.subtotalPaise += linePaise;
    shops.set(line.shopId, shop);
  }

  return {
    cartId: 'guest',
    shops: [...shops.values()],
    itemCount: lines.length,
    itemsPaise,
    deliveryFeePaise: 0,
    handlingFeePaise: 0,
    discountPaise: 0,
    totalPaise: itemsPaise,
    minOrderPaise: 0,
    meetsMinimum: true,
    freeDeliveryAbovePaise: null,
    awayFromFreeDeliveryPaise: 0,
    requiresPrescription: lines.some((line) => line.requiresPrescription),
    deliveryMode: 'INSTANT',
    scheduledFrom: null,
    scheduledTo: null,
    addressId: null,
    customerNote: null,
    promoCode: null,
    promo: null,
    promoRejection: null,
    offers: [],
    notices: [],
  };
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

export function useGuestLines(): GuestLine[] {
  return useSyncExternalStore(subscribe, readGuestLines, () => []);
}
