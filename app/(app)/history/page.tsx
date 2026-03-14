import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: trips } = await supabase
    .from("trips")
    .select("*")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false });

  return (
    <main className="min-h-screen p-4 max-w-lg mx-auto">
      <header className="py-4 mb-6">
        <Link href="/dashboard" className="text-slate-400 text-sm hover:text-white">
          ← Dashboard
        </Link>
        <h1 className="text-xl font-bold text-white mt-2">Semua Perjalanan</h1>
        <p className="text-slate-400 text-sm">{trips?.length ?? 0} perjalanan</p>
      </header>

      {!trips?.length ? (
        <div className="text-center text-slate-500 py-16">
          <div className="text-4xl mb-3">🗺️</div>
          <p>Belum ada perjalanan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map((trip) => {
            const duration = trip.ended_at
              ? Math.round((new Date(trip.ended_at).getTime() - new Date(trip.started_at).getTime()) / 60000)
              : null;
            return (
              <Link key={trip.id} href={`/trip/${trip.id}`}
                className="block bg-slate-800 border border-slate-700 hover:border-slate-500 rounded-xl p-4 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-white">
                      {trip.title ?? "Perjalanan tanpa judul"}
                    </p>
                    <p className="text-slate-400 text-xs mt-1">
                      {new Date(trip.started_at).toLocaleDateString("id-ID", {
                        weekday: "long", day: "numeric", month: "long", year: "numeric"
                      })}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-green-400 font-semibold">{trip.distance_km.toFixed(1)} km</p>
                    {duration !== null && (
                      <p className="text-slate-500 text-xs">{duration} menit</p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
