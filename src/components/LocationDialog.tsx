import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { get } from '@/lib/api';
import { useAddresses, useCreateAddress, useEditAddress } from '@/lib/queries';
import { useWhere } from '@/lib/location';
import { Sheet, ErrorNote } from '@/components/ui';
import { OpenStreetMapPicker, type Coordinates } from './OpenStreetMapPicker';
import type { Address, AddressInput, Servicability } from '@/lib/types';

const OUT_OF_SERVICE_MESSAGE = 'Oops! Angadi is not available at this location at the moment. Please select a different location.';
const ADDRESS_DRAFT_KEY = 'qc.store.address-draft';
const LABELS = ['HOME', 'WORK', 'SHOP', 'OTHER'];

interface PlaceDetails {
  area: string;
  pincode: string;
  city: string;
  label: string;
  line1: string;
}

const EMPTY_PLACE: PlaceDetails = { area: '', pincode: '', city: '', label: 'Selected location', line1: '' };

async function reverseGeocode(coords: Coordinates): Promise<PlaceDetails> {
  const params = new URLSearchParams({
    format: 'jsonv2',
    addressdetails: '1',
    lat: String(coords.lat),
    lon: String(coords.lng),
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Address details could not be loaded. You can enter the area and pincode manually.');
  const result = await response.json() as {
    display_name?: string;
    address?: Record<string, string | undefined>;
  };
  const address = result.address ?? {};
  const area = address.suburb || address.neighbourhood || address.residential || address.village
    || address.town || address.city_district || address.county || '';
  const city = address.city || address.town || address.village || address.municipality || address.county || '';
  const road = [address.house_number, address.road].filter(Boolean).join(' ');
  return {
    area,
    pincode: address.postcode || '',
    city,
    label: area || city || result.display_name?.split(',')[0]?.trim() || 'Selected location',
    line1: road,
  };
}

function getCurrentPosition(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('This browser cannot detect your current location. Move the map to choose a place.'));
      return;
    }
    if (!window.isSecureContext) {
      reject(new Error('Current location requires HTTPS or localhost. You can still move the map to choose a place.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => reject(new Error('We could not detect your current location. Move the map to choose a place.')),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  });
}

export function LocationDialog({
  open,
  onClose,
  initialCoords,
  detectOnOpen = false,
  onDetectHandled,
  onAddressSaved,
  initialAddress,
}: {
  open: boolean;
  onClose: () => void;
  initialCoords: Coordinates;
  detectOnOpen?: boolean;
  onDetectHandled?: () => void;
  onAddressSaved?: (address: Address) => void;
  initialAddress?: Address;
}) {
  const { signedIn } = useAuth();
  const createAddress = useCreateAddress();
  const editAddress = useEditAddress();
  const addresses = useAddresses();
  const { where, useAddress } = useWhere();
  const [step, setStep] = useState<'map' | 'address'>('map');
  const [coords, setCoords] = useState<Coordinates>(initialCoords);
  const [place, setPlace] = useState<PlaceDetails>(EMPTY_PLACE);
  const [form, setForm] = useState<AddressInput>({ label: 'HOME' });
  const [checking, setChecking] = useState(false);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddressLimitModal, setShowAddressLimitModal] = useState(false);
  const autoDetectDone = useRef(false);
  const originalCoords = useRef<Coordinates>(initialCoords);
  const lastDefaultAddressKey = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      autoDetectDone.current = false;
      lastDefaultAddressKey.current = null;
      return;
    }
    const start = initialAddress
      ? { lat: initialAddress.lat, lng: initialAddress.lng }
      : where ? { lat: where.lat, lng: where.lng } : initialCoords;
    originalCoords.current = start;
    setCoords(start);
    setStep('map');
    setError(null);
    setPlace({
      ...EMPTY_PLACE,
      area: initialAddress?.area ?? where?.area ?? '',
      pincode: initialAddress?.pincode ?? where?.pincode ?? '',
      city: initialAddress?.city ?? where?.city ?? '',
      label: initialAddress?.label ?? where?.label ?? 'Selected location',
      line1: initialAddress?.line1 ?? '',
    });
    let draft: Partial<AddressInput> = {};
    try {
      const rawDraft = localStorage.getItem(ADDRESS_DRAFT_KEY);
      if (rawDraft) draft = JSON.parse(rawDraft) as Partial<AddressInput>;
    } catch {
      draft = {};
    }
    setForm(initialAddress ? {
      label: initialAddress.label,
      contactName: initialAddress.contactName,
      contactPhone: initialAddress.contactPhone,
      altPhone: initialAddress.altPhone,
      line1: initialAddress.line1,
      line2: initialAddress.line2,
      landmark: initialAddress.landmark,
      area: initialAddress.area,
      city: initialAddress.city,
      pincode: initialAddress.pincode,
      lat: initialAddress.lat,
      lng: initialAddress.lng,
    } : {
      ...({ label: 'HOME' } as AddressInput),
      ...draft,
      area: where?.area ?? draft.area ?? '',
      pincode: where?.pincode ?? draft.pincode ?? '',
      city: where?.city ?? draft.city ?? '',
    });
  // Only reset when the dialog opens/closes or its initial center changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || initialAddress || !signedIn || !addresses.data) return;

    const defaultAddress = addresses.data.find((address) => address.isDefault);
    if (!defaultAddress) return;

    // Recenter the map when it opens and whenever the customer's default address changes.
    // The key also includes coordinates so an updated default address position is reflected.
    const defaultAddressKey = `${defaultAddress.id}:${defaultAddress.lat}:${defaultAddress.lng}`;
    if (lastDefaultAddressKey.current === defaultAddressKey) return;
    lastDefaultAddressKey.current = defaultAddressKey;

    const defaultCoords = { lat: defaultAddress.lat, lng: defaultAddress.lng };
    originalCoords.current = defaultCoords;
    setCoords(defaultCoords);
    setPlace({
      ...EMPTY_PLACE,
      area: defaultAddress.area ?? '',
      pincode: defaultAddress.pincode ?? '',
      city: defaultAddress.city ?? '',
      label: defaultAddress.label || 'Default address',
      line1: defaultAddress.line1 ?? '',
    });
    setForm((current) => ({
      ...current,
      label: defaultAddress.label || current.label || 'HOME',
      line1: defaultAddress.line1 ?? current.line1 ?? '',
      line2: defaultAddress.line2 ?? current.line2 ?? '',
      area: defaultAddress.area ?? '',
      pincode: defaultAddress.pincode ?? '',
      city: defaultAddress.city ?? '',
      landmark: defaultAddress.landmark ?? current.landmark ?? '',
      contactName: defaultAddress.contactName ?? current.contactName ?? '',
      altPhone: defaultAddress.altPhone ?? current.altPhone ?? '',
    }));
  }, [open, signedIn, addresses.data, initialAddress]);

  useEffect(() => {
    if (!open || !detectOnOpen || autoDetectDone.current) return;
    autoDetectDone.current = true;
    onDetectHandled?.();
    setLocating(true);
    getCurrentPosition()
      .then((next) => setCoords(next))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Could not detect your location.'))
      .finally(() => setLocating(false));
  }, [open, detectOnOpen, onDetectHandled]);

  function setField<K extends keyof AddressInput>(field: K, value: AddressInput[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function validateAndContinue(nextCoords: Coordinates) {
    setChecking(true);
    setError(null);
    try {
      const params = new URLSearchParams({ lat: String(nextCoords.lat), lng: String(nextCoords.lng) });
      const reach = await get<Servicability>(`/browse/servicable?${params.toString()}`);
      if (!reach.served) {
        setError(OUT_OF_SERVICE_MESSAGE);
        setStep('map');
        return;
      }

      let nextPlace = EMPTY_PLACE;
      try {
        nextPlace = await reverseGeocode(nextCoords);
      } catch {
        nextPlace = EMPTY_PLACE;
      }
      localStorage.removeItem('qc.store.location-skipped');
      setCoords(nextCoords);
      setPlace(nextPlace);
      // When editing, replace the old address-derived fields with details for the
      // newly confirmed map coordinates. Keep the customer's non-location fields
      // (label, contact details, landmark, etc.) so they can still edit them.
      // Clear line1 when reverse geocoding has no street result rather than
      // accidentally retaining the previous address's street.
      setForm((current) => ({
        ...current,
        area: nextPlace.area || '',
        pincode: nextPlace.pincode || '',
        city: nextPlace.city || '',
        line1: nextPlace.line1 || '',
      }));
      useAddress(nextCoords.lat, nextCoords.lng, nextPlace.label, nextPlace.area, nextPlace.pincode, nextPlace.city);
      setStep('address');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'We could not check this location. Please try again.');
    } finally {
      setChecking(false);
    }
  }

  async function useCurrentLocation() {
    setLocating(true);
    setError(null);
    try {
      const next = await getCurrentPosition();
      setCoords(next);
      setStep('map');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not detect your location.');
    } finally {
      setLocating(false);
    }
  }

  async function saveAddress() {
    if (signedIn && !initialAddress && (addresses.data?.length ?? 0) >= 5) {
      setError(null);
      setShowAddressLimitModal(true);
      return;
    }
    if (!coords || !(form.line1 ?? '').trim()) {
      setError('Please enter your house/shop number and street.');
      return;
    }
    setSaving(true);
    setError(null);
    const body: AddressInput = {
      ...form,
      line1: form.line1?.trim(),
      area: form.area?.trim() || null,
      pincode: form.pincode?.trim() || null,
      city: form.city?.trim() || null,
      lat: coords.lat,
      lng: coords.lng,
    };
    try {
      if (signedIn) {
        const address = initialAddress
          ? await editAddress.mutateAsync({ id: initialAddress.id, body })
          : await createAddress.mutateAsync(body);
        localStorage.removeItem(ADDRESS_DRAFT_KEY);
        onAddressSaved?.(address);
      } else {
        localStorage.setItem(ADDRESS_DRAFT_KEY, JSON.stringify({ ...body, label: place.label }));
      }
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'We could not save this address. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const locationChanged = coords.lat !== originalCoords.current.lat || coords.lng !== originalCoords.current.lng;
  const title = step === 'map' ? 'Choose your delivery location' : 'Complete your address';

  return (
    <Sheet open={open} onClose={onClose} title={title} className="sm:max-w-5xl">
      {error && <div className="mb-3"><ErrorNote message={error} /></div>}

      {showAddressLimitModal && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowAddressLimitModal(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="location-address-limit-title"
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
            <h2 id="location-address-limit-title" className="pr-8 font-display text-lg font-semibold">
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

      {step === 'map' ? (
        <div className="space-y-3 pb-2">
          <p className="text-sm text-ink-muted">Move the map and place the pin where the rider should deliver.</p>
          <OpenStreetMapPicker value={coords} onChange={setCoords} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button type="button" className="btn-secondary flex-1" disabled={locating} onClick={() => void useCurrentLocation()}>
              {locating ? 'Detecting location…' : 'Use my current location'}
            </button>
            <button type="button" className="btn-primary flex-1" disabled={(!locationChanged && !initialAddress) || checking || locating} onClick={() => void validateAndContinue(coords)}>
              {checking ? 'Checking service area…' : 'Confirm this location'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 pb-2">
          <p className="rounded-xl bg-leaf-soft px-3 py-2 text-xs text-leaf">
            This location is serviceable. Complete the address so the rider can find you.
          </p>

          <div>
            <span className="label">Save this place as</span>
            <div className="flex flex-wrap gap-2">
              {LABELS.map((label) => (
                <button key={label} type="button" onClick={() => setField('label', label)}
                  className={`rounded-pill px-3.5 py-1.5 text-xs font-semibold ${form.label === label ? 'bg-leaf text-white' : 'border border-line-strong bg-surface text-ink-soft hover:bg-sand'}`}>
                  {label.charAt(0) + label.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="label">House / shop number and street *</span>
            <input className="input" autoFocus placeholder="12-4-9, Bazaar Street" value={form.line1 ?? ''}
              onChange={(event) => setField('line1', event.target.value)} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label">Area</span>
              <input className="input" value={form.area ?? ''} onChange={(event) => setField('area', event.target.value)} placeholder="Area / locality" />
            </label>
            <label className="block">
              <span className="label">Pincode</span>
              <input className="input" inputMode="numeric" maxLength={10} value={form.pincode ?? ''}
                onChange={(event) => setField('pincode', event.target.value)} placeholder="Postal code" />
            </label>
          </div>

          <label className="block">
            <span className="label">City / town</span>
            <input className="input" value={form.city ?? ''} onChange={(event) => setField('city', event.target.value)} placeholder="City or town" />
          </label>

          <label className="block">
            <span className="label">Landmark</span>
            <input className="input" value={form.landmark ?? ''} onChange={(event) => setField('landmark', event.target.value)} placeholder="Opposite the temple" />
          </label>

          <div className="rounded-2xl border border-line bg-sand/50 p-3">
            <span className="label">Where exactly?</span>
            <input className="input mt-1 font-mono text-xs" value={`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`} readOnly disabled aria-label="Selected latitude and longitude" />
            <button type="button" className="btn-secondary btn-sm mt-2" disabled={locating || checking} onClick={() => void useCurrentLocation()}>
              {locating ? 'Finding your location…' : 'Use my current location'}
            </button>
            <button type="button" className="btn-ghost btn-sm ml-2" onClick={() => { setStep('map'); setError(null); }}>
              Adjust pin on map
            </button>
          </div>

          <label className="block">
            <span className="label">Who should the rider ask for?</span>
            <input className="input" value={form.contactName ?? ''} onChange={(event) => setField('contactName', event.target.value)} placeholder="Name to ask for (optional)" />
          </label>

          <label className="block">
            <span className="label">Another number</span>
            <input className="input font-mono" inputMode="tel" value={form.altPhone ?? ''}
              onChange={(event) => setField('altPhone', event.target.value)} placeholder="98765 43210" />
          </label>

          <button type="button" className="btn-primary btn-block" disabled={saving || checking || !(form.line1 ?? '').trim()}
            onClick={() => void saveAddress()}>
            {saving ? (initialAddress ? 'Updating address…' : 'Saving address…') : initialAddress ? 'Update address' : signedIn ? 'Save address' : 'Use this location'}
          </button>
          {!signedIn && <p className="text-center text-xs text-ink-muted">Your location will be remembered on this device. Sign in to save the full address to your account.</p>}
        </div>
      )}
    </Sheet>
  );
}
