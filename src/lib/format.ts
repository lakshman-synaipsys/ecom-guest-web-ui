/**
 * Money crosses the wire as an integer number of paise and stays that way
 * until the moment it is drawn. No arithmetic on a formatted string, and no
 * float ever holds a price.
 */
export function money(paise: number | null | undefined, opts?: { sign?: boolean }): string {
  if (paise === null || paise === undefined) return '--';
  const rupees = paise / 100;
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: Number.isInteger(rupees) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(rupees));
  if (!opts?.sign) return rupees < 0 ? `-${formatted}` : formatted;
  return `${paise > 0 ? '+' : paise < 0 ? '-' : ''}${formatted}`;
}

/** How much off, as a whole percent. Only shown when it is worth showing. */
export function discountPct(price: number, mrp: number | null | undefined): number | null {
  if (!mrp || mrp <= price) return null;
  const pct = Math.round(((mrp - price) / mrp) * 100);
  return pct >= 3 ? pct : null;
}

export function qty(value: number, unitType: string): string {
  const n = Number.isInteger(value) ? String(value) : String(value).replace(/\.?0+$/, '');
  switch (unitType) {
    case 'KG':    return `${n} kg`;
    case 'GRAM':  return `${n} g`;
    case 'LITRE': return `${n} L`;
    case 'ML':    return `${n} ml`;
    case 'DOZEN': return `${n} dozen`;
    case 'BUNCH': return `${n} bunch`;
    default:      return `${n}`;
  }
}

/**
 * The step a quantity moves by when someone taps + or -.
 *
 * One sale unit, whatever that has been set to: a 100 g packet steps by
 * 100 g and costs one packet each time. Listings that never said what one
 * of them was - unitSize 1, which is nearly all of them - keep exactly the
 * steps they have always had, so nothing in the existing catalog moves.
 */
export function stepFor(unitType: string, unitSize?: number | null): number {
  if (unitSize != null && unitSize > 0 && unitSize !== 1) return unitSize;

  switch (unitType) {
    case 'KG':    return 0.5;
    case 'LITRE': return 0.5;
    case 'GRAM':  return 100;
    case 'ML':    return 100;
    default:      return 1;
  }
}

/**
 * What one of something is: "100 g", "1 kg", "each". The thing a price is
 * the price of, said the way a shopper would say it.
 */
export function packLabel(unitType: string, unitSize?: number | null): string {
  const size = unitSize == null || unitSize <= 0 ? 1 : unitSize;
  const n = String(size);

  switch (unitType) {
    case 'KG':    return `${n} kg`;
    case 'GRAM':  return `${n} g`;
    case 'LITRE': return `${n} L`;
    case 'ML':    return `${n} ml`;
    case 'DOZEN': return size === 1 ? 'a dozen' : `${n} dozen`;
    case 'BUNCH': return size === 1 ? 'a bunch' : `${n} bunches`;
    case 'PACK':  return size === 1 ? 'a pack' : `${n} packs`;
    default:      return size === 1 ? 'each' : `${n} pieces`;
  }
}

/**
 * The ceiling on a quantity control, in physical units.
 *
 * Two limits, and the lower one wins: what one order may take, and what is
 * actually left. Both are counted in sale units, so both are multiplied
 * back out to the quantity the stepper works in. An uncounted listing has
 * no stock ceiling at all - and `null` there must never be read as zero.
 */
export function maxQtyFor(
  maxQtyPerOrder: number,
  availablePacks: number | null | undefined,
  unitSize: number | null | undefined,
): number {
  const size = unitSize == null || unitSize <= 0 ? 1 : unitSize;
  const packs = availablePacks == null
    ? maxQtyPerOrder
    : Math.min(maxQtyPerOrder, availablePacks);
  return packs * size;
}

export function ago(iso: string | null | undefined): string {
  if (!iso) return '';
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

/** "in about 40 minutes" - the phrasing people actually use. */
export function untilText(iso: string | null | undefined): string {
  if (!iso) return '';
  const minutes = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  if (minutes <= 0) return 'any moment now';
  if (minutes < 90) return `in about ${minutes} minutes`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `in about ${hours} hours`;
  return `on ${clockDate(iso)}`;
}

export function clockTime(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

export function clockDate(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

/** "+91 98765 43210" from "+919876543210". */
export function phone(e164: string | null | undefined): string {
  if (!e164) return '';
  const digits = e164.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  return e164;
}

/** When an order is expected, said the way a person would say it. */
export function whenText(order: {
  deliveryMode: string;
  promisedBy: string | null;
  scheduledFrom: string | null;
  scheduledTo: string | null;
}): string {
  if (order.deliveryMode === 'SCHEDULED' && order.scheduledFrom && order.scheduledTo) {
    const day = new Date(order.scheduledFrom);
    const today = new Date();
    const sameDay = day.toDateString() === today.toDateString();
    const tomorrow = new Date(today.getTime() + 86400000).toDateString() === day.toDateString();
    const dayText = sameDay ? 'today' : tomorrow ? 'tomorrow' : clockDate(order.scheduledFrom);
    return `${dayText}, ${clockTime(order.scheduledFrom)} - ${clockTime(order.scheduledTo)}`;
  }
  return untilText(order.promisedBy);
}
