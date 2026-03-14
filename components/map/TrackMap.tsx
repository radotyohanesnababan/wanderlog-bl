"use client";

import { useEffect, useRef } from "react";

interface TrackMapProps {
  points: Array<{ lat: number; lng: number }>;
  currentPos: { lat: number; lng: number } | null;
  isTracking: boolean;
}

export default function TrackMap({ points, currentPos, isTracking }: TrackMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const polylineRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);

  // Init map sekali
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Dynamic import Leaflet (client-side only)
    import("leaflet").then((L) => {
      // Fix default icon path issue di Next.js
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        center: [-5.42, 105.26], // Bandar Lampung
        zoom: 14,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

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

  // Update polyline saat points berubah
  useEffect(() => {
    if (!mapInstanceRef.current || points.length < 2) return;

    import("leaflet").then((L) => {
      const latlngs = points.map((p) => [p.lat, p.lng] as [number, number]);

      if (polylineRef.current) {
        polylineRef.current.setLatLngs(latlngs);
      } else {
        polylineRef.current = L.polyline(latlngs, {
          color: "#22c55e",
          weight: 4,
          opacity: 0.85,
        }).addTo(mapInstanceRef.current);
      }
    });
  }, [points]);

  // Update marker posisi current
  useEffect(() => {
    if (!mapInstanceRef.current || !currentPos) return;

    import("leaflet").then((L) => {
      const pulsingIcon = L.divIcon({
        className: "",
        html: `<div style="
          width:16px;height:16px;border-radius:50%;
          background:#22c55e;border:3px solid white;
          box-shadow:0 0 0 4px rgba(34,197,94,0.3);
          animation: pulse 1.5s ease-in-out infinite;
        "></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      if (markerRef.current) {
        markerRef.current.setLatLng([currentPos.lat, currentPos.lng]);
      } else {
        markerRef.current = L.marker([currentPos.lat, currentPos.lng], {
          icon: pulsingIcon,
        }).addTo(mapInstanceRef.current);
      }

      // Pan ke posisi saat tracking aktif
      if (isTracking) {
        mapInstanceRef.current.panTo([currentPos.lat, currentPos.lng]);
      }
    });
  }, [currentPos, isTracking]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full rounded-2xl overflow-hidden" />
      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(34,197,94,0.3); }
          50% { box-shadow: 0 0 0 8px rgba(34,197,94,0.1); }
        }
      `}</style>
    </div>
  );
}
