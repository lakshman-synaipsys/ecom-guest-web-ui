// Mirrors storefront-api's DTOs. Hand-written rather than generated so it
// stays readable; if it drifts, /swagger-ui.html on :8081 is the truth.

export type UnitType = 'PIECE' | 'KG' | 'GRAM' | 'LITRE' | 'ML' | 'PACK' | 'BUNCH' | 'DOZEN';
export type Availability = 'IN_STOCK' | 'LOW' | 'OUT' | 'UNKNOWN';
export type Role = 'CUSTOMER' | 'RIDER' | 'OPS' | 'ADMIN';

export type OrderStatus =
  | 'PLACED' | 'CONFIRMED' | 'SOURCING' | 'AWAITING_CUSTOMER_APPROVAL'
  | 'PACKED' | 'OUT_FOR_DELIVERY' | 'DELIVERED'
  | 'CANCELLED' | 'DELIVERY_FAILED' | 'RETURNED';

export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: string;
  phone: string;
  displayName: string;
  roles: Role[];
  /** True until the shopper has told us their name once. */
  needsName?: boolean;
}

/** The signed-in shopper as the server sees them right now. */
export interface Profile {
  userId: string;
  phone: string;
  displayName: string;
  roles: Role[];
  needsName: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  fieldErrors?: { field: string; message: string }[];
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
}

/* ---------------------------------------------------------------- zone */

export interface Zone {
  id: string;
  name: string;
  centreLat: number;
  centreLng: number;
  radiusMetres: number;
  deliveryFeePaise: number;
  freeDeliveryAbovePaise: number | null;
  minOrderPaise: number;
  promisedEtaMinutes: number;
  opensAt: string | null;
  closesAt: string | null;
  openNow: boolean;
  closedReason: string | null;
}


export type SupportTicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'RESOLVED' | 'CLOSED';

export interface SupportMessage {
  id: string;
  senderRole: 'CUSTOMER' | 'OPS' | 'ADMIN';
  message: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  orderId: string;
  orderNumber: string;
  status: SupportTicketStatus;
  customerName: string | null;
  customerPhone: string | null;
  createdAt: string;
  updatedAt: string;
  messages: SupportMessage[];
}

export interface ReviewCard {
  id: string;
  productId: string;
  shopId: string;
  rating: number;
  reviewText: string | null;
  imagePublicIds: string[];
  createdAt: string;
  customerName: string;
  productName: string;
  shopName: string;
}

export interface OrderProductReview {
  lineId: string;
  rating: number;
  reviewText: string | null;
  imagePublicIds: string[];
}

export interface ReviewFeed {
  averageRating: number;
  reviewCount: number;
  reviews: ReviewCard[];
}

export interface ReviewUploadSignature {
  uploadUrl: string;
  cloudName: string;
  folder: string;
  timestamp: number;
  expiresAt: number;
  paramsToSend: Record<string, string>;
}

export interface StoreConfig {
  imagesEnabled: boolean;
  cloudName: string;
  zone: Zone;
  supportPhone: string | null;
  supportWhatsapp: string | null;
}

export interface Servicability {
  served: boolean;
  zone: Zone;
  distanceKm: number | null;
  message: string;
}

/* -------------------------------------------------------------- browse */

export interface Tile {
  kind: 'GROUP' | 'PRODUCT';
  id: string;
  slug: string;
  name: string;
  localName: string | null;
  brand: string | null;
  imagePublicId: string | null;
  categoryId: string | null;
  categoryName: string | null;
  unitLabel: string | null;
  fromPricePaise: number;
  mrpPaise: number | null;
  variantCount: number;
  shopCount: number;
  availability: Availability;
  requiresPrescription: boolean;
}

export interface ShopOffer {
  offeringId: string;
  shopId: string;
  shopName: string;
  shopSlug: string;
  shopImagePublicId: string | null;
  shopOpenNow: boolean;
  pricePaise: number;
  mrpPaise: number | null;
  availability: Availability;
  /** How many sale units one order may take from this shop. */
  maxQtyPerOrder: number;
  /**
   * How many are left here, less what every open basket is holding -
   * including this shopper's own, so add back what is already in their
   * cart before using it as a ceiling.
   *
   * Null (or absent; the API omits nulls) means this listing is not
   * counted, which is NOT "none left". Always test `!= null`.
   */
  availablePacks: number | null;
}

export interface Spec {
  label: string;
  value: string;
}

