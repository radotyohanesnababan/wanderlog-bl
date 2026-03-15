'use client';

export default function OfflinePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-slate-900">
      <div className="text-6xl mb-6">📡</div>
      <h1 className="text-2xl font-bold text-white mb-2">Kamu sedang offline</h1>
      <p className="text-slate-400 text-sm max-w-xs mb-8">
        Koneksi internet tidak tersedia. Beberapa fitur membutuhkan koneksi untuk berfungsi.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
      >
        Coba Lagi
      </button>
    </main>
  );
}