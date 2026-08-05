// Hand-written to match supabase/migrations/0001_init.sql.
// Once the project is live, regenerate from the real DB with:
//   supabase gen types typescript --project-id <id> > src/types/database.types.ts

export type UserRole = "regular_user" | "admin";
export type PetitionStatus = "pending" | "green" | "red" | "closed";

export type Profile = {
  id: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

export type Petition = {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  category: string | null;
  lat: number | null;
  lng: number | null;
  location_label: string | null;
  evidence_urls: string[];
  status: PetitionStatus;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export type TrendingPetition = Petition & {
  recent_signatures: number;
  total_signatures: number;
}

export type NearbyPetition = Petition & {
  total_signatures: number;
  distance_km: number;
}

export type Signature = {
  id: string;
  petition_id: string;
  user_id: string;
  created_at: string;
}

export type AdminActionType = "approved" | "rejected" | "closed";

export type AdminAction = {
  id: string;
  petition_id: string;
  admin_id: string;
  action: AdminActionType;
  note: string | null;
  created_at: string;
}

// ---- Insert helper types (fields the client actually supplies) ----

export type PetitionInsert = Pick<
  Petition,
  "title" | "description" | "creator_id"
> &
  Partial<Pick<Petition, "category" | "lat" | "lng" | "location_label" | "evidence_urls">>;

export type SignatureInsert = Pick<Signature, "petition_id" | "user_id">;

// ---- Supabase Database generic (for createClient<Database>()) ----

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      petitions: {
        Row: Petition;
        Insert: PetitionInsert;
        Update: Partial<Petition>;
        Relationships: [];
      };
      signatures: {
        Row: Signature;
        Insert: SignatureInsert;
        Update: Partial<Signature>;
        Relationships: [];
      };
      admin_actions: {
        Row: AdminAction;
        Insert: Omit<AdminAction, "id" | "created_at">;
        Update: Partial<AdminAction>;
        Relationships: [];
      };
    };
    Views: {
      trending_petitions: {
        Row: TrendingPetition;
        Relationships: [];
      };
    };
    Functions: {
      nearby_petitions: {
        Args: { lat: number; lng: number; radius_km?: number };
        Returns: NearbyPetition[];
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
  };
}
