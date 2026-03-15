"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import StarRating from "@/components/ui/StarRating";
import { addPlace, saveReview, uploadPhoto } from "@/lib/actions/place";

type Step = "trip" | "place" | "review";
type Category = "food" | "recreation" | "public_space";

interface Trip {
  id: string;
  title: string | null;
  started_at: string;
  distance_km: number;
}

const categories: { value: Category; label: string; emoji: string }[] = [
  { value: "food", label: "Tempat Makan", emoji: "🍜" },
  { value: "recreation", label: "Rekreasi", emoji: "🎡" },
  { value: "public_space", label: "Ruang Publik", emoji: "🌳" },
];

export default function AddPlacePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("trip");

  // Step 1 - pilih trip
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  // Step 2 - isi tempat
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("food");
  const [address, setAddress] = useState("");

  // Step 3 - review
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [savedPlaceId, setSavedPlaceId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch trips
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      supabase
        .from("trips")
        .select("id, title, started_at, distance_km")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .then(({ data }) => {
          setTrips(data ?? []);
          setLoadingTrips(false);
        });
    });
  }, [router]);

  async function handleSavePlace() {
    if (!selectedTrip) return;
    if (!name.trim()) { setError("Nama tempat wajib diisi"); return; }
    setLoading(true); setError(null);

    const { placeId, error } = await addPlace({
      tripId: selectedTrip.id,
      name: name.trim(),
      category,
      lat: -5.42 + (Math.random() - 0.5) * 0.01,
      lng: 105.26 + (Math.random() - 0.5) * 0.01,
      fromMaps: false,
    });

    if (error || !placeId) { setError(error ?? "Gagal menyimpan"); setLoading(false); return; }
    setSavedPlaceId(placeId);
    setLoading(false);
    setStep("review");
  }

  async function handleSaveReview() {
    if (!savedPlaceId) return;
    if (rating === 0) { setError("Pilih rating dulu"); return; }
    setLoading(true); setError(null);

    const { error: reviewError } = await saveReview({
      placeId: savedPlaceId,
      rating,
      notes: notes.trim() || undefined,
    });

    if (reviewError) { setError(reviewError); setLoading(false); return; }

    if (photoFile) {
      const formData = new FormData();
      formData.append("photo", photoFile);
      await uploadPhoto(savedPlaceId, formData);
    }

    setLoading(false);
    router.push(`/trip/${selectedTrip!.id}`);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 1200;
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) setPhotoFile(new File([blob], file.name, { type: "image/jpeg" }));
        }, "image/jpeg", 0.8);
        setPhotoPreview(ev.target?.result as string);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  // Step indicator
  const steps = ["Pilih Trip", "Isi Tempat", "Review"];
  const stepIndex = { trip: 0, place: 1, review: 2 }[step];

  return (
    <main className="min-h-screen bg-slate-900 max-w-lg mx-auto">
      {/* Header */}
      <header className="flex items-center gap-4 px-4 pt-4 pb-4 border-b border-slate-800">
        <Link href="/dashboard" className="text-slate-400 hover:text-white">←</Link>
        <h1 className="text-white font-semibold">Tambah Tempat</h1>
      </header>

      {/* Step indicator */}
      <div className="flex items-center px-4 py-4 gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
              i < stepIndex ? "bg-green-500 text-white" :
              i === stepIndex ? "bg-green-500 text-white" :
              "bg-slate-700 text-slate-400"
            }`}>
              {i < stepIndex ? "✓" : i + 1}
            </div>
            <span className={`text-xs flex-1 ${i === stepIndex ? "text-white" : "text-slate-500"}`}>{s}</span>
            {i < steps.length - 1 && (
              <div className={`h-px flex-1 ${i < stepIndex ? "bg-green-500" : "bg-slate-700"}`} />
            )}
          </div>
        ))}
      </div>

      <div className="px-4 pb-8 space-y-4">

        {/* Step 1: Pilih Trip */}
        {step === "trip" && (
          <>
            <p className="text-slate-400 text-sm">Pilih perjalanan tempat ini akan dicatat:</p>

            {loadingTrips ? (
              <div className="text-slate-500 text-sm text-center py-8">Memuat...</div>
            ) : trips.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <p className="text-slate-400 text-sm">Belum ada perjalanan.</p>
                <Link href="/track" className="text-green-400 text-sm hover:text-green-300">
                  Mulai perjalanan dulu →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {trips.map((trip) => (
                  <button
                    key={trip.id}
                    onClick={() => setSelectedTrip(trip)}
                    className={`w-full text-left p-4 rounded-xl border transition-colors ${
                      selectedTrip?.id === trip.id
                        ? "bg-green-500/10 border-green-500"
                        : "bg-slate-800 border-slate-700 hover:border-slate-500"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium text-sm">
                          {trip.title ?? "Perjalanan tanpa judul"}
                        </p>
                        <p className="text-slate-400 text-xs mt-0.5">
                          {new Date(trip.started_at).toLocaleDateString("id-ID", {
                            day: "numeric", month: "short", year: "numeric"
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 text-sm">{trip.distance_km.toFixed(1)} km</p>
                        {selectedTrip?.id === trip.id && (
                          <span className="text-green-400 text-xs">✓ Dipilih</span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => { if (selectedTrip) { setStep("place"); setError(null); } else setError("Pilih trip dulu"); }}
              disabled={!selectedTrip}
              className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-colors"
            >
              Lanjut →
            </button>
            {error && <p className="text-red-400 text-sm">{error}</p>}
          </>
        )}

        {/* Step 2: Isi Tempat */}
        {step === "place" && (
          <>
            <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm">
              <span className="text-slate-400">Trip: </span>
              <span className="text-white">{selectedTrip?.title ?? "Perjalanan tanpa judul"}</span>
            </div>

            <div>
              <label className="text-slate-300 text-sm font-medium block mb-1.5">Nama Tempat *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="cth: Warung Bu Sari"
                className="w-full bg-slate-800 border border-slate-600 focus:border-green-500 outline-none text-white rounded-xl px-4 py-3 text-sm placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="text-slate-300 text-sm font-medium block mb-1.5">Alamat (opsional)</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="cth: Jl. Sultan Agung No. 12"
                className="w-full bg-slate-800 border border-slate-600 focus:border-green-500 outline-none text-white rounded-xl px-4 py-3 text-sm placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="text-slate-300 text-sm font-medium block mb-1.5">Kategori</label>
              <div className="grid grid-cols-3 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`py-3 rounded-xl text-sm font-medium transition-colors border ${
                      category === cat.value
                        ? "bg-green-500/20 border-green-500 text-green-400"
                        : "bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-400"
                    }`}
                  >
                    <div className="text-xl mb-0.5">{cat.emoji}</div>
                    <div className="text-xs">{cat.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => { setStep("trip"); setError(null); }}
                className="flex-1 border border-slate-600 text-slate-300 font-semibold py-3 rounded-xl"
              >
                ← Kembali
              </button>
              <button
                onClick={handleSavePlace}
                disabled={loading}
                className="flex-[2] bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {loading ? "Menyimpan..." : "Lanjut ke Review →"}
              </button>
            </div>
          </>
        )}

        {/* Step 3: Review */}
        {step === "review" && (
          <>
            <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm">
              <span className="text-slate-400">Tempat: </span>
              <span className="text-white">{name}</span>
            </div>

            <div>
              <label className="text-slate-300 text-sm font-medium block mb-2">Rating *</label>
              <StarRating value={rating} onChange={setRating} size="lg" />
            </div>

            <div>
              <label className="text-slate-300 text-sm font-medium block mb-1.5">Catatan (opsional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Kesan atau catatan tentang tempat ini..."
                rows={3}
                className="w-full bg-slate-800 border border-slate-600 focus:border-green-500 outline-none text-white rounded-xl px-4 py-3 text-sm placeholder:text-slate-500 resize-none"
              />
            </div>

            <div>
              <label className="text-slate-300 text-sm font-medium block mb-1.5">Foto (opsional)</label>
              {photoPreview ? (
                <div className="relative">
                  <img src={photoPreview} alt="preview" className="w-full h-40 object-cover rounded-xl" />
                  <button
                    onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center"
                  >✕</button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 w-full h-24 bg-slate-800 border border-dashed border-slate-600 hover:border-slate-400 rounded-xl cursor-pointer transition-colors text-slate-400 text-sm">
                  📷 Tambah foto
                  <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
                </label>
              )}
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => router.push(`/trip/${selectedTrip!.id}`)}
                className="flex-1 border border-slate-600 text-slate-300 font-semibold py-3 rounded-xl"
              >
                Lewati
              </button>
              <button
                onClick={handleSaveReview}
                disabled={loading}
                className="flex-[2] bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {loading ? "Menyimpan..." : "Simpan ✓"}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}