import type { StoreConfig } from './types';

/**
 * Images.
 *
 * The API sends a Cloudinary public_id and nothing else - never a URL. The
 * URL is built here, at the moment of rendering, by whoever knows how big
 * the box actually is. That is the only place with enough information to
 * get it right, and it is why a design change never needs a re-upload.
 *
 * What goes into every URL:
 *   f_auto     AVIF where the browser takes it, WebP next, JPEG last.
 *   q_auto     Cloudinary analyses this specific image and picks the
 *              lowest quality that is visually identical. A flat packet
 *              label survives far more compression than a photo of
 *              vegetables; one fixed number has to be safe for both, so it
 *              is wasteful for one of them.
 *   dpr_auto   A retina phone gets 2x pixels; a cheap Android does not pay
 *              for them.
 *   c_fill,g_auto,w_,h_   Crop to the box we are actually drawing, centred
 *              on whatever the picture is about rather than its geometric
 *              middle. Sending a 2000px master into a 160px tile is the
 *              single biggest waste on a product grid.
 *
 * Together that is usually an order of magnitude off the bytes with no
 * visible difference - which is what "compress without losing quality"
 * means in practice.
 */

let config: StoreConfig | null = null;

export function setMediaConfig(next: StoreConfig | null): void {
  config = next;
}

export function imagesEnabled(): boolean {
  return !!config?.imagesEnabled && !!config.cloudName;
}

function build(publicId: string, transform: string): string {
  return `https://res.cloudinary.com/${config!.cloudName}/image/upload/`
       + `f_auto,q_auto,dpr_auto,${transform}/${publicId}`;
}

/** A square crop: product tiles, category chips, shop avatars. */
export function square(publicId: string | null | undefined, size: number): string | null {
  if (!publicId || !imagesEnabled()) return null;
  return build(publicId, `c_fill,g_auto,w_${size},h_${size}`);
}

/** A wide crop for banners and shop covers. */
export function wide(publicId: string | null | undefined, width: number, ratio = 16 / 9): string | null {
  if (!publicId || !imagesEnabled()) return null;
  return build(publicId, `c_fill,g_auto,w_${width},h_${Math.round(width / ratio)}`);
}

/**
 * A ~300-byte blurred thumbnail to paint underneath while the real one
 * loads. Cheap enough to be worth it on every tile, and it stops a grid
 * flashing empty rectangles on a slow connection.
 */
export function blurUp(publicId: string | null | undefined): string | null {
  if (!publicId || !imagesEnabled()) return null;
  return build(publicId, 'c_fill,w_24,h_24,e_blur:400,q_30');
}

/* ====================================================================
 * Placeholders
 * ==================================================================== */

/**
 * What we draw when there is no photograph - which, on day one, is
 * everything.
 *
 * Not a grey box and not a broken-image icon. A deterministic wash of two
 * warm colours picked from the item's own name, with its initials on top.
 * The same tomato is the same colour on every screen and every reload, so
 * a grid of them reads as a designed thing rather than as missing data,
 * and the shop stays usable while the photographs are still being taken.
 */
const PALETTE: [string, string][] = [
  ['#DFF0E4', '#B6DCC4'],   // leaf
  ['#FDE9DC', '#F6C9A9'],   // apricot
  ['#FBE6EC', '#EFBACB'],   // berry
  ['#FCF2D9', '#EEDCA4'],   // wheat
  ['#E4EEF7', '#BBD3E8'],   // sky
  ['#EFE7F7', '#CFBEE6'],   // plum
  ['#E7F2F1', '#B7D9D5'],   // sage
  ['#FAEBE2', '#E9C4B2'],   // clay
];

function hash(text: string): number {
  let value = 0;
  for (let i = 0; i < text.length; i++) {
    value = (value * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(value);
}

export function placeholderColours(seed: string): [string, string] {
  return PALETTE[hash(seed) % PALETTE.length];
}

/** "Toor Dal 1kg" -> "TD"; "Tomato" -> "T". Never more than two letters. */
export function initials(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((word) => word && !/^\d/.test(word));

  if (words.length === 0) return name.slice(0, 1).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
