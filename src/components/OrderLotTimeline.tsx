import clsx from 'clsx';
import { dateTime } from '@/lib/format';
import type { OrderBundle, OrderStep } from '@/lib/types';

/**
 * Visual timeline for an individual shop lot in an order.
 * Shows lot-specific status transitions and rider assignment.
 *
 * The step progression is driven by `orderStatus` (the order as a whole -
 * PLACED / CONFIRMED / ... / DELIVERED), not `bundle.status`. A lot's own
 * status is a narrower, picking-only vocabulary (PENDING, ASSIGNED,
 * PICKING, PICKED, PARTIALLY_PICKED, CANCELLED) - it has no OUT_FOR_DELIVERY
 * or DELIVERED state, because a lot's job ends once its shop is picked.
 * Delivery is an order-level fact, decided after every lot is packed. Using
 * the lot's status here made the tracker unable to ever move past
 * "Confirmed" once picking finished, however far the actual delivery got.
 */
export function OrderLotTimeline({
  bundle,
  orderStatus,
  history,
  rider,
}: {
  bundle: OrderBundle;
  orderStatus: string;
  history: OrderStep[];
  rider: { name: string | null; vehicleType: string | null; lat: number | null; lng: number | null; locationUpdatedAt: string | null } | null;
}) {
  // Filter history to only steps relevant to this bundle/lot
  const lotHistory = history.filter((step) => {
    // Include general order steps and lot-specific ones
    return !step.key.includes('rider') || orderStatus === 'OUT_FOR_DELIVERY' || orderStatus === 'DELIVERED';
  });

  const getCurrentStepIndex = () => {
    const statusMap: Record<string, number> = {
      PLACED: 0,
      CONFIRMED: 1,
      SOURCING: 1,
      AWAITING_APPROVAL: 2,
      AWAITING_CUSTOMER_APPROVAL: 2,
      PACKED: 3,
      OUT_FOR_DELIVERY: 4,
      DELIVERED: 5,
      CANCELLED: -1,
    };
    return statusMap[orderStatus] ?? 0;
  };

  const steps = [
    { key: 'placed', label: 'Confirmed', icon: '✓' },
    { key: 'sourcing', label: 'Finding items', icon: '🔍' },
    { key: 'approval', label: 'Ready for OK', icon: '👤' },
    { key: 'packed', label: 'Ready to go', icon: '📦' },
    { key: 'out', label: 'On the way', icon: '🛵' },
    { key: 'delivered', label: 'Delivered', icon: '✓' },
  ];

  const currentIndex = getCurrentStepIndex();

  return (
    <div>
      {/* Timeline */}
      <ol className="flex items-start">
        {steps.map((step, index) => {
          const done = index <= currentIndex;
          const current = done && (index === currentIndex || steps[index + 1]?.key === undefined);

          return (
            <li key={step.key} className="flex flex-1 flex-col items-center text-center">
              <div className="flex w-full items-center">
                <span
                  className={clsx(
                    'h-0.5 flex-1',
                    index === 0 ? 'bg-transparent' : done ? 'bg-leaf' : 'bg-line',
                  )}
                />
                <span
                  className={clsx(
                    'grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 text-2xs font-bold',
                    done ? 'border-leaf bg-leaf text-white' : 'border-line bg-surface text-ink-faint',
                    current && 'ring-4 ring-leaf-soft',
                  )}
                >
                  {done ? '✓' : index + 1}
                </span>
                <span
                  className={clsx(
                    'h-0.5 flex-1',
                    index === steps.length - 1 ? 'bg-transparent' : done ? 'bg-leaf' : 'bg-line',
                  )}
                />
              </div>
              <span
                className={clsx(
                  'mt-1.5 px-0.5 text-[0.625rem] leading-tight',
                  done ? 'font-semibold text-ink' : 'text-ink-faint',
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>

      {/* Rider info for delivery status */}
      {(orderStatus === 'OUT_FOR_DELIVERY' || orderStatus === 'DELIVERED') && rider?.name && (
        <div className="mt-4 rounded-2xl border border-line bg-surface p-3">
          <p className="text-xs font-semibold text-ink">
            {orderStatus === 'OUT_FOR_DELIVERY' ? '🛵' : '✓'} {rider.name}
          </p>
          {rider.vehicleType && (
            <p className="text-2xs text-ink-muted">{rider.vehicleType.toLowerCase()}</p>
          )}
          {rider.locationUpdatedAt && (
            <p className="mt-1 text-2xs text-ink-faint">
              Last seen {dateTime(rider.locationUpdatedAt)}
            </p>
          )}
        </div>
      )}

      {/* History timeline */}
      {lotHistory.length > 0 && (
        <div className="mt-3 space-y-2 border-l-2 border-line pl-3">
          {lotHistory.map((item, index) => (
            <div key={index} className="relative">
              <div className="absolute -left-[11px] top-1 h-1.5 w-1.5 rounded-full bg-line" />
              <p className="text-2xs font-medium text-ink">{item.label}</p>
              {item.state && <p className="text-2xs text-ink-muted">{item.state}</p>}
              {item.at && <p className="text-2xs text-ink-faint">{dateTime(item.at)}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
