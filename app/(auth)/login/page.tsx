import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LoginButton from "./LoginButton";
import AuthHandler from "./AuthHandler";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4"
    
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" }}>
      <AuthHandler />
      <div className="w-full max-w-sm text-center space-y-8">
        {/* Logo */}
        <div className="space-y-2">
          <div className="text-5xl">🗺️</div>
          <h1 className="text-3xl font-bold text-white tracking-tight">WanderLog BL</h1>
          <p className="text-slate-400 text-sm">
            Travel journal personal untuk Bandar Lampung
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 space-y-6 shadow-2xl">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-white">Masuk ke akun kamu</h2>
            <p className="text-slate-400 text-sm">Gunakan akun Google untuk melanjutkan</p>
          </div>
          <LoginButton />
        </div>

        <p className="text-slate-600 text-xs">
          Data perjalananmu bersifat privat by default
        </p>
      </div>
    </main>
  );
}
