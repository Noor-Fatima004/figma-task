"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { toast } from "sonner";
import { FaLocationArrow, FaSearch } from "react-icons/fa";

interface Props {
  latitude: string;
  longitude: string;
  onPick: (latitude: string, longitude: string) => void;
}

type Focus = { lat: number; lng: number; zoom: number };

const DEFAULT_CENTER: [number, number] = [20, 0];

function parseCoord(value: string, limit: number): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && Math.abs(parsed) <= limit ? parsed : null;
}

// Search result se pehli location nikalna (Nominatim response)
function readFirstResult(body: unknown): { lat: number; lng: number } | null {
  if (!Array.isArray(body) || body.length === 0) return null;
  const first: unknown = body[0];
  if (typeof first !== "object" || first === null) return null;
  const record = first as Record<string, unknown>;
  const lat = Number(record.lat);
  const lng = Number(record.lon);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function ClickToPick({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (event) => onPick(event.latlng.lat, event.latlng.lng),
  });
  return null;
}

function MoveTo({ focus }: { focus: Focus | null }) {
  const map = useMap();
  useEffect(() => {
    if (focus) map.setView([focus.lat, focus.lng], focus.zoom);
  }, [focus, map]);
  return null;
}

export default function LocationPicker({ latitude, longitude, onPick }: Props) {
  const lat = parseCoord(latitude, 90);
  const lng = parseCoord(longitude, 180);
  const point: [number, number] | null =
    lat !== null && lng !== null ? [lat, lng] : null;

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [focus, setFocus] = useState<Focus | null>(
    point ? { lat: point[0], lng: point[1], zoom: 15 } : null
  );

  const pick = (nextLat: number, nextLng: number) => {
    onPick(nextLat.toFixed(6), nextLng.toFixed(6));
  };

  const searchPlace = async () => {
    const text = query.trim();
    if (!text) return;
    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(text)}`,
        { headers: { Accept: "application/json" } }
      );
      const body: unknown = await response.json();
      const found = response.ok ? readFirstResult(body) : null;
      if (!found) {
        toast.error("Place not found. Try a more specific search.");
        return;
      }
      pick(found.lat, found.lng);
      setFocus({ lat: found.lat, lng: found.lng, zoom: 16 });
    } catch (error: unknown) {
      console.error("Place search failed:", error);
      toast.error("Search failed. Check your connection and try again.");
    } finally {
      setSearching(false);
    }
  };

  const locateMe = () => {
    if (!navigator.geolocation) {
      toast.error("Location is not supported on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: la, longitude: ln } = position.coords;
        pick(la, ln);
        setFocus({ lat: la, lng: ln, zoom: 16 });
      },
      () =>
        toast.error(
          "Could not get your location. Allow location access and try again."
        )
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex min-w-0 flex-1 gap-2">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void searchPlace();
              }
            }}
            placeholder="Search address or place"
            aria-label="Search address or place"
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-base text-text outline-none focus:ring-2 focus:ring-primary/30 sm:text-sm"
          />
          <button
            type="button"
            onClick={() => void searchPlace()}
            disabled={searching || query.trim() === ""}
            aria-label="Search place"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            <FaSearch className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={locateMe}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-hover"
        >
          <FaLocationArrow className="h-3.5 w-3.5" />
          Use my location
        </button>
      </div>

      {/* isolate: map ke z-index dropdown menus ke upar na aayen */}
      <div className="isolate h-64 overflow-hidden rounded-lg border border-border sm:h-80">
        <MapContainer
          center={point ?? DEFAULT_CENTER}
          zoom={point ? 15 : 2}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickToPick onPick={pick} />
          <MoveTo focus={focus} />
          {point && (
            <CircleMarker
              center={point}
              radius={10}
              pathOptions={{
                color: "#dc2626",
                fillColor: "#dc2626",
                fillOpacity: 0.6,
              }}
            />
          )}
        </MapContainer>
      </div>

      <p className="text-xs text-muted">
        Click on the map to set the warehouse location, or search for a place.
        You can also type the coordinates below.
      </p>
    </div>
  );
}