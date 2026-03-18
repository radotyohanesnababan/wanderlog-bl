"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { startTrip, stopTrip, saveTripPoints, updateTripDistance } from "@/lib/actions/trip";
import { totalDistance, formatDuration } from "@/lib/utils/geo";
import PinPlaceModal from "@/components/trip/PinPlaceModal";
import TripTitleModal from "@/components/trip/TripTitleModal";
import { updateTripTitle } from "@/lib/actions/updateTripTItle";
import { Geolocation } from '@capacitor/geolocation';

// Leaflet harus di-load client-side only
const TrackMap = dynamic(() => import("@/components/map/TrackMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500 text-sm">
      Memuat peta...
    </div>
  ),
});

type GpsPoint = { lat: number; lng: number; recorded_at: string };
type TrackingStatus = "idle" | "requesting" | "tracking" | "stopped" | "error";

const GPS_INTERVAL_MS = 10_000;   // record setiap 10 detik
const BATCH_INTERVAL_MS = 30_000; // save ke DB setiap 30 detik

export default function TrackPage() {
  const [status, setStatus] = useState<TrackingStatus>("idle");
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [tripId, setTripId] = useState<string | null>(null);
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null);
  const [points, setPoints] = useState<GpsPoint[]>([]);
  const [distanceKm, setDistanceKm] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [pendingPin, setPendingPin] = useState<{ lat: number; lng: number } | null>(null);
  const [pinnedPlaces, setPinnedPlaces] = useState<Array<{ lat: number; lng: number; name: string }>>([]);

  const pendingPointsRef = useRef<GpsPoint[]>([]);
  const watchIdRef = useRef<number | null>(null);
  const gpsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const batchIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const latestPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const distanceKmRef = useRef(0);

  useEffect(() => {
    distanceKmRef.current = distanceKm;
  }, [distanceKm]);

  useEffect(() => {
    return () => stopAllIntervals();
  }, []);

  useEffect(() => {
    if (status === "tracking" && startTime) {
      elapsedIntervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000));
      }, 1000);
    }
    return () => {
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    };
  }, [status, startTime]);

  // Warn user kalau mau leave saat tracking aktif
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (status === "tracking") {
      e.preventDefault();
      e.returnValue = "";
    }
  };

  const handlePopState = () => {
    if (status === "tracking") {
      const confirm = window.confirm(
        "Tracking masih aktif! Kalau keluar, perjalanan akan otomatis distop. Lanjutkan?"
      );
      if (confirm) {
        handleStop();
      } else {
        // Push state lagi biar tidak jadi back
        window.history.pushState(null, "", "/track");
      }
    }
  };

  window.addEventListener("beforeunload", handleBeforeUnload);
  window.history.pushState(null, "", "/track");
  window.addEventListener("popstate", handlePopState);

  return () => {
    window.removeEventListener("beforeunload", handleBeforeUnload);
    window.removeEventListener("popstate", handlePopState);
  };
}, [status]);

  function stopAllIntervals() {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);
    if (batchIntervalRef.current) clearInterval(batchIntervalRef.current);
    if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
  }

  const recordPoint = useCallback(() => {
    const pos = latestPosRef.current;
    if (!pos) return;
    const point: GpsPoint = { ...pos, recorded_at: new Date().toISOString() };
    pendingPointsRef.current.push(point);
    setPoints((prev) => {
      const next = [...prev, point];
      const dist = totalDistance(next);
      setDistanceKm(dist);
      return next;
    });
  }, []);

  const batchSave = useCallback(async (id: string) => {
    const toSave = [...pendingPointsRef.current];
    if (!toSave.length) return;
    pendingPointsRef.current = [];
    await saveTripPoints(id, toSave);
    await updateTripDistance(id, distanceKmRef.current);
  }, []);

