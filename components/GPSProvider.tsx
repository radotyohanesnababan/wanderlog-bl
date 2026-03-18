"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function GPSProvider() {
  const watchIdRef = useRef<number | null>(null);
  const isInitializedRef = useRef(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Monitor auth state
  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const wasAuth = isAuthenticated;
      const nowAuth = !!session;
      
      setIsAuthenticated(nowAuth);
      
      if (wasAuth && !nowAuth && watchIdRef.current !== null) {
        console.log("🛑 User logged out, stopping GPS");
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
        isInitializedRef.current = false;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isAuthenticated]);

  // Initialize GPS only when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      console.log("👤 User belum login, GPS disabled");
      return;
    }

    if (isInitializedRef.current) {
      console.log("✅ GPS sudah initialized");
      return;
    }

    console.log("🚀 User login detected, initializing GPS...");
    isInitializedRef.current = true;

    if (typeof window === "undefined") return;

    const handleDeviceReady = () => {
      console.log("📱 Device ready");

      const bg = (window as any).cordova?.plugins?.backgroundMode;

      if (bg) {
        try {
          // ✅ Config yang lebih aman
          bg.setDefaults({
            title: "WanderLog BL",
            text: "GPS tracking aktif",
            icon: "icon",
            color: "0f172a",
            resume: true,
            hidden: false,
            silent: false,
          });

          // ✅ Enable dengan error handling
          bg.enable();

          bg.on("activate", () => {
            console.log("🔋 Background mode activated");
            
            try {
              bg.disableWebViewOptimizations();
              console.log("✅ WebView optimizations disabled");
            } catch (err) {
              console.warn("⚠️ Could not disable WebView optimizations:", err);
            }
          });

          bg.on("deactivate", () => {
            console.log("⏸️ Background mode deactivated");
          });

          bg.on("failure", (errorCode: any) => {
            console.error("❌ Background mode failed:", errorCode);
          });

          console.log("✅ Background mode configured");
          
        } catch (err) {
          console.error("❌ Background mode setup error:", err);
        }
      } else {
        console.warn("⚠️ BackgroundMode plugin tidak tersedia");
      }

      // ✅ Start GPS regardless of background mode
      startGPSTracking();
    };

    const startGPSTracking = () => {
      if (!navigator.geolocation) {
        console.error("❌ Geolocation tidak didukung");
        return;
      }

      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }

      console.log("📍 Memulai GPS tracking...");

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy, speed, heading } = position.coords;

          console.log("📍 [GPS]", {
            lat: latitude.toFixed(6),
            lng: longitude.toFixed(6),
            accuracy: Math.round(accuracy) + "m",
            time: new Date(position.timestamp).toLocaleTimeString("id-ID"),
          });

          saveLocationToSupabase({
            latitude,
            longitude,
            accuracy,
            speed,
            heading,
            timestamp: position.timestamp,
          });
        },
        (error) => {
          console.error("❌ [GPS ERROR]", error.message);

          switch (error.code) {
            case error.PERMISSION_DENIED:
              console.error("🚫 Permission denied");
              break;
            case error.POSITION_UNAVAILABLE:
              console.error("📡 Position unavailable");
              break;
            case error.TIMEOUT:
              console.error("⏱️ Timeout - retrying...");
              setTimeout(startGPSTracking, 5000);
              break;
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 30000,
        }
      );

      console.log("✅ GPS watch ID:", watchIdRef.current);
    };

    const saveLocationToSupabase = async (location: {
      latitude: number;
      longitude: number;
      accuracy: number;
      speed: number | null;
      heading: number | null;
      timestamp: number;
    }) => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          console.warn("⚠️ No user found, skipping save");
          return;
        }

        const { error } = await supabase.from("locations").insert({
          user_id: user.id,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          speed: location.speed,
          heading: location.heading,
          recorded_at: new Date(location.timestamp).toISOString(),
        });

        if (error) {
          console.error("❌ Failed to save location:", error.message);
        } else {
          console.log("💾 Location saved");
        }
      } catch (err) {
        console.error("❌ Supabase error:", err);
      }
    };

    // Cordova device ready
    if ((window as any).cordova) {
      if (document.readyState === "complete") {
        handleDeviceReady();
      } else {
        document.addEventListener("deviceready", handleDeviceReady, false);
      }
    } else {
      // Fallback untuk web
      setTimeout(startGPSTracking, 1000);
    }

    // Cleanup
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        console.log("🛑 GPS tracking stopped");
        isInitializedRef.current = false;
      }
    };
  }, [isAuthenticated]);

  return null;
}