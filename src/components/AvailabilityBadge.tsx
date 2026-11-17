import { Chip } from './ui';
import type { Availability } from '@/lib/types';

/**
 * Consistent availability status display across all product views.
 */
export function AvailabilityBadge({
  availability,
  shopName,
}: {
  availability: Availability;
  shopName?: string | null;
}) {
  switch (availability) {
    case 'IN_STOCK':
      return (
        <Chip tone="leaf">
          {shopName ? `In stock at ${shopName}` : 'In stock'}
        </Chip>
      );

    case 'LOW':
      return <Chip tone="sun">Only a few left</Chip>;

    case 'OUT':
      return <Chip tone="carrot">Out of stock</Chip>;

    case 'UNKNOWN':
    default:
      return <Chip>Availability unclear</Chip>;
  }
}
