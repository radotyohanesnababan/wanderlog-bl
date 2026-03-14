import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase =  await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch recent trips
  const { data: trips } = await supabase
    .from("trips")
    .select("*")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(5);

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <main className="min-h-screen p-4 max-w-lg mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between py-4 mb-6">
        <div>
          <p className="text-slate-400 text-sm">Halo,</p>
          <h1 className="text-xl font-bold text-white">
            {profile?.full_name?.split(" ")[0] ?? "Wander"}! 👋
          </h1>
        </div>
        <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden">
          {profile?.avatar_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          )}
        </div>
      </header>

      {/* Start Trip CTA */}
      <Link href="/track"
        className="block w-full bg-green-500 hover:bg-green-600 text-white font-semibold rounded-2xl p-6 text-center transition-colors mb-6 shadow-lg shadow-green-900/30">
        <div className="text-3xl mb-1">🚶</div>
        <div className="text-lg">Mulai Perjalanan</div>
        <div className="text-green-100 text-sm mt-1">Tap untuk start tracking GPS</div>
      </Link>

      {/* Recent Trips */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white">Perjalanan Terakhir</h2>
          <Link href="/history" className="text-green-400 text-sm hover:text-green-300">
            Lihat semua
          </Link>
        </div>

        {!trips?.length ? (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center text-slate-500">
            <div className="text-3xl mb-2">🗺️</div>
            <p className="text-sm">Belum ada perjalanan</p>
            <p className="text-xs mt-1">Mulai perjalanan pertamamu!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {trips.map((trip) => (
              <Link key={trip.id} href={`/trip/${trip.id}`}
                className="block bg-slate-800 border border-slate-700 hover:border-slate-500 rounded-xl p-4 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white text-sm">
                      {trip.title ?? "Perjalanan tanpa judul"}
                    </p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {new Date(trip.started_at).toLocaleDateString("id-ID", {
                        weekday: "short", day: "numeric", month: "short"
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 text-sm font-medium">
                      {trip.distance_km.toFixed(1)} km
                    </p>
                    {trip.ended_at && (
                      <p className="text-slate-500 text-xs">Selesai</p>
                    )}
                    {!trip.ended_at && (
                      <p className="text-yellow-400 text-xs">● Aktif</p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