export interface Variant {
  productId: string;
  slug: string;
  label: string;
  unitLabel: string | null;
  unitType: UnitType;
  /**
   * How much one of these is, in unitType. Every price on the offers
   * below is the price of exactly this much, and the quantity control
   * steps by it - so a 100 g packet goes 100 g, 200 g, 300 g.
   */
  unitSize: number;
  /** A part of one makes sense (0.5 kg), so the quantity may be fractional. */
  fractional: boolean;
  fromPricePaise: number;
  mrpPaise: number | null;
  imagePublicId: string | null;
  highlights: string[];
  specs: Spec[];
  isVeg: boolean | null;
  offers: ShopOffer[];
}

export interface ProductDetail {
  kind: 'GROUP' | 'PRODUCT';
  id: string;
  slug: string;
  name: string;
  localName: string | null;
  description: string | null;
  brand: string | null;
  imagePublicId: string | null;
  categoryId: string | null;
  categoryName: string | null;
  requiresPrescription: boolean;
  highlights: string[];
  gallery: string[];
  variants: Variant[];
}

export interface ShopCard {
  id: string;
  slug: string;
  name: string;
  shopType: string;
  imagePublicId: string | null;
  coverPublicId: string | null;
  addressText: string | null;
  landmark: string | null;
  opensAt: string | null;
  closesAt: string | null;
  openNow: boolean;
  distanceKm: number | null;
  itemCount: number;
  fssaiLicence: string | null;
  gstNumber: string | null;
  sells: string[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  imagePublicId: string | null;
  accentHex: string | null;
  productCount: number;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  imagePublicId: string | null;
  linkType: 'NONE' | 'SHOP' | 'CATEGORY' | 'PRODUCT_GROUP' | 'URL';
  linkValue: string | null;
  accentHex: string | null;
  placement: 'HERO' | 'WIDE' | 'STRIP';
}

/** One row in the search-as-you-type list: a product, a size group or a shop. */
export interface Suggestion {
  kind: 'PRODUCT' | 'GROUP' | 'SHOP';
  id: string;
  slug: string;
  name: string;
  sub: string | null;
  imagePublicId: string | null;
  fromPricePaise: number | null;
  availability: Availability | null;
}

/** An offer, as shown on the home page and in the basket. */
export interface Offer {
  id: string;
  code: string | null;
  title: string;
  description: string | null;
  label: string;
  kind: 'PERCENT' | 'FLAT' | 'FREE_DELIVERY';
  automatic: boolean;
  usable: boolean;
  whyNot: string | null;
  minOrderPaise: number;
  accentHex: string | null;
  /** What the offer is limited to, in words ("Fruits & Vegetables"); null = whole basket. */
  appliesTo: string | null;
}

export interface AppliedPromo {
  id: string;
  code: string | null;
  title: string;
  label: string;
  kind: 'PERCENT' | 'FLAT' | 'FREE_DELIVERY';
  discountPaise: number;
  freeDelivery: boolean;
  automatic: boolean;
  accentHex: string | null;
  /** What the discount was worked out on. */
  eligiblePaise: number;
  appliesTo: string | null;
}

/**
 * One block of the home page, with its own contents.
 *
 * A list rather than fixed fields because the running order is the
 * admin's to set, and the same kind can appear twice - a banner strip
 * near the top and another further down is a normal layout. Only the
 * list belonging to this section's kind is present; the API omits the
 * rest.
 */
export interface HomeSection {
  kind: 'HEADLINE' | 'BANNERS' | 'OFFERS' | 'CATEGORIES' | 'SHOPS'
      | 'FEATURED_SHOP' | 'TRENDING';
  /** The heading to draw, or null for this section's own default wording. */
  title: string | null;
  subtitle: string | null;
  banners?: Banner[];
  categories?: Category[];
  shops?: ShopCard[];
  featured?: { shop: ShopCard; pitch: string; items: Tile[] } | null;
  tiles?: Tile[];
  offers?: Offer[];
}

export interface HomeFeed {
  zone: Zone;
  /** Top to bottom, exactly as the console has it. */
  sections: HomeSection[];
  generatedAt: string;
}

export interface ShopPage {
  shop: ShopCard;
  categories: Category[];
  items: Tile[];
}

/* ---------------------------------------------------------------- cart */

export interface CartLine {
  itemId: string;
  offeringId: string;
  productId: string;
  name: string;
  localName: string | null;
  variantLabel: string | null;
  unitLabel: string | null;
  unitType: UnitType;
  /** A part of one makes sense (0.5 kg), so the quantity may be fractional. */
  fractional: boolean;
  imagePublicId: string | null;
  qty: number;
  unitPricePaise: number;
  linePaise: number;
  availability: Availability;
  maxQtyPerOrder: number;
  requiresPrescription: boolean;
  /** How much one of these is; the quantity control steps by it. */
  unitSize: number;
  /**
   * How many more sale units this shopper could take. Their own hold is
   * already excluded, so this is a ceiling as it stands. Null means the
   * listing is not counted.
   */
  availablePacks: number | null;
}

export interface CartShop {
  shopId: string;
  shopName: string;
  shopSlug: string;
  shopImagePublicId: string | null;
  openNow: boolean;
  subtotalPaise: number;
  lines: CartLine[];
}

export interface Cart {
  cartId: string;
  shops: CartShop[];
  itemCount: number;
  itemsPaise: number;
  deliveryFeePaise: number;
  handlingFeePaise: number;
  discountPaise: number;
  totalPaise: number;
  minOrderPaise: number;
  meetsMinimum: boolean;
  freeDeliveryAbovePaise: number | null;
  awayFromFreeDeliveryPaise: number;
  requiresPrescription: boolean;
  deliveryMode: 'INSTANT' | 'SCHEDULED';
  scheduledFrom: string | null;
  scheduledTo: string | null;
  addressId: string | null;
  customerNote: string | null;
  promoCode: string | null;
  promo: AppliedPromo | null;
  promoRejection: string | null;
  offers: Offer[];
  notices: string[];
}

/* ------------------------------------------------------------ addresses */

export interface Address {
  id: string;
  label: string;
  contactName: string | null;
  contactPhone: string | null;
  altPhone: string | null;
  line1: string;
  line2: string | null;
  landmark: string | null;
  area: string | null;
  city: string | null;
  pincode: string | null;
  lat: number;
  lng: number;
  isDefault: boolean;
  oneLine: string;
  servicable: boolean;
  distanceKm: number | null;
}

export interface AddressInput {
  label?: string;
  contactName?: string | null;
  contactPhone?: string | null;
  altPhone?: string | null;
  line1?: string;
  line2?: string | null;
  landmark?: string | null;
  area?: string | null;
  city?: string | null;
  pincode?: string | null;
  lat?: number | null;
  lng?: number | null;
}

/* ------------------------------------------------------------- checkout */

export interface Slot {
  from: string;
  to: string;
  label: string;
}

export interface SlotDay {
  date: string;
  label: string;
  slots: Slot[];
}

export interface DeliveryOptions {
  instantAvailable: boolean;
  instantEtaMinutes: number;
  instantNote: string;
  days: SlotDay[];
}

export interface CheckoutReview {
  cart: Cart;
  addresses: Address[];
  delivery: DeliveryOptions;
  paymentModes: string[];
  paymentNote: string | null;
  canPlace: boolean;
  blockers: string[];
}

export interface Placed {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  totalPaise: number;
  paymentMode: string;
  deliveryMode: 'INSTANT' | 'SCHEDULED';
  promisedBy: string | null;
  scheduledFrom: string | null;
  scheduledTo: string | null;
  shopCount: number;
  itemCount: number;
}

/* --------------------------------------------------------------- orders */

export interface OrderCard {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  deliveryMode: 'INSTANT' | 'SCHEDULED';
  placedAt: string;
  promisedBy: string | null;
  scheduledFrom: string | null;
  scheduledTo: string | null;
  deliveredAt: string | null;
  payablePaise: number;
  finalised: boolean;
  paymentMode: string;
  itemCount: number;
  shopCount: number;
  shopNames: string | null;
}

export interface OrderItem {
  lineId: string;
  name: string;
  unitLabel: string | null;
  unitType: UnitType;
  imagePublicId: string | null;
  orderedQty: number;
  fulfilledQty: number | null;
  unitPricePaise: number;
  finalUnitPricePaise: number | null;
  lineEstimatePaise: number;
  lineFinalPaise: number | null;
  status: string;
  note: string | null;
}

export interface OrderBundle {
  lotId: string;
  status: string;
  shopId: string;
  shopName: string;
  shopSlug: string;
  shopImagePublicId: string | null;
  items: OrderItem[];
}

export interface OrderStep {
  key: string;
  label: string;
  state: string | null;
  at: string | null;
}

export interface OrderDetail {
  order: OrderCard;
  money: {
    itemsEstimatePaise: number;
    itemsFinalPaise: number | null;
    deliveryFeePaise: number;
    handlingFeePaise: number;
    discountPaise: number;
    totalEstimatePaise: number;
    totalFinalPaise: number | null;
    paymentStatus: string;
  };
  delivery: {
    contactName: string | null;
    contactPhone: string | null;
    addressLine: string;
    landmark: string | null;
    lat: number;
    lng: number;
    customerNote: string | null;
    cancelReason: string | null;
  };
  bundles: OrderBundle[];
  history: OrderStep[];
  rider: {
    taskStatus: string;
    name: string | null;
    vehicleType: string | null;
    lat: number | null;
    lng: number | null;
    locationUpdatedAt: string | null;
  } | null;
  canCancel: boolean;
  tracker: OrderStep[];
}
