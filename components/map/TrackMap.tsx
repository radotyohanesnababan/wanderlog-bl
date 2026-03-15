"use client";

import { useEffect, useRef } from "react";

interface TrackMapProps {
  points: Array<{ lat: number; lng: number }>;
  currentPos: { lat: number; lng: number } | null;
  isTracking: boolean;
  pinnedPlaces?: Array<{ lat: number; lng: number; name: string }>;
  onMapTap?: (lat: number, lng: number) => void;
}

export default function TrackMap({ points, currentPos, isTracking, pinnedPlaces = [], onMapTap }: TrackMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const polylineRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const placeMarkersRef = useRef<any[]>([]);
  const onMapTapRef = useRef(onMapTap);
  onMapTapRef.current = onMapTap;

  // Init map sekali
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Dynamic import Leaflet (client-side only)
    import("leaflet").then((L) => {

      if ((mapRef.current as any)._leaflet_id) {
    return;
  }
  
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

      // Tap handler untuk pin tempat
      map.on("click", (e: any) => {
        if (onMapTapRef.current) {
          onMapTapRef.current(e.latlng.lat, e.latlng.lng);
        }
      });
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update place markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import("leaflet").then((L) => {
      // Hapus markers lama
      placeMarkersRef.current.forEach((m) => m.remove());
      placeMarkersRef.current = [];

      // Tambah markers baru
      pinnedPlaces.forEach((place) => {
        const icon = L.divIcon({
          className: "",
          html: `<div style="
            background:white;border:2px solid #16a34a;
            border-radius:8px;padding:2px 6px;
            font-size:11px;white-space:nowrap;
            box-shadow:0 2px 6px rgba(0,0,0,0.4);
            color:#0f172a;font-weight:600;
          ">📍 ${place.name}</div>`,
          iconAnchor: [0, 0],
        });
        const marker = L.marker([place.lat, place.lng], { icon }).addTo(mapInstanceRef.current);
        placeMarkersRef.current.push(marker);
      });
    });
  }, [pinnedPlaces]);

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