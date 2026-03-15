"use client";

import { useState } from "react";

interface TripTitleModalProps {
  onSave: (title: string) => void;
  onSkip: () => void;
}

export default function TripTitleModal({ onSave, onSkip }: TripTitleModalProps) {
  const [title, setTitle] = useState("");

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative w-full max-w-lg bg-slate-900 border-t border-slate-700 rounded-t-3xl p-6 pb-8 space-y-5 animate-slide-up">
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-slate-600 rounded-full" />
        <div className="pt-2">
          <h2 className="text-lg font-bold text-white">Beri nama perjalanan ini</h2>
          <p className="text-slate-400 text-sm mt-1">Opsional — bisa dilewati</p>
        </div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="cth: Jalan sore ke Way Halim"
          autoFocus
          className="w-full bg-slate-800 border border-slate-600 focus:border-green-500 outline-none text-white rounded-xl px-4 py-3 text-sm placeholder:text-slate-500"
        />
        <div className="flex gap-3">
          <button
            onClick={onSkip}
            className="flex-1 border border-slate-600 hover:border-slate-400 text-slate-300 font-semibold py-3 rounded-xl transition-colors"
          >
            Lewati
          </button>
          <button
            onClick={() => onSave(title.trim())}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Simpan
          </button>
        </div>
      </div>
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.25s ease-out; }
      `}</style>
    </div>
  );
}