import clsx from 'clsx';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { dateTime, money, whenText } from '@/lib/format';
import { useMyOrders } from '@/lib/queries';
import { EmptyState } from '@/components/ui';
import { Loading } from '@/components/Loaders';
import type { OrderStatus } from '@/lib/types';

/** Statuses a shopper sees, in the words a shopper uses. */
export const STATUS_TEXT: Record<OrderStatus, { label: string; tone: 'leaf' | 'sun' | 'carrot' | 'berry' | 'quiet' }> = {
  PLACED:                     { label: 'Placed',            tone: 'sun' },
  CONFIRMED:                  { label: 'Confirmed',         tone: 'sun' },
  SOURCING:                   { label: 'Being shopped',     tone: 'sun' },
  PACKED:                     { label: 'Packed',            tone: 'leaf' },
  OUT_FOR_DELIVERY:           { label: 'On the way',        tone: 'leaf' },
  DELIVERED:                  { label: 'Delivered',         tone: 'leaf' },
  CANCELLED:                  { label: 'Cancelled',         tone: 'berry' },
  DELIVERY_FAILED:            { label: 'Could not deliver', tone: 'berry' },
  RETURNED:                   { label: 'Returned',          tone: 'quiet' },
};

export function OrdersPage() {
  const { signedIn } = useAuth();
  const orders = useMyOrders();
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');

  if (!signedIn) {
    return (
      <EmptyState
        emoji="📦"
        title="Sign in to see your orders"
        body="Everything you have ordered, and where it is right now."
        action={<Link to="/signin" className="btn-primary">Sign in</Link>}
      />
    );
  }

  if (orders.isLoading) return <Loading label="Loading your orders..." />;

  const rows = orders.data?.content ?? [];

  if (rows.length === 0) {
    return (
      <EmptyState
        emoji="📦"
        title="No orders yet"
        body="When you place one it shows up here, with live tracking."
        action={<Link to="/" className="btn-primary">Start shopping</Link>}
      />
    );
  }

  const filteredRows = statusFilter === 'ALL'
    ? rows
    : rows.filter((row) => row.status === statusFilter);
  const live = filteredRows.filter(
    (row) => !['DELIVERED', 'CANCELLED', 'RETURNED', 'DELIVERY_FAILED'].includes(row.status));
  const past = filteredRows.filter(
    (row) => ['DELIVERED', 'CANCELLED', 'RETURNED', 'DELIVERY_FAILED'].includes(row.status));
  const filterOptions: { value: OrderStatus | 'ALL'; label: string }[] = [
    { value: 'ALL', label: 'All orders' },
    ...Object.entries(STATUS_TEXT).map(([value, status]) => ({
      value: value as OrderStatus,
      label: status.label,
    })),
  ];

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Your orders</h1>
        <div className="relative">
          <button
            type="button"
            className="btn-secondary btn-sm inline-flex items-center gap-2"
            aria-label="Filter orders"
            aria-expanded={filterOpen}
            onClick={() => setFilterOpen((open) => !open)}
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 6h16M7 12h10m-7 6h4" />
            </svg>
            Filter
          </button>
          {filterOpen && (
            <div className="absolute right-0 z-30 mt-2 max-h-80 w-60 overflow-y-auto rounded-xl border border-line bg-surface p-2 shadow-lift">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={clsx(
                    'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-sand',
                    statusFilter === option.value && 'bg-leaf-soft font-semibold text-leaf-dark',
                  )}
                  onClick={() => {
                    setStatusFilter(option.value);
                    setFilterOpen(false);
                  }}
                >
                  <span>{option.label}</span>
                  {statusFilter === option.value && <span aria-hidden="true">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <EmptyState
          emoji="📦"
          title="No matching orders"
          body={`You don't have any ${STATUS_TEXT[statusFilter as OrderStatus]?.label.toLowerCase() ?? ''} orders.`}
          action={<button type="button" className="btn-secondary" onClick={() => setStatusFilter('ALL')}>Show all orders</button>}
        />
      ) : null}

      {live.length > 0 && (
        <section className="mt-5">
          <h2 className="section-title mb-3">On the way</h2>
          <div className="space-y-3">
            {live.map((order) => <OrderRow key={order.id} order={order} live />)}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className="mt-8">
          <h2 className="section-title mb-3">Earlier</h2>
          <div className="space-y-3">
            {past.map((order) => <OrderRow key={order.id} order={order} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function OrderRow({
  order,
  live,
}: {
  order: import('@/lib/types').OrderCard;
  live?: boolean;
}) {
  const status = STATUS_TEXT[order.status];
  const statusColors: Record<OrderStatus, { backgroundColor: string; color: string; borderColor: string }> = {
    PLACED: { backgroundColor: '#FEF3C7', color: '#92400E', borderColor: '#FDE68A' },
    CONFIRMED: { backgroundColor: '#DBEAFE', color: '#1E40AF', borderColor: '#BFDBFE' },
    SOURCING: { backgroundColor: '#F3E8FF', color: '#6B21A8', borderColor: '#E9D5FF' },
    AWAITING_CUSTOMER_APPROVAL: { backgroundColor: '#FFEDD5', color: '#9A3412', borderColor: '#FED7AA' },
    PACKED: { backgroundColor: '#DCFCE7', color: '#166534', borderColor: '#BBF7D0' },
    OUT_FOR_DELIVERY: { backgroundColor: '#CFFAFE', color: '#155E75', borderColor: '#A5F3FC' },
    DELIVERED: { backgroundColor: '#DCFCE7', color: '#166534', borderColor: '#86EFAC' },
    CANCELLED: { backgroundColor: '#FEE2E2', color: '#991B1B', borderColor: '#FECACA' },
    DELIVERY_FAILED: { backgroundColor: '#FEE2E2', color: '#991B1B', borderColor: '#FECACA' },
    RETURNED: { backgroundColor: '#F1F5F9', color: '#475569', borderColor: '#CBD5E1' },
  };

  return (
    <Link
      to={`/orders/${order.id}`}
      className={clsx('card block p-4 transition-shadow hover:shadow-lift',
                      live && 'border-leaf-line')}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold">{order.orderNumber}</span>
            <span
              className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold leading-none"
              style={statusColors[order.status]}
            >
              {status.label}
            </span>
          </div>
          <p className="mt-1 truncate text-sm text-ink-soft">
            {order.itemCount} item{order.itemCount === 1 ? '' : 's'}
            {order.shopCount > 1 && ` from ${order.shopCount} shops`}
            {order.shopCount === 1 && order.shopNames && ` from ${order.shopNames}`}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="font-display text-lg font-semibold tabular">
            {money(order.payablePaise)}
          </p>
          <p className="text-2xs text-ink-muted">
            {order.finalised ? 'final' : 'estimated'} &middot;{' '}
            {order.paymentMode === 'COD' ? 'cash' : 'online'}
          </p>
        </div>
      </div>

      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="min-w-0 text-xs text-ink-muted">
          {live
            ? `Expected ${whenText(order)}`
            : order.deliveredAt
              ? `Delivered ${dateTime(order.deliveredAt)}`
              : `Placed ${dateTime(order.placedAt)}`}
        </p>

        {order.averageRating != null && (
          <p
            className="shrink-0 flex items-center justify-end gap-1 text-sm font-medium"
            aria-label={`Your average product rating for this order: ${order.averageRating.toFixed(1)} out of 5`}
            title="Average of your product ratings for this order"
          >
            <span className="tracking-wide text-sun" aria-hidden="true">
              {Array.from({ length: 5 }, (_, index) =>
                index < Math.round(order.averageRating!) ? '★' : '☆').join('')}
            </span>
            <span className="tabular text-ink">{order.averageRating.toFixed(1)}</span>
          </p>
        )}
      </div>
    </Link>
  );
}
