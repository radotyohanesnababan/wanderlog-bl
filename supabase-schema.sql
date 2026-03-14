-- ============================================
-- WanderLog BL - Supabase Schema
-- Jalankan di Supabase SQL Editor
-- ============================================

-- Enable PostGIS (opsional, untuk query geolokasi advanced)
-- create extension if not exists postgis;

-- ============================================
-- Tabel: profiles
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  avatar_url text,
  created_at timestamptz default now() not null
);

-- Trigger: auto-create profile saat user pertama login
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- Tabel: trips
-- ============================================
create table public.trips (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text,
  started_at timestamptz not null,
  ended_at timestamptz,
  distance_km float4 default 0 not null,
  created_at timestamptz default now() not null
);

create index trips_user_id_idx on public.trips(user_id);
create index trips_started_at_idx on public.trips(started_at desc);

-- ============================================
-- Tabel: trip_points
-- ============================================
create table public.trip_points (
  id bigint generated always as identity primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  lat float8 not null,
  lng float8 not null,
  recorded_at timestamptz not null
);

create index trip_points_trip_id_idx on public.trip_points(trip_id);

-- ============================================
-- Tabel: places
-- ============================================
create table public.places (
  id uuid default gen_random_uuid() primary key,
  trip_id uuid references public.trips(id) not null,
  user_id uuid references public.profiles(id) not null,
  name text not null,
  category text not null check (category in ('food', 'recreation', 'public_space')),
  lat float8 not null,
  lng float8 not null,
  from_maps boolean default true not null,
  osm_id text,
  created_at timestamptz default now() not null
);

create index places_trip_id_idx on public.places(trip_id);
create index places_user_id_idx on public.places(user_id);

-- ============================================
-- Tabel: reviews
-- ============================================
create table public.reviews (
  id uuid default gen_random_uuid() primary key,
  place_id uuid references public.places(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  rating int2 not null check (rating between 1 and 5),
  notes text,
  is_public boolean default false not null,
  visited_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(place_id, user_id)
);

create index reviews_place_id_idx on public.reviews(place_id);

-- ============================================
-- Tabel: photos
-- ============================================
create table public.photos (
  id uuid default gen_random_uuid() primary key,
  place_id uuid references public.places(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  storage_path text not null,
  storage_url text not null,
  created_at timestamptz default now() not null
);

create index photos_place_id_idx on public.photos(place_id);

-- ============================================
-- RLS Policies
-- ============================================

-- Profiles
alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Trips
alter table public.trips enable row level security;
create policy "Users can CRUD own trips" on public.trips for all using (auth.uid() = user_id);

-- Trip Points
alter table public.trip_points enable row level security;
create policy "Users can manage own trip points" on public.trip_points for all
  using (exists (select 1 from public.trips where trips.id = trip_id and trips.user_id = auth.uid()));

-- Places
alter table public.places enable row level security;
create policy "Users can manage own places" on public.places for all using (auth.uid() = user_id);

-- Reviews
alter table public.reviews enable row level security;
create policy "Users can manage own reviews" on public.reviews for all using (auth.uid() = user_id);
create policy "Anyone can view public reviews" on public.reviews for select using (is_public = true);

-- Photos
alter table public.photos enable row level security;
create policy "Users can manage own photos" on public.photos for all using (auth.uid() = user_id);
