import { supabase } from "./supabase";
import type { Profile } from "../types/database.types";

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

/**
 * Fetches the profiles row (including role) for the currently signed-in
 * user. Returns null if signed out or the profile row doesn't exist yet.
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) return null;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}
