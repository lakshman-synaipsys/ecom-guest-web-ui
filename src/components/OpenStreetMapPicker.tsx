import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, PointerEvent as ReactPointerEvent } from 'react';

export interface Coordinates {
  lat: number;
  lng: number;
}

interface SearchResult extends Coordinates {
  display_name: string;
}

const TILE_SIZE = 256;
const MAX_LAT = 85.05112878;

function toWorld({ lat, lng }: Coordinates, zoom: number) {
  const size = TILE_SIZE * 2 ** zoom;
  const safeLat = Math.max(-MAX_LAT, Math.min(MAX_LAT, lat));
  const sin = Math.sin((safeLat * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * size,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size,
  };
}

function fromWorld(x: number, y: number, zoom: number): Coordinates {
  const size = TILE_SIZE * 2 ** zoom;
  const lng = (x / size) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / size;
  const lat = (180 / Math.PI) * Math.atan(Math.sinh(n));
  return {
    lat: Math.max(-MAX_LAT, Math.min(MAX_LAT, lat)),
    lng: Math.max(-180, Math.min(180, lng)),
  };
}

function wrapTile(x: number, count: number) {
  return ((x % count) + count) % count;
}

export function OpenStreetMapPicker({
  value,
  onChange,
}: {
  value: Coordinates;
  onChange: (coords: Coordinates) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; worldX: number; worldY: number; moved: boolean } | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);
  const [size, setSize] = useState({ width: 640, height: 340 });
  const [zoom, setZoom] = useState(15);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);

  const center = useMemo(() => toWorld(value, zoom), [value.lat, value.lng, zoom]);
  const count = 2 ** zoom;
  const leftWorld = center.x - size.width / 2;
  const topWorld = center.y - size.height / 2;
  const minTileX = Math.floor(leftWorld / TILE_SIZE) - 1;
  const maxTileX = Math.floor((leftWorld + size.width) / TILE_SIZE) + 1;
  const minTileY = Math.max(0, Math.floor(topWorld / TILE_SIZE) - 1);
  const maxTileY = Math.min(count - 1, Math.floor((topWorld + size.height) / TILE_SIZE) + 1);
  const tiles: { key: string; src: string; left: number; top: number }[] = [];

  for (let x = minTileX; x <= maxTileX; x += 1) {
    for (let y = minTileY; y <= maxTileY; y += 1) {
      tiles.push({
        key: `${x}-${y}-${zoom}`,
        src: `https://tile.openstreetmap.org/${zoom}/${wrapTile(x, count)}/${y}.png`,
        left: x * TILE_SIZE - center.x + size.width / 2,
        top: y * TILE_SIZE - center.y + size.height / 2,
      });
    }
  }

  useEffect(() => {
    const node = mapRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ width: Math.max(1, rect.width), height: Math.max(1, rect.height) });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('[data-map-control="true"]')) return;
    const pointers = pointersRef.current;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);

    if (pointers.size >= 2) {
      const [first, second] = Array.from(pointers.values());
      pinchRef.current = {
        distance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)),
        zoom,
      };
      dragRef.current = null;
      return;
    }

    const world = toWorld(value, zoom);
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      worldX: world.x,
      worldY: world.y,
      moved: false,
    };
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const pointers = pointersRef.current;
    if (pointers.has(event.pointerId)) {
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }

    if (pointers.size >= 2 && pinchRef.current) {
      const [first, second] = Array.from(pointers.values());
      const distance = Math.max(1, Math.hypot(second.x - first.x, second.y - first.y));
      const nextZoom = Math.max(3, Math.min(19, Math.round(
        pinchRef.current.zoom + Math.log2(distance / pinchRef.current.distance),
      )));
      setZoom(nextZoom);
      return;
    }

    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.hypot(dx, dy) > 5) drag.moved = true;
    if (drag.moved) {
      onChange(fromWorld(drag.worldX - dx, drag.worldY - dy, zoom));
    }
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const wasPinching = Boolean(pinchRef.current);
    const pointers = pointersRef.current;
    pointers.delete(event.pointerId);

    if (pointers.size < 2) pinchRef.current = null;

    if (drag && !drag.moved && !wasPinching && pointers.size === 0) {
      // A short tap selects the point directly under the user's finger/cursor.
      const rect = mapRef.current?.getBoundingClientRect();
      if (rect) {
        const world = toWorld(value, zoom);
        const x = world.x + (event.clientX - rect.left - rect.width / 2);
        const y = world.y + (event.clientY - rect.top - rect.height / 2);
        onChange(fromWorld(x, y, zoom));
      }
    }

    if (pointers.size === 0) dragRef.current = null;
    else if (pointers.size === 1) {
      // Resume a fresh one-finger drag after a pinch gesture ends.
      const remaining = Array.from(pointers.values())[0];
      const world = toWorld(value, zoom);
      dragRef.current = { x: remaining.x, y: remaining.y, worldX: world.x, worldY: world.y, moved: true };
    }
  }

  function onPointerCancel(event: ReactPointerEvent<HTMLDivElement>) {
    pointersRef.current.delete(event.pointerId);
    pinchRef.current = null;
    dragRef.current = null;
  }

  async function searchPlaces(event: FormEvent) {
    event.preventDefault();
    if (search.trim().length < 3) return;
    setSearching(true);
    setSearchError(null);
    setResults([]);
    try {
      const params = new URLSearchParams({
        format: 'jsonv2',
        q: search.trim(),
        limit: '5',
        addressdetails: '1',
        countrycodes: 'in',
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error('Search is temporarily unavailable. Move the map to choose your location.');
      const data = await response.json() as Array<{ lat: string; lon: string; display_name: string }>;
      const found = data.map((item) => ({ lat: Number(item.lat), lng: Number(item.lon), display_name: item.display_name }));
      setResults(found);
      if (found.length === 0) setSearchError('No matching places found. Try a nearby town or landmark.');
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Could not search for that place.');
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-2">
      <form onSubmit={searchPlaces} className="flex gap-2">
        <input
          data-map-control="true"
          className="input min-w-0 flex-1"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search area, street or landmark"
          aria-label="Search for a place"
        />
        <button data-map-control="true" className="btn-secondary btn-sm" disabled={searching || search.trim().length < 3}>
          {searching ? 'Searching…' : 'Search'}
        </button>
      </form>

      {results.length > 0 && (
        <div className="max-h-32 overflow-y-auto rounded-xl border border-line bg-surface">
          {results.map((result, index) => (
            <button
              key={`${result.lat}-${result.lng}-${index}`}
              data-map-control="true"
              className="block w-full border-b border-line px-3 py-2 text-left text-xs last:border-0 hover:bg-sand"
              onClick={() => { onChange({ lat: result.lat, lng: result.lng }); setResults([]); setSearch(result.display_name); }}
              type="button"
            >
              {result.display_name}
            </button>
          ))}
        </div>
      )}
      {searchError && <p className="text-xs text-carrot">{searchError}</p>}

      <div
        ref={mapRef}
        className="relative h-[340px] w-full touch-none select-none overflow-hidden rounded-2xl border border-line bg-sand sm:h-[440px] lg:h-[500px]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        role="application"
        aria-label="OpenStreetMap location picker. Tap the map to move the pin, drag the map, or pinch with two fingers to zoom."
      >
        {tiles.map((tile) => (
          <img
            key={tile.key}
            src={tile.src}
            alt=""
            draggable={false}
            className="pointer-events-none absolute max-w-none"
            style={{ left: tile.left, top: tile.top, width: TILE_SIZE, height: TILE_SIZE }}
          />
        ))}
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-full">
          <div className="relative flex flex-col items-center">
            <div className="grid h-9 w-9 place-items-center rounded-full rounded-br-none border-2 border-white bg-carrot text-lg text-white shadow-lg rotate-45">
              <span className="-rotate-45">📍</span>
            </div>
            <div className="h-2 w-0.5 bg-carrot" />
          </div>
        </div>
        <div data-map-control="true" className="absolute right-3 top-3 z-20 flex flex-col overflow-hidden rounded-lg border border-line bg-white shadow">
          <button type="button" aria-label="Zoom in" className="h-9 w-9 text-xl" onClick={() => setZoom((z) => Math.min(19, z + 1))}>+</button>
          <div className="h-px bg-line" />
          <button type="button" aria-label="Zoom out" className="h-9 w-9 text-xl" onClick={() => setZoom((z) => Math.max(3, z - 1))}>−</button>
        </div>
        <div className="absolute bottom-1.5 left-2 z-20 rounded bg-white/90 px-1.5 py-0.5 text-[10px] text-ink-muted">
          © <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>
        </div>
      </div>
      <p className="text-center text-xs text-ink-muted">Tap the map to place the pin, drag to fine-tune, or use two fingers to zoom.</p>
      <p className="text-center font-mono text-xs tabular text-ink-soft">
        {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
      </p>
    </div>
  );
}
