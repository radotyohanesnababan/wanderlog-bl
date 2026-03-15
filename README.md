# 🗺️ WanderLog BL

Travel Journal PWA berbasis lokasi untuk Bandar Lampung.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (Google OAuth)
- **Maps**: Leaflet.js + OpenStreetMap
- **Styling**: Tailwind CSS
- **PWA**: next-pwa
- **Deploy**: Vercel

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/username/wanderlog-bl.git
cd wanderlog-bl
npm install
```

### 2. Setup Supabase

1. Buat project baru di [supabase.com](https://supabase.com)
2. Jalankan `supabase-schema.sql` di SQL Editor Supabase
3. Setup Google OAuth di Authentication → Providers → Google
4. Tambahkan `http://localhost:3000/auth/callback` ke Redirect URLs

### 3. Environment Variables

```bash
cp .env.local.example .env.local
```

Isi dengan kredensial Supabase kamu.

### 4. Run Development

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

## Struktur Folder

```
wanderlog-bl/
├── app/
│   ├── (auth)/login/        # Halaman login
│   ├── (auth)/callback/     # OAuth callback
│   ├── (app)/dashboard/     # Dashboard utama
│   ├── (app)/track/         # Live GPS tracking
│   ├── (app)/trip/[id]/     # Detail perjalanan
│   └── (app)/history/       # List semua trip
├── components/
│   ├── map/                 # Komponen Leaflet
│   ├── trip/                # Komponen trip
│   └── ui/                  # Komponen UI umum
├── lib/supabase/            # Supabase client setup
├── types/                   # TypeScript types
└── supabase-schema.sql      # Schema database
```

## Roadmap

- [x] Phase 1: Project Setup
- [x] Phase 2: Database Schema + RLS
- [x] Phase 3: Auth UI (Google OAuth)
- [x] Phase 4: GPS Tracking
- [x] Phase 5: Peta & Rute (Leaflet)
- [x] Phase 6: Place & Review
- [x] Phase 7: History
- [x] Phase 8: PWA Config
- [x] Phase 9: Public Review

## Deploy ke Vercel

```bash
vercel
```

Tambahkan environment variables di dashboard Vercel.
