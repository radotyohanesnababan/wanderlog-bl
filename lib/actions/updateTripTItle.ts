"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateTripTitle(tripId: string, title: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi" };

  const { error } = await supabase
    .from("trips")
    .update({ title: title || null })
    .eq("id", tripId)
    .eq("user_id", user.id);

  revalidatePath("/dashboard");
  revalidatePath("/history");
  return { error: error?.message ?? null };
}