async function handleStart() {
  setErrorMsg(null);
  setStatus("requesting");

  console.log("=== START TRACKING DEBUG ===");

  // ✅ Check permission status
  try {
    const permission = await Geolocation.checkPermissions();
    console.log("📍 Permission check result:", JSON.stringify(permission));

    if (permission.location !== 'granted') {
      console.log("📍 Permission not granted, requesting...");
      
      const request = await Geolocation.requestPermissions();
      console.log("📍 Request result:", JSON.stringify(request));

      if (request.location !== 'granted') {
        setErrorMsg("Izin GPS ditolak. Coba restart app.");
        setStatus("error");
        return;
      }
    }

    console.log("✅ Permission granted, starting GPS...");

  } catch (err: any) {
    console.error("❌ Permission error:", err);
    setErrorMsg(`Permission error: ${err.message}`);
    setStatus("error");
    return;
  }

  // ✅ Test dengan Capacitor Geolocation dulu (bukan navigator.geolocation)
  try {
    console.log("📍 Testing GPS with Capacitor...");
    
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000
    });

    console.log("✅ GPS works! Position:", position.coords);
    
  } catch (err: any) {
    console.error("❌ GPS test failed:", err);
    setErrorMsg(`GPS test failed: ${err.message}`);
    setStatus("error");
    return;
  }

  // ✅ Baru create trip & start tracking
  const { tripId: newTripId, error } = await startTrip();
  if (error || !newTripId) {
    setErrorMsg(error ?? "Gagal membuat trip");
    setStatus("error");
    return;
  }

  setTripId(newTripId);
  setStartTime(new Date());
  setPoints([]);
  setDistanceKm(0);
  pendingPointsRef.current = [];

  // ✅ Gunakan Capacitor Geolocation.watchPosition (lebih reliable)
  const watchId = await Geolocation.watchPosition(
    {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 0
    },
    (position, err) => {
      if (err) {
        console.error("❌ Watch error:", err);
        setErrorMsg(`GPS watch error: ${err.message}`);
        setStatus("error");
        stopAllIntervals();
        return;
      }

      if (position) {
        const p = { 
          lat: position.coords.latitude, 
          lng: position.coords.longitude 
        };
        latestPosRef.current = p;
        setCurrentPos(p);
        console.log("📍 Position update:", p);
      }
    }
  );

  // Store watch ID untuk cleanup nanti
  watchIdRef.current = watchId as any;

  gpsIntervalRef.current = setInterval(recordPoint, GPS_INTERVAL_MS);
  batchIntervalRef.current = setInterval(() => batchSave(newTripId), BATCH_INTERVAL_MS);
  setStatus("tracking");
  
  console.log("✅ Tracking started!");
}



  async function handleStop() {
    if (!tripId) return;
    stopAllIntervals();
    const remaining = [...pendingPointsRef.current];
    pendingPointsRef.current = [];
    if (remaining.length) await saveTripPoints(tripId, remaining);
    await stopTrip(tripId, distanceKmRef.current);
    setStatus("stopped");
    setShowTitleModal(true);
  }

  const formatElapsed = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <main className="flex flex-col h-screen bg-slate-900 max-w-lg mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
        <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors">
          ← Dashboard
        </Link>
        <h1 className="text-white font-semibold">GPS Tracking</h1>
        <div className="w-16" />
      </header>

      {/* Map */}
      <div className="flex-1 px-4 pb-2 min-h-0">
        <TrackMap
          points={points.map((p) => ({ lat: p.lat, lng: p.lng }))}
          currentPos={currentPos}
          isTracking={status === "tracking"}
          pinnedPlaces={pinnedPlaces}
          onMapTap={status === "tracking" ? (lat, lng) => setPendingPin({ lat, lng }) : undefined}
        />
      </div>

      {/* Pin hint saat tracking */}
      {status === "tracking" && (
        <div className="flex-shrink-0 mx-4 mb-1 text-center text-slate-500 text-xs">
          Tap di peta untuk pin tempat
        </div>
      )}

      {/* Stats bar */}
      {(status === "tracking" || status === "stopped") && (
        <div className="flex-shrink-0 mx-4 mb-3 bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-white font-bold text-lg tabular-nums">{formatElapsed(elapsed)}</p>
              <p className="text-slate-400 text-xs">Durasi</p>
            </div>
            <div>
              <p className="text-white font-bold text-lg">{distanceKm.toFixed(2)}</p>
              <p className="text-slate-400 text-xs">km</p>
            </div>
            <div>
              <p className="text-white font-bold text-lg">{points.length}</p>
              <p className="text-slate-400 text-xs">Titik GPS</p>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {errorMsg && (
        <div className="flex-shrink-0 mx-4 mb-3 bg-red-900/50 border border-red-700 text-red-300 text-sm rounded-xl px-4 py-3">
          {errorMsg}
        </div>
      )}

      {/* Controls */}
      <div className="flex-shrink-0 px-4 pb-6 space-y-3">
        {status === "idle" && (
          <button
            onClick={handleStart}
            className="w-full bg-green-500 hover:bg-green-600 active:scale-95 text-white font-bold text-lg py-4 rounded-2xl transition-all shadow-lg shadow-green-900/40"
          >
            🚶 Mulai Perjalanan
          </button>
        )}

        {status === "requesting" && (
          <div className="w-full bg-slate-700 text-slate-300 font-semibold text-lg py-4 rounded-2xl text-center animate-pulse">
            Meminta izin GPS...
          </div>
        )}

        {status === "tracking" && (
          <>
            <div className="flex items-center justify-center gap-2 text-green-400 text-sm font-medium">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Tracking aktif · GPS setiap 10 detik
            </div>
            <button
              onClick={handleStop}
              className="w-full bg-red-500 hover:bg-red-600 active:scale-95 text-white font-bold text-lg py-4 rounded-2xl transition-all"
            >
              ⏹ Stop Perjalanan
            </button>
          </>
        )}

        {status === "stopped" && (
          <div className="space-y-3">
            <div className="bg-slate-800 border border-green-800 rounded-2xl p-4 text-center">
              <p className="text-green-400 font-semibold mb-1">Perjalanan selesai! 🎉</p>
              <p className="text-slate-400 text-sm">
                {distanceKm.toFixed(2)} km · {formatDuration(Math.floor(elapsed / 60))}
              </p>
            </div>
            <Link
              href={`/trip/${tripId}`}
              className="block w-full bg-green-500 hover:bg-green-600 text-white font-semibold text-center py-4 rounded-2xl transition-colors"
            >
              Lihat Detail Perjalanan →
            </Link>
            <button
              onClick={() => {
                setStatus("idle");
                setTripId(null);
                setPoints([]);
                setDistanceKm(0);
                setElapsed(0);
                setCurrentPos(null);
              }}
              className="w-full border border-slate-600 hover:border-slate-400 text-slate-300 font-semibold py-3 rounded-2xl transition-colors"
            >
              Mulai Perjalanan Baru
            </button>
          </div>
        )}

        {status === "error" && (
          <button
            onClick={() => { setStatus("idle"); setErrorMsg(null); }}
            className="w-full border border-slate-600 text-slate-300 font-semibold py-4 rounded-2xl"
          >
            Coba Lagi
          </button>
        )}
      </div>
      {showTitleModal && tripId && (
  <TripTitleModal
    onSave={async (title) => {
      if (title) await updateTripTitle(tripId, title);
      setShowTitleModal(false);
    }}
    onSkip={() => setShowTitleModal(false)}
  />
)}
      {/* Pin Place Modal */}
      {pendingPin && tripId && (
        <PinPlaceModal
          tripId={tripId}
          lat={pendingPin.lat}
          lng={pendingPin.lng}
          onClose={() => setPendingPin(null)}
          onSaved={(placeId, name) => {
            setPinnedPlaces((prev) => [...prev, { lat: pendingPin.lat, lng: pendingPin.lng, name }]);
            setPendingPin(null);
          }}
        />
      )}
    </main>
  );
}