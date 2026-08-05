import { supabase } from "./supabase";
import type {
  Petition,
  PetitionInsert,
  TrendingPetition,
  NearbyPetition,
} from "../types/database.types";

/**
 * Trending petitions, ranked by signatures gained in the last 48h.
 * Only ever returns 'green' (verified) petitions — enforced by the
 * trending_petitions view itself, and by RLS as a second layer.
 */
export async function getTrendingPetitions(
  limit = 20
): Promise<TrendingPetition[]> {
  const { data, error } = await supabase
    .from("trending_petitions")
    .select("*")
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

/**
 * Petitions within `radiusKm` of a given point, nearest first, with
 * signature counts and distance included.
 * Backed by the nearby_petitions() Postgres function (PostGIS).
 */
export async function getNearbyPetitions(
  lat: number,
  lng: number,
  radiusKm = 10
): Promise<NearbyPetition[]> {
  const { data, error } = await supabase.rpc("nearby_petitions", {
    lat,
    lng,
    radius_km: radiusKm,
  });

  if (error) throw error;
  return data ?? [];
}

/**
 * Creates a new petition. Always lands in 'pending' status (DB default)
 * until an admin reviews it — the client never sets status directly.
 */
export async function createPetition(
  input: PetitionInsert
): Promise<Petition> {
  const { data, error } = await supabase
    .from("petitions")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Signs a petition as the current user. RLS also enforces that the
 * target petition must be 'green' — this check is just a fast client-side
 * guard so the UI can fail early with a clear message.
 */
export async function signPetition(
  petitionId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("signatures")
    .insert({ petition_id: petitionId, user_id: userId });

  if (error) {
    if (error.code === "23505") {
      throw new Error("You've already signed this petition.");
    }
    throw error;
  }
}

/**
 * Fetches a single petition owned by the current user, regardless of
 * status — lets a creator track pending/green/red on their own dashboard.
 */
export async function getMyPetition(petitionId: string): Promise<Petition> {
  const { data, error } = await supabase
    .from("petitions")
    .select("*")
    .eq("id", petitionId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetches every petition created by the given user, regardless of status,
 * newest first. Used by the creator's dashboard.
 */
export async function getMyPetitions(userId: string): Promise<Petition[]> {
  const { data, error } = await supabase
    .from("petitions")
    .select("*")
    .eq("creator_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Petition ids the given user has already signed. Used by the public feed
 * to render "Signed" instead of a clickable Sign button.
 */
export async function getMySignedPetitionIds(
  userId: string
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("signatures")
    .select("petition_id")
    .eq("user_id", userId);

  if (error) throw error;
  return new Set((data ?? []).map((row) => row.petition_id));
}

/**
 * Fetches every petition awaiting review, oldest first (so admins clear
 * the queue in the order things came in). Only visible to admins under RLS.
 */
export async function getPendingPetitions(): Promise<Petition[]> {
  const { data, error } = await supabase
    .from("petitions")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Approves a pending petition: flips it to 'green' and logs the action.
 */
export async function approvePetition(
  petitionId: string,
  adminId: string
): Promise<void> {
  const { error: updateError } = await supabase
    .from("petitions")
    .update({ status: "green" })
    .eq("id", petitionId);

  if (updateError) throw updateError;

  const { error: logError } = await supabase.from("admin_actions").insert({
    petition_id: petitionId,
    admin_id: adminId,
    action: "approved",
    note: null,
  });

  if (logError) throw logError;
}

/**
 * Rejects a pending petition: flips it to 'red', stores the reason as
 * admin_note on the petition, and logs the action.
 */
export async function rejectPetition(
  petitionId: string,
  adminId: string,
  note: string
): Promise<void> {
  const { error: updateError } = await supabase
    .from("petitions")
    .update({ status: "red", admin_note: note })
    .eq("id", petitionId);

  if (updateError) throw updateError;

  const { error: logError } = await supabase.from("admin_actions").insert({
    petition_id: petitionId,
    admin_id: adminId,
    action: "rejected",
    note,
  });

  if (logError) throw logError;
}
