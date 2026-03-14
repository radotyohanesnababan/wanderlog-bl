"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function startTrip(): Promise<{ tripId: string | null; error: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { tripId: null, error: "Tidak terautentikasi" };

  const { data, error } = await supabase
    .from("trips")
    .insert({
      user_id: user.id,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) return { tripId: null, error: error.message };
  return { tripId: data.id, error: null };
}

export async function stopTrip(
  tripId: string,
  distanceKm: number
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi" };

  const { error } = await supabase
    .from("trips")
    .update({
      ended_at: new Date().toISOString(),
      distance_km: distanceKm,
    })
    .eq("id", tripId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/history");
  return { error: null };
}

export async function saveTripPoints(
  tripId: string,
  points: Array<{ lat: number; lng: number; recorded_at: string }>
): Promise<{ error: string | null }> {
  const supabase = createClient();

  const { error } = await supabase.from("trip_points").insert(
    points.map((p) => ({ trip_id: tripId, ...p }))
  );

  return { error: error?.message ?? null };
}

export async function updateTripDistance(
  tripId: string,
  distanceKm: number
): Promise<{ error: string | null }> {
  const supabase = createClient();

  const { error } = await supabase
    .from("trips")
    .update({ distance_km: distanceKm })
    .eq("id", tripId);

  return { error: error?.message ?? null };
}
