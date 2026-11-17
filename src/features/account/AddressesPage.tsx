import { useState } from 'react';
import { useWhere } from '@/lib/location';
import { useAddresses, useArchiveAddress, useMakeDefaultAddress, useStoreConfig } from '@/lib/queries';
import { LocationDialog } from '@/components/LocationDialog';
import { Chip, EmptyState } from '@/components/ui';
import { Loading } from '@/components/Loaders';

export function AddressesPage() {
  const addresses = useAddresses();
  const makeDefault = useMakeDefaultAddress();
  const archive = useArchiveAddress();
  const { where } = useWhere();
  const config = useStoreConfig();
  const [adding, setAdding] = useState(false);
  const [editingAddress, setEditingAddress] = useState<NonNullable<typeof addresses.data>[number] | null>(null);
  const [showAddressLimitModal, setShowAddressLimitModal] = useState(false);
  const [addressToRemove, setAddressToRemove] = useState<NonNullable<typeof addresses.data>[number] | null>(null);
  const rows = addresses.data ?? [];

  function handleAddAddress() {
    setEditingAddress(null);
    if (rows.length >= 5) {
      setShowAddressLimitModal(true);
      return;
    }
    setAdding(true);
  }

  if (addresses.isLoading) return <Loading label="Loading your addresses..." />;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Addresses</h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            We check each one against the delivery area when you save it.
          </p>
        </div>
        <button className="btn-primary btn-sm" onClick={handleAddAddress}>
          Add an address
        </button>
      </div>


      {rows.length === 0 ? (
        <div className="card mt-5">
          <EmptyState
            emoji="📍"
            title="No addresses yet"
            body="Add one so we know where to bring things."
            action={
              <button className="btn-primary" onClick={handleAddAddress}>
                Add an address
              </button>
            }
          />
        </div>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {rows.map((address) => (
            <div key={address.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-base font-semibold">{address.label}</h2>
                    {address.isDefault && <Chip tone="leaf">Default</Chip>}
                    {!address.servicable && <Chip tone="carrot">Outside our area</Chip>}
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">{address.oneLine}</p>
                  {address.landmark && (
                    <p className="text-xs text-ink-muted">near {address.landmark}</p>
                  )}
                  {address.altPhone && (
                    <p className="mt-1 text-xs text-ink-muted">
                      Also ring {address.altPhone}
                    </p>
                  )}
                  <p className="mt-1 text-2xs tabular text-ink-faint">
                    {address.lat.toFixed(5)}, {address.lng.toFixed(5)}
                    {address.distanceKm !== null && ` · ${address.distanceKm} km from the hub`}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => { setEditingAddress(address); setAdding(true); }}
                >
                  Edit
                </button>
                {!address.isDefault && (
                  <button
                    className="btn-secondary btn-sm"
                    disabled={makeDefault.isPending}
                    onClick={() => void makeDefault.mutateAsync(address.id)}
                  >
                    Make default
                  </button>
                )}
                <button
                  className="btn-ghost btn-sm ml-auto text-carrot"
                  disabled={archive.isPending}
                  onClick={() => setAddressToRemove(address)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddressLimitModal && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowAddressLimitModal(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="address-limit-title"
            className="relative w-full max-w-md rounded-2xl bg-white p-6 text-ink shadow-2xl"
          >
            <button
              type="button"
              aria-label="Close"
              title="Close"
              onClick={() => setShowAddressLimitModal(false)}
              className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-xl text-ink-muted transition hover:bg-surface-soft hover:text-ink"
            >
              ×
            </button>
            <h2 id="address-limit-title" className="pr-8 font-display text-lg font-semibold">
              Address limit reached
            </h2>
            <p className="mt-3 text-sm leading-6 text-ink-soft">
              You can save up to 5 addresses. Please remove an existing address before adding another.
            </p>
            <div className="mt-6 flex justify-end">
              <button type="button" className="btn-secondary" onClick={() => setShowAddressLimitModal(false)}>
                Close
              </button>
            </div>
          </section>
        </div>
      )}

      {addressToRemove && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !archive.isPending) setAddressToRemove(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-address-title"
            className="relative w-full max-w-md rounded-2xl bg-white p-6 text-ink shadow-2xl"
          >
            <button
              type="button"
              aria-label="Close confirmation"
              title="Close"
              disabled={archive.isPending}
              onClick={() => setAddressToRemove(null)}
              className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-xl text-ink-muted transition hover:bg-surface-soft hover:text-ink disabled:opacity-50"
            >
              ×
            </button>
            <h2 id="remove-address-title" className="pr-8 font-display text-lg font-semibold">
              Remove address?
            </h2>
            <p className="mt-3 text-sm leading-6 text-ink-soft">
              Are you sure you want to remove the <span className="font-semibold text-ink">&quot;{addressToRemove.label}&quot;</span> address?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="btn-secondary"
                disabled={archive.isPending}
                onClick={() => setAddressToRemove(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={archive.isPending}
                onClick={() => {
                  void archive.mutateAsync(addressToRemove.id).then(() => setAddressToRemove(null));
                }}
              >
                {archive.isPending ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </section>
        </div>
      )}

      <LocationDialog
        open={adding}
        onClose={() => { setAdding(false); setEditingAddress(null); }}
        initialAddress={editingAddress ?? undefined}
        initialCoords={editingAddress ? { lat: editingAddress.lat, lng: editingAddress.lng } : {
          lat: where?.lat ?? config.data?.zone.centreLat ?? 13.445006584996664,
          lng: where?.lng ?? config.data?.zone.centreLng ?? 79.55304637537404,
        }}
      />
    </div>
  );
}
