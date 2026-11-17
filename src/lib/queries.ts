import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { del, get, post, put } from './api';
import { useAuth } from './auth';
import {
  guestAdd, guestClear, guestCartView, guestRemove, guestSetQty, useGuestLines,
} from './guestCart';
import type { GuestSnapshot } from './guestCart';
import type {
  Address, AddressInput, Cart, Category, CheckoutReview, DeliveryOptions, HomeFeed,
  Offer, OrderCard, OrderDetail, OrderProductReview, Page, Placed, ProductDetail, Profile, ReviewFeed, ReviewUploadSignature, Servicability, ShopCard,
  ShopPage, StoreConfig, Suggestion, Tile,
} from './types';

/* --------------------------------------------------------------- public */

/**
 * Config is fetched once and kept: the cloud name and the delivery area's
 * hours do not change while somebody is shopping, and every image on the
 * page waits on it.
 */
export const useStoreConfig = () =>
  useQuery({
    queryKey: ['config'],
    queryFn: () => get<StoreConfig>('/config'),
    staleTime: Infinity,
    gcTime: Infinity,
  });

export const useHome = (coords: { lat: number; lng: number } | null) =>
  useQuery({
    queryKey: ['home', coords?.lat ?? null, coords?.lng ?? null],
    queryFn: () => {
      const search = new URLSearchParams();
      if (coords) {
        search.set('lat', String(coords.lat));
        search.set('lng', String(coords.lng));
      }
      const query = search.toString();
      return get<HomeFeed>(`/browse/home${query ? `?${query}` : ''}`);
    },
    staleTime: 60_000,
  });

export const useCategories = () =>
  useQuery({
    queryKey: ['categories'],
    queryFn: () => get<Category[]>('/browse/categories'),
    staleTime: 5 * 60_000,
  });

export const useCategoryItems = (slug: string) =>
  useQuery({
    queryKey: ['category', slug],
    queryFn: () => get<Tile[]>(`/browse/categories/${slug}?limit=120`),
    enabled: !!slug,
  });

export const useShops = (coords: { lat: number; lng: number } | null) =>
  useQuery({
    queryKey: ['shops', coords?.lat ?? null],
    queryFn: () => {
      const search = new URLSearchParams();
      if (coords) {
        search.set('lat', String(coords.lat));
        search.set('lng', String(coords.lng));
      }
      const query = search.toString();
      return get<ShopCard[]>(`/browse/shops${query ? `?${query}` : ''}`);
    },
  });

export const useShop = (
  slug: string,
  coords: { lat: number; lng: number } | null
) =>
  useQuery({
    queryKey: ['shop', slug, coords?.lat ?? null, coords?.lng ?? null],
    queryFn: () => {
      const search = new URLSearchParams();

      if (coords) {
        search.set('lat', String(coords.lat));
        search.set('lng', String(coords.lng));
      }

      const query = search.toString();

      return get<ShopPage>(
        `/browse/shops/${slug}${query ? `?${query}` : ''}`
      );
    },
    enabled: !!slug,
  });
  
