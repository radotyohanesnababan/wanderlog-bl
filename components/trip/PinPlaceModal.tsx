"use client";

import { useState } from "react";
import StarRating from "@/components/ui/StarRating";
import { addPlace, saveReview, uploadPhoto } from "@/lib/actions/place";

interface PinPlaceModalProps {
  tripId: string;
  lat: number;
  lng: number;
  onClose: () => void;
  onSaved: (placeId: string, name: string) => void;
}

type Category = "food" | "recreation" | "public_space";

const categories: { value: Category; label: string; emoji: string }[] = [
  { value: "food", label: "Tempat Makan", emoji: "🍜" },
  { value: "recreation", label: "Rekreasi", emoji: "🎡" },
  { value: "public_space", label: "Ruang Publik", emoji: "🌳" },
];

export default function PinPlaceModal({
  tripId,
  lat,
  lng,
  onClose,
  onSaved,
}: PinPlaceModalProps) {
  const [step, setStep] = useState<"place" | "review">("place");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("food");
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedPlaceId, setSavedPlaceId] = useState<string | null>(null);

  async function handleSavePlace() {
    if (!name.trim()) {
      setError("Nama tempat wajib diisi");
      return;
    }
    setLoading(true);
    setError(null);

    const { placeId, error } = await addPlace({
      tripId,
      name: name.trim(),
      category,
      lat,
      lng,
      fromMaps: false,
    });

    if (error || !placeId) {
      setError(error ?? "Gagal menyimpan tempat");
      setLoading(false);
      return;
    }

    setSavedPlaceId(placeId);
    setLoading(false);
    setStep("review");
  }

  async function handleSaveReview() {
    if (!savedPlaceId) return;
    if (rating === 0) {
      setError("Pilih rating dulu");
      return;
    }

    setLoading(true);
    setError(null);

    const { error: reviewError } = await saveReview({
      placeId: savedPlaceId,
      rating,
      notes: notes.trim() || undefined,
    });

    if (reviewError) {
      setError(reviewError);
      setLoading(false);
      return;
    }

    // Upload foto jika ada
    if (photoFile) {
      const formData = new FormData();
      formData.append("photo", photoFile);
      await uploadPhoto(savedPlaceId, formData);
    }

    setLoading(false);
    onSaved(savedPlaceId, name);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Compress via canvas sebelum upload
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 1200;
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const compressed = new File([blob], file.name, { type: "image/jpeg" });
            setPhotoFile(compressed);
          }
        }, "image/jpeg", 0.8);
        setPhotoPreview(ev.target?.result as string);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 z-[9999] bg-black/60" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full max-w-lg bg-slate-900 border-t border-slate-700 rounded-t-3xl p-6 pb-8 space-y-5 animate-slide-up z-[9999]">
        {/* Handle */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-slate-600 rounded-full" />

        {step === "place" ? (
          <>
            <div className="flex items-center justify-between pt-2">
              <h2 className="text-lg font-bold text-white">📍 Pin Tempat</h2>
              <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>

            <p className="text-slate-500 text-xs">
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </p>

            {/* Nama */}
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-1.5">
                Nama Tempat *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="cth: Warung Bu Sari"
                className="w-full bg-slate-800 border border-slate-600 focus:border-green-500 outline-none text-white rounded-xl px-4 py-3 text-sm placeholder:text-slate-500"
              />
            </div>

            {/* Kategori */}
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-1.5">
                Kategori
              </label>
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

            <button
              onClick={handleSavePlace}
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-4 rounded-xl transition-colors"
            >
              {loading ? "Menyimpan..." : "Lanjut ke Review →"}
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between pt-2">
              <div>
                <h2 className="text-lg font-bold text-white">⭐ Review</h2>
                <p className="text-slate-400 text-sm">{name}</p>
              </div>
              <button
                onClick={() => onSaved(savedPlaceId!, name)}
                className="text-slate-400 hover:text-white text-sm"
              >
                Lewati
              </button>
            </div>

            {/* Rating */}
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-2">
                Rating *
              </label>
              <StarRating value={rating} onChange={setRating} size="lg" />
            </div>

            {/* Catatan */}
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-1.5">
                Catatan (opsional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Kesan atau catatan tentang tempat ini..."
                rows={3}
                className="w-full bg-slate-800 border border-slate-600 focus:border-green-500 outline-none text-white rounded-xl px-4 py-3 text-sm placeholder:text-slate-500 resize-none"
              />
            </div>

            {/* Foto */}
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-1.5">
                Foto (opsional)
              </label>
              {photoPreview ? (
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="preview"
                    className="w-full h-32 object-cover rounded-xl"
                  />
                  <button
                    onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 w-full h-24 bg-slate-800 border border-dashed border-slate-600 hover:border-slate-400 rounded-xl cursor-pointer transition-colors text-slate-400 text-sm">
                  📷 Tambah foto
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              onClick={handleSaveReview}
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-4 rounded-xl transition-colors"
            >
              {loading ? "Menyimpan..." : "Simpan ✓"}
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}