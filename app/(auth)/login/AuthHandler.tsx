"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import type { PluginListenerHandle } from "@capacitor/core";

export default function AuthHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const hasHandledCallback = useRef(false); // ✅ Guard

  useEffect(() => {
    if (hasHandledCallback.current) return; // ✅ Prevent duplicate

    const supabase = createClient();
    let listenerHandle: PluginListenerHandle | null = null;

    const handleWebCallback = async () => {
      const code = searchParams?.get('code');
      
      if (!code || hasHandledCallback.current) return;
      
      hasHandledCallback.current = true;
      console.log("🔑 PKCE code detected");
      setStatus("processing");

      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.warn("⚠️ PKCE exchange failed:", error.message);
          
          // ✅ Fallback: Cek apakah session sudah ada
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            console.log("✅ Session exists despite error, continuing...");
            setStatus("success");
            window.history.replaceState({}, '', '/login');
            setTimeout(() => router.replace("/dashboard"), 300);
            return;
          }
          
          // Baru error kalau beneran gak ada session
          setStatus("error");
          setErrorMsg(error.message);
          hasHandledCallback.current = false;
          return;
        }

        console.log("✅ Session created:", data.session?.user?.email);
        setStatus("success");
        window.history.replaceState({}, '', '/login');
        setTimeout(() => router.replace("/dashboard"), 300);
        
      } catch (err: any) {
        console.error("❌ Callback error:", err);
        
        // ✅ Final fallback
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log("✅ Session exists, ignoring error");
          setStatus("success");
          setTimeout(() => router.replace("/dashboard"), 300);
        } else {
          setStatus("error");
          setErrorMsg(err.message || "Unknown error");
          hasHandledCallback.current = false;
        }
      }
    };

    const handleDeepLink = async (event: { url: string }) => {
      if (hasHandledCallback.current) return; // ✅ Guard
      
      hasHandledCallback.current = true;
      console.log("📱 Deep link received:", event.url);
      setStatus("processing");

      try {
        await Browser.close().catch(() => {});

        const url = new URL(event.url);
        const urlSearchParams = new URLSearchParams(url.search);
        const hashParams = new URLSearchParams(url.hash.substring(1));

        const code = urlSearchParams.get("code");
        const access_token = hashParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token");

        // ✅ Prioritas 1: Implicit flow
        if (access_token && refresh_token) {
          console.log("✅ Implicit flow - setting session...");
          
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (error) {
            console.error("❌ setSession error:", error);
            setStatus("error");
            setErrorMsg(error.message);
            hasHandledCallback.current = false;
            return;
          }

          console.log("✅ Session set:", data.session?.user?.email);
          setStatus("success");
          setTimeout(() => router.replace("/dashboard"), 300);
          return;
        }

        // ✅ Prioritas 2: PKCE flow dengan fallback
        if (code) {
          console.log("⚠️ PKCE flow - trying exchange...");
          
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            console.warn("⚠️ PKCE failed:", error.message);
            
            // Fallback: cek session
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              console.log("✅ Session exists, ignoring PKCE error");
              setStatus("success");
              setTimeout(() => router.replace("/dashboard"), 300);
              return;
            }
            
            setStatus("error");
            setErrorMsg(error.message);
            hasHandledCallback.current = false;
            return;
          }

          console.log("✅ PKCE success:", data.session?.user?.email);
          setStatus("success");
          setTimeout(() => router.replace("/dashboard"), 300);
          return;
        }

        console.warn("⚠️ No auth data");
        setStatus("error");
        setErrorMsg("Invalid callback");
        hasHandledCallback.current = false;

      } catch (err: any) {
        console.error("❌ Deep link error:", err);
        
        // ✅ Final fallback
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log("✅ Session exists despite error");
          setStatus("success");
          setTimeout(() => router.replace("/dashboard"), 300);
        } else {
          setStatus("error");
          setErrorMsg(err.message || "Unknown error");
          hasHandledCallback.current = false;
        }
      }
    };

    const setupListeners = async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Handle callbacks
      await handleWebCallback();

      // Register deep link
      listenerHandle = await App.addListener("appUrlOpen", handleDeepLink);
      console.log("✅ Deep link listener registered");

      // ❌ HAPUS INI - Ini yang bikin loop!
      // const { data: { session } } = await supabase.auth.getSession();
      // if (session) {
      //   router.replace("/dashboard");
      // }
    };

    setupListeners();

    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("🔄 Auth state:", event);
      
      // ✅ Hanya redirect kalau SIGNED_IN, bukan INITIAL_SESSION
      if (event === "SIGNED_IN" && session && !hasHandledCallback.current) {
        console.log("✅ User signed in");
        setStatus("success");
        router.replace("/dashboard");
      }
    });

    return () => {
      if (listenerHandle) listenerHandle.remove();
      subscription.unsubscribe();
    };
  }, [router, searchParams]);

  if (status === "processing") {
    return (
      <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-slate-800 border border-slate-700 p-8 rounded-2xl shadow-2xl text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg font-medium">Memproses login...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-slate-800 border border-red-500/50 p-8 rounded-2xl shadow-2xl max-w-md">
          <div className="text-center">
            <div className="text-5xl mb-4">❌</div>
            <h3 className="text-white text-xl font-bold mb-2">Login Gagal</h3>
            <p className="text-slate-300 text-sm mb-4">{errorMsg}</p>
            <button
              onClick={() => {
                setStatus("idle");
                setErrorMsg("");
                hasHandledCallback.current = false;
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}