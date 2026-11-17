import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense, lazy, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ScrollToTop } from '@/components/ScrollToTop';
import { ApiRequestError } from '@/lib/api';
import { AuthProvider } from '@/lib/auth';
import { Shell } from '@/components/Shell';
import { HomePage } from '@/features/home/HomePage';
import { CartPage } from '@/features/cart/CartPage';

/* Home and the basket are what most visits touch; the rest load when asked for,
   so the first screen is not waiting on checkout and account code. */
const CategoryPage = lazy(() => import('@/features/browse/CategoryPage').then((m) => ({ default: m.CategoryPage })));
const ShopsPage = lazy(() => import('@/features/browse/ShopsPage').then((m) => ({ default: m.ShopsPage })));
const ShopPage = lazy(() => import('@/features/browse/ShopPage').then((m) => ({ default: m.ShopPage })));
const ProductPage = lazy(() => import('@/features/browse/ProductPage').then((m) => ({ default: m.ProductPage })));
const LegalPage = lazy(() => import('@/features/legal/LegalPage').then((m) => ({ default: m.LegalPage })));
const SearchPage = lazy(() => import('@/features/browse/SearchPage').then((m) => ({ default: m.SearchPage })));
const CheckoutPage = lazy(() => import('@/features/checkout/CheckoutPage').then((m) => ({ default: m.CheckoutPage })));
const LoginPage = lazy(() => import('@/features/account/LoginPage').then((m) => ({ default: m.LoginPage })));
const AccountPage = lazy(() => import('@/features/account/AccountPage').then((m) => ({ default: m.AccountPage })));
const AddressesPage = lazy(() => import('@/features/account/AddressesPage').then((m) => ({ default: m.AddressesPage })));
const OrdersPage = lazy(() => import('@/features/account/OrdersPage').then((m) => ({ default: m.OrdersPage })));
const OrderPage = lazy(() => import('@/features/account/OrderPage').then((m) => ({ default: m.OrderPage })));

export function App() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              // Retrying a 4xx only wastes a round trip on a phone's data.
              if (error instanceof ApiRequestError && error.status < 500) return false;
              return failureCount < 2;
            },
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <Suspense fallback={<div className="grid min-h-[60vh] place-items-center text-sm text-ink-muted">Loading...</div>}>
          <Routes>
            {/*
              Nothing here is behind a route guard. Browsing is open to
              anyone; the pages that need an account say so themselves and
              offer a sign-in button, which is a far better experience than
              being bounced to a login screen with no explanation.
            */}
            <Route path="/signin" element={<LoginPage />} />

            <Route element={<Shell />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/c/:slug" element={<CategoryPage />} />
              <Route path="/shops" element={<ShopsPage />} />
              <Route path="/shops/:slug" element={<ShopPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/item/:kind/:slug" element={<ProductPage />} />
              <Route path="/terms" element={<LegalPage />} />
              <Route path="/privacy" element={<LegalPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/orders/:orderId" element={<OrderPage />} />
              <Route path="/addresses" element={<AddressesPage />} />
              <Route path="/account" element={<AccountPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