export const useProductReviews = (productId: string | null | undefined, shopId: string | null | undefined) =>
  useQuery({
    queryKey: ['product-reviews', productId, shopId],
    queryFn: () => get<ReviewFeed>(`/reviews/products/${productId}?shopId=${shopId}`),
    enabled: !!productId && !!shopId,
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

export const useShopReviews = (shopId: string | null | undefined) =>
  useQuery({
    queryKey: ['shop-reviews', shopId],
    queryFn: () => get<ReviewFeed>(`/reviews/shops/${shopId}`),
    enabled: !!shopId,
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

export const useOrderProductReviews = (orderId: string, enabled: boolean) =>
  useQuery({
    queryKey: ['order-product-reviews', orderId],
    queryFn: () => get<OrderProductReview[]>(`/orders/${orderId}/reviews`),
    enabled: !!orderId && enabled,
    staleTime: 0,
  });

export const useReviewedLines = (orderId: string, enabled: boolean) =>
  useQuery({
    queryKey: ['reviewed-lines', orderId],
    queryFn: () => get<string[]>(`/orders/${orderId}/reviewed-lines`),
    enabled: !!orderId && enabled,
    staleTime: 0,
  });

export const useSubmitProductReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { orderId: string; lineId: string; rating: number; reviewText?: string; imagePublicIds: string[] }) =>
      post(`/orders/${vars.orderId}/items/${vars.lineId}/review`, {
        rating: vars.rating,
        reviewText: vars.reviewText,
        imagePublicIds: vars.imagePublicIds,
      }),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['reviewed-lines', vars.orderId] });
      void queryClient.invalidateQueries({ queryKey: ['order-product-reviews', vars.orderId] });
      void queryClient.invalidateQueries({ queryKey: ['product-reviews'] });
      void queryClient.invalidateQueries({ queryKey: ['shop-reviews'] });
    },
  });
};

export async function uploadReviewPhoto(orderId: string, lineId: string, file: File): Promise<string> {
  const signature = await post<ReviewUploadSignature>(
    `/orders/${orderId}/items/${lineId}/review-upload-signature`, {},
  );
  const form = new FormData();
  form.append('file', file);
  Object.entries(signature.paramsToSend).forEach(([key, value]) => form.append(key, value));
  const response = await fetch(signature.uploadUrl, { method: 'POST', body: form });
  const result = await response.json() as { public_id?: string; error?: { message?: string } };
  if (!response.ok || !result.public_id) {
    throw new Error(result.error?.message ?? 'Photo upload failed. Please try again.');
  }
  return result.public_id;
}

export const useItem = (kind: string | null, slug: string | null) =>
  useQuery({
    queryKey: ['item', kind, slug],
    queryFn: () => get<ProductDetail>(`/browse/item/${kind}/${slug}`),
    enabled: !!kind && !!slug,
  });

export const useSearch = (term: string) =>
  useQuery({
    queryKey: ['search', term],
    queryFn: () => get<Tile[]>(`/browse/search?q=${encodeURIComponent(term)}`),
    enabled: term.trim().length >= 2,
    placeholderData: (previous) => previous,
  });

/**
 * Search as you type. Debounced by the caller, kept for a minute, and
 * `placeholderData` holds the previous list on screen while the next one
 * loads so the dropdown never blinks empty between keystrokes.
 */
export const useSuggest = (term: string) =>
  useQuery({
    queryKey: ['suggest', term],
    queryFn: () => get<Suggestion[]>(`/browse/suggest?q=${encodeURIComponent(term)}`),
    enabled: term.trim().length >= 2,
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  });

export const useOffers = () =>
  useQuery({
    queryKey: ['offers'],
    queryFn: () => get<Offer[]>('/browse/offers'),
    staleTime: 5 * 60_000,
  });

export const useServicable = (coords: { lat: number; lng: number } | null) =>
  useQuery({
    queryKey: ['servicable', coords?.lat ?? null, coords?.lng ?? null],
    queryFn: () => get<Servicability>(`/browse/servicable?lat=${coords!.lat}&lng=${coords!.lng}`),
    enabled: !!coords,
    staleTime: 10 * 60_000,
  });

/* ----------------------------------------------------------------- cart */

/**
 * Every cart mutation answers with the whole cart, so the header count,
 * the totals and the lines can never disagree. That is why they all write
 * straight into the cache instead of invalidating and refetching.
 */
function useCartMutation<TVars>(fn: (vars: TVars) => Promise<Cart>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (cart) => {
      // A guest's result is a placeholder; the real basket is not theirs yet.
      if (cart.cartId !== 'guest') queryClient.setQueryData(['cart'], cart);
      void queryClient.invalidateQueries({ queryKey: ['checkout'] });
    },
  });
}

