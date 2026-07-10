// Generated from the connected Supabase project on 2026-07-10.
export type Database = {
  public: {
    Tables: {
      household_members: { Row: { household_id: string; user_id: string; role: 'owner' | 'member'; joined_at: string }; Insert: never; Update: never; Relationships: [] };
      stores: { Row: { id: string; household_id: string; name: string; address: string | null; updated_at: string; deleted_at: string | null }; Insert: { id: string; household_id: string; name: string; address?: string | null; updated_at?: string; deleted_at?: string | null }; Update: Partial<Database['public']['Tables']['stores']['Insert']>; Relationships: [] };
      shopping_lists: { Row: { id: string; household_id: string; name: string; budget: number | null; currency: string; store_id: string | null; created_at: string; updated_at: string; deleted_at: string | null }; Insert: { id: string; household_id: string; name: string; budget?: number | null; currency?: string; store_id?: string | null; created_at?: string; updated_at?: string; deleted_at?: string | null }; Update: Partial<Database['public']['Tables']['shopping_lists']['Insert']>; Relationships: [] };
      shopping_items: { Row: { id: string; household_id: string; list_id: string; name: string; catalog_id: string | null; category: string; price: number | null; quantity: number; is_purchased: boolean; photo_path: string | null; created_at: string; updated_at: string; deleted_at: string | null }; Insert: { id: string; household_id: string; list_id: string; name: string; catalog_id?: string | null; category?: string; price?: number | null; quantity?: number; is_purchased?: boolean; photo_path?: string | null; created_at?: string; updated_at?: string; deleted_at?: string | null }; Update: Partial<Database['public']['Tables']['shopping_items']['Insert']>; Relationships: [] };
      profiles: { Row: { id: string; display_name: string | null; created_at: string; updated_at: string }; Insert: never; Update: never; Relationships: [] };
      households: { Row: { id: string; name: string; created_by: string; created_at: string; updated_at: string; deleted_at: string | null }; Insert: never; Update: never; Relationships: [] };
      household_invites: { Row: { id: string; household_id: string; token: string; expires_at: string; created_by: string; accepted_by: string | null; accepted_at: string | null; revoked_at: string | null; created_at: string }; Insert: never; Update: never; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: {
      bootstrap_household: { Args: { household_name?: string }; Returns: string };
      create_household_invite: { Args: { target: string }; Returns: { token: string; expires_at: string }[] };
      accept_household_invite: { Args: { invite_token: string }; Returns: string };
      is_household_member: { Args: { target: string }; Returns: boolean };
      is_household_owner: { Args: { target: string }; Returns: boolean };
    };
    Enums: { household_role: 'owner' | 'member' };
    CompositeTypes: Record<string, never>;
  };
};
