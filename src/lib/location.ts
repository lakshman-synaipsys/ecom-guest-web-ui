import { useCallback, useEffect, useState } from 'react';

const KEY = 'qc.store.where';
const CHANGE_EVENT = 'qc-store-where-changed';

export interface Where {
  lat: number;
  lng: number;
  /** What to show in the header: an address label, or "Near you". */
  label: string;
  source: 'gps' | 'address';
  area?: string;
  pincode?: string;
  city?: string;
}

function read(): Where | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Where>;
    if (typeof parsed.lat !== 'number' || typeof parsed.lng !== 'number') return null;
    return {
      lat: parsed.lat,
      lng: parsed.lng,
      label: parsed.label ?? 'Near you',
      source: parsed.source === 'address' ? 'address' : 'gps',
      area: parsed.area,
      pincode: parsed.pincode,
      city: parsed.city,
    };
  } catch {
    return null;
  }
}

/** Shared, persistent selected delivery location across all storefront screens. */
export function useWhere() {
  const [where, setWhere] = useState<Where | null>(() => read());
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sync = (event: Event) => {
      if (event instanceof CustomEvent) {
        setWhere((event.detail as Where | null) ?? null);
      } else {
        setWhere(read());
      }
    };
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    try {
      if (where) localStorage.setItem(KEY, JSON.stringify(where));
      else localStorage.removeItem(KEY);
    } catch {
      /* private window - this tab still works without persistence */
    }
  }, [where]);

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError('This browser cannot share your location. Choose a place on the map instead.');
      return;
    }
    if (!window.isSecureContext) {
      setError('Current location requires HTTPS or localhost. Choose a place on the map instead.');
      return;
    }
    setAsking(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next: Where = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          label: 'Near you',
          source: 'gps',
        };
        setWhere(next);
        window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: next }));
        setAsking(false);
      },
      () => {
        setAsking(false);
        setError('We could not get your location. Choose a place on the map instead.');
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  }, []);

  const useAddress = useCallback((
    lat: number,
    lng: number,
    label: string,
    area?: string,
    pincode?: string,
    city?: string,
  ) => {
    const next: Where = { lat, lng, label, source: 'address', area, pincode, city };
    setWhere(next);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: next }));
  }, []);

  const clear = useCallback(() => {
    setWhere(null);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: null }));
  }, []);

  return { where, asking, error, locate, useAddress, clear };
}
