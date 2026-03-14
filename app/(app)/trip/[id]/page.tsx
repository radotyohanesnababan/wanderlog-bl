import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";

const TripRouteMap = dynamic(() => import("@/components/map/TripRouteMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 text-sm">
      Memuat peta...
    </div>
  ),
});

export default async function TripDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: trip } = await supabase
    .from("trips")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!trip) notFound();

  const { data: places } = await supabase
    .from("places")
    .select("*, reviews(*)")
    .eq("trip_id", trip.id);

  const { data: tripPoints } = await supabase
    .from("trip_points")
    .select("lat, lng")
    .eq("trip_id", trip.id)
    .order("recorded_at", { ascending: true })
    .limit(1000); // max 1000 titik untuk performa

  const categoryLabel: Record<string, string> = {
    food: "🍜 Tempat Makan",
    recreation: "🎡 Rekreasi",
    public_space: "🌳 Ruang Publik",
  };

  return (
    <main className="min-h-screen p-4 max-w-lg mx-auto">
      <header className="py-4 mb-4">
        <Link href="/history" className="text-slate-400 text-sm hover:text-white">
          ← History
        </Link>
        <h1 className="text-xl font-bold text-white mt-2">
          {trip.title ?? "Perjalanan tanpa judul"}
        </h1>
        <p className="text-slate-400 text-sm">
          {new Date(trip.started_at).toLocaleDateString("id-ID", {
            weekday: "long", day: "numeric", month: "long", year: "numeric"
          })}
        </p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Jarak", value: `${trip.distance_km.toFixed(1)} km` },
          { label: "Tempat", value: `${places?.length ?? 0}` },
          { label: "Status", value: trip.ended_at ? "Selesai" : "Aktif" },
        ].map((stat) => (
          <div key={stat.label} className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-center">
            <p className="text-white font-semibold text-lg">{stat.value}</p>
            <p className="text-slate-400 text-xs">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Map */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl h-56 mb-6 overflow-hidden">
        <TripRouteMap
          points={tripPoints ?? []}
          places={(places ?? []).map((p) => ({
            lat: p.lat,
            lng: p.lng,
            name: p.name,
            category: p.category,
          }))}
        />
      </div>

      {/* Places */}
      <section>
        <h2 className="font-semibold text-white mb-3">
          Tempat yang Dikunjungi ({places?.length ?? 0})
        </h2>
        {!places?.length ? (
          <p className="text-slate-500 text-sm">Belum ada tempat yang dipin</p>
        ) : (
          <div className="space-y-3">
            {places.map((place) => (
              <div key={place.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-white">{place.name}</p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {categoryLabel[place.category] ?? place.category}
                    </p>
                  </div>
                  {place.reviews?.[0] && (
                    <div className="flex items-center gap-1 text-yellow-400 text-sm">
                      ⭐ {place.reviews[0].rating}
                    </div>
                  )}
                </div>
                {place.reviews?.[0]?.notes && (
                  <p className="text-slate-400 text-xs mt-2 italic">
                    "{place.reviews[0].notes}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
