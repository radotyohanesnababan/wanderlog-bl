"use client";

import { useEffect, useRef } from "react";

interface TripRouteMapProps {
  points: Array<{ lat: number; lng: number }>;
  places: Array<{ lat: number; lng: number; name: string; category: string }>;
}

const categoryEmoji: Record<string, string> = {
  food: "🍜",
  recreation: "🎡",
  public_space: "🌳",
};

export default function TripRouteMap({ points, places }: TripRouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    if ((mapRef.current as any)._leaflet_id) return;

    import("leaflet").then((L) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      // Render rute
      if (points.length >= 2) {
        const latlngs = points.map((p) => [p.lat, p.lng] as [number, number]);
        const polyline = L.polyline(latlngs, {
          color: "#22c55e",
          weight: 4,
          opacity: 0.8,
        }).addTo(map);

        // Start marker
        L.circleMarker(latlngs[0], {
          radius: 8,
          fillColor: "#22c55e",
          color: "white",
          weight: 2,
          fillOpacity: 1,
        }).bindTooltip("Start", { permanent: false }).addTo(map);

        // End marker
        L.circleMarker(latlngs[latlngs.length - 1], {
          radius: 8,
          fillColor: "#ef4444",
          color: "white",
          weight: 2,
          fillOpacity: 1,
        }).bindTooltip("Finish", { permanent: false }).addTo(map);

        map.fitBounds(polyline.getBounds(), { padding: [20, 20] });
      } else if (places.length > 0) {
        // Kalau tidak ada rute, fit ke tempat yang dipin
        const bounds = L.latLngBounds(places.map((p) => [p.lat, p.lng]));
        map.fitBounds(bounds, { padding: [40, 40] });
      } else {
        map.setView([-5.42, 105.26], 13);
      }

      // Place markers
      places.forEach((place) => {
        const icon = L.divIcon({
          className: "",
          html: `<div style="
            background:white;border:2px solid #334155;
            border-radius:8px;padding:2px 6px;
            font-size:13px;white-space:nowrap;
            box-shadow:0 2px 8px rgba(0,0,0,0.3);
          ">${categoryEmoji[place.category] ?? "📍"} ${place.name}</div>`,
          iconAnchor: [0, 0],
        });
        L.marker([place.lat, place.lng], { icon }).addTo(map);
      });

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={mapRef} className="w-full h-full rounded-xl overflow-hidden" />;
}
