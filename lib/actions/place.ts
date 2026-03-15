"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addPlace(data: {
  tripId: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  fromMaps: boolean;
  osmId?: string;
}): Promise<{ placeId: string | null; error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { placeId: null, error: "Tidak terautentikasi" };

  const { data: place, error } = await supabase
    .from("places")
    .insert({
      trip_id: data.tripId,
      user_id: user.id,
      name: data.name,
      category: data.category,
      lat: data.lat,
      lng: data.lng,
      from_maps: data.fromMaps,
      osm_id: data.osmId ?? null,
    })
    .select("id")
    .single();

  if (error) return { placeId: null, error: error.message };
  return { placeId: place.id, error: null };
}

export async function saveReview(data: {
  placeId: string;
  rating: number;
  notes?: string;
  isPublic?: boolean;
}): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi" };

  const { error } = await supabase
    .from("reviews")
    .upsert({
      place_id: data.placeId,
      user_id: user.id,
      rating: data.rating,
      notes: data.notes ?? null,
      is_public: data.isPublic ?? false,
      updated_at: new Date().toISOString(),
    }, { onConflict: "place_id,user_id" });

  if (error) return { error: error.message };
  revalidatePath("/trip/[id]", "page");
  return { error: null };
}

export async function uploadPhoto(
  placeId: string,
  file: FormData
): Promise<{ url: string | null; error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { url: null, error: "Tidak terautentikasi" };

  const photo = file.get("photo") as File;
  if (!photo) return { url: null, error: "File tidak ditemukan" };

  const ext = photo.name.split(".").pop();
  const path = `${user.id}/${placeId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("photos")
    .upload(path, photo, { contentType: photo.type });

  if (uploadError) return { url: null, error: uploadError.message };

  const { data: { publicUrl } } = supabase.storage
    .from("photos")
    .getPublicUrl(path);

  const { error: dbError } = await supabase.from("photos").insert({
    place_id: placeId,
    user_id: user.id,
    storage_path: path,
    storage_url: publicUrl,
  });

  if (dbError) return { url: null, error: dbError.message };
  return { url: publicUrl, error: null };
}

export async function deletePlace(placeId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi" };

  const { error } = await supabase
    .from("places")
    .delete()
    .eq("id", placeId)
    .eq("user_id", user.id);

  return { error: error?.message ?? null };
}