/**
 * Who the shopper is, from the server - not from the token, which is only
 * as fresh as the last sign-in. The header reads this, so a name changed
 * anywhere shows up everywhere.
 */
export const useMe = () => {
  const { signedIn } = useAuth();
  return useQuery({
    queryKey: ['me'],
    queryFn: () => get<Profile>('/auth/me'),
    enabled: signedIn,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
};

export const useRename = () => {
  const queryClient = useQueryClient();
  const { updateSession } = useAuth();
  return useMutation({
    mutationFn: (name: string) => put<Profile>('/auth/me', { name }),
    onSuccess: (profile) => {
      queryClient.setQueryData(['me'], profile);
      updateSession({ displayName: profile.displayName, needsName: profile.needsName });
    },
  });
};

/**
 * The basket: the server's when signed in, the one kept in this browser
 * when not (see guestCart.ts). Both have the same shape, so the pages do not
 * care which they are drawing.
 */
export const useCart = () => {
  const { signedIn } = useAuth();
  const guestLines = useGuestLines();
  const server = useQuery({
    queryKey: ['cart'],
    queryFn: () => get<Cart>('/cart'),
    enabled: signedIn,
    staleTime: 15_000,
  });
  // Built once per change to the lines, not once per render: callers put the
  // cart in effect dependencies, and a new object every render would loop them.
  const guestCart = useMemo(() => guestCartView(guestLines), [guestLines]);
  if (signedIn) return server;
  return { ...server, data: guestCart, isLoading: false, isPending: false };
};

/**
 * `guest` is what the product page knows about the thing being added; it is
 * only used when nobody is signed in.
 */
export const useAddToCart = () => {
  const { signedIn } = useAuth();
  return useCartMutation((vars: { offeringId: string; qty: number; guest?: GuestSnapshot }) => {
    if (!signedIn) {
      if (vars.guest) guestAdd(vars.guest, vars.qty);
      return Promise.resolve(guestCartView([]));
    }
    return post<Cart>('/cart/items', { offeringId: vars.offeringId, qty: vars.qty });
  });
};

/** For a guest the itemId is the offeringId. */
export const useSetCartQty = () => {
  const { signedIn } = useAuth();
  return useCartMutation((vars: { itemId: string; qty: number }) => {
    if (!signedIn) {
      guestSetQty(vars.itemId, vars.qty);
      return Promise.resolve(guestCartView([]));
    }
    return put<Cart>(`/cart/items/${vars.itemId}`, { qty: vars.qty });
  });
};

export const useRemoveCartItem = () => {
  const { signedIn } = useAuth();
  return useCartMutation((itemId: string) => {
    if (!signedIn) {
      guestRemove(itemId);
      return Promise.resolve(guestCartView([]));
    }
    return del<Cart>(`/cart/items/${itemId}`);
  });
};

export const useClearCart = () => {
  const { signedIn } = useAuth();
  return useCartMutation(() => {
    if (!signedIn) {
      guestClear();
      return Promise.resolve(guestCartView([]));
    }
    return del<Cart>('/cart');
  });
};

export const useSetCartAddress = () =>
  useCartMutation((addressId: string) => put<Cart>('/cart/address', { addressId }));

export const useSetCartNote = () =>
  useCartMutation((note: string) => put<Cart>('/cart/note', { note }));

export const useApplyPromo = () =>
  useCartMutation((code: string) => put<Cart>('/cart/promo', { code }));

export const useClearPromo = () => useCartMutation(() => del<Cart>('/cart/promo'));

export const useSetDelivery = () =>
  useCartMutation((vars: { mode: 'INSTANT' | 'SCHEDULED'; from?: string; to?: string }) =>
    put<Cart>('/cart/delivery', vars));

/* ------------------------------------------------------------ addresses */

export const useAddresses = () => {
  const { signedIn } = useAuth();
  return useQuery({
    queryKey: ['addresses'],
    queryFn: () => get<Address[]>('/addresses'),
    enabled: signedIn,
  });
};

function useAddressMutation<TVars, TData>(fn: (vars: TVars) => Promise<TData>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['addresses'] });
      void queryClient.invalidateQueries({ queryKey: ['checkout'] });
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export const useCreateAddress = () =>
  useAddressMutation((body: AddressInput) => post<Address>('/addresses', body));

export const useEditAddress = () =>
  useAddressMutation((vars: { id: string; body: AddressInput }) =>
    put<Address>(`/addresses/${vars.id}`, vars.body));

export const useMakeDefaultAddress = () =>
  useAddressMutation((id: string) => post<Address>(`/addresses/${id}/default`));

export const useArchiveAddress = () =>
  useAddressMutation((id: string) => del<void>(`/addresses/${id}`));

/* ------------------------------------------------------------- checkout */

export const useCheckout = () => {
  const { signedIn } = useAuth();
  return useQuery({
    queryKey: ['checkout'],
    queryFn: () => get<CheckoutReview>('/checkout'),
    enabled: signedIn,
  });
};

export const useSlots = () =>
  useQuery({
    queryKey: ['slots'],
    queryFn: () => get<DeliveryOptions>('/checkout/slots'),
    staleTime: 5 * 60_000,
  });

export function usePlaceOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { contactName?: string; contactPhone?: string; paymentMode?: string }) =>
      post<Placed>('/checkout', body),
    onSuccess: () => {
      // The basket became an order; everything about it is now stale.
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
      void queryClient.invalidateQueries({ queryKey: ['checkout'] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

/* --------------------------------------------------------------- orders */

export const useMyOrders = () => {
  const { signedIn } = useAuth();
  return useQuery({
    queryKey: ['orders'],
    queryFn: () => get<Page<OrderCard>>('/orders?size=30'),
    enabled: signedIn,
  });
};

/**
 * The tracking screen polls while the order is still moving and stops once
 * it is not. Polling a delivered order forever is how a phone battery gets
 * blamed on a grocery app.
 */
export const useOrder = (orderId: string) =>
  useQuery({
    queryKey: ['order', orderId],
    queryFn: () => get<OrderDetail>(`/orders/${orderId}`),
    enabled: !!orderId,
    refetchInterval: (query) => {
      const status = query.state.data?.order.status;
      if (!status) return 30_000;
      return ['DELIVERED', 'CANCELLED', 'RETURNED', 'DELIVERY_FAILED'].includes(status)
        ? false
        : 30_000;
    },
  });

function useOrderMutation<TVars, TData>(fn: (vars: TVars) => Promise<TData>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['order'] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export const useCancelOrder = () =>
  useOrderMutation((vars: { orderId: string; reason: string }) =>
    post<OrderDetail>(`/orders/${vars.orderId}/cancel`, { reason: vars.reason }));

export const useReorder = () =>
  useOrderMutation((orderId: string) =>
    post<{ added: number }>(`/orders/${orderId}/reorder`));

export const useOrderSupportTickets = (orderId: string) =>
  useQuery({
    queryKey: ['support-tickets', orderId],
    queryFn: () => get<SupportTicket[]>(`/orders/${orderId}/queries`),
    enabled: !!orderId,
    refetchInterval: 20_000,
  });

export const useRaiseQuery = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { orderId: string; message: string }) =>
      post<SupportTicket>(`/orders/${vars.orderId}/query`, { message: vars.message }),
    onSuccess: (_ticket, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['support-tickets', vars.orderId] });
    },
  });
};

export const useReviewOrder = () =>
  useMutation({
    mutationFn: (vars: { orderId: string; rating: number; comment?: string }) =>
      post<{ ok: boolean }>(`/orders/${vars.orderId}/review`, {
        rating: vars.rating,
        comment: vars.comment,
      }),
  });
