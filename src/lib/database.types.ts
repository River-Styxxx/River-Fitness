// GENERATED from the live schema via Supabase (2026-08-18).
// Regenerate with: npm run gen:types  (do not hand-edit row shapes)
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.15" }
  public: {
    Tables: {
      app_release: {
        Row: { id: string; min_build: string; note: string | null; updated_at: string }
        Insert: { id: string; min_build: string; note?: string | null; updated_at?: string }
        Update: { id?: string; min_build?: string; note?: string | null; updated_at?: string }
        Relationships: []
      }
      attachments: {
        Row: { created_at: string; deleted_at: string | null; entity_id: string; entity_type: string; id: string; kind: string | null; storage_path: string; tenant_id: string }
        Insert: { created_at?: string; deleted_at?: string | null; entity_id: string; entity_type: string; id?: string; kind?: string | null; storage_path: string; tenant_id: string }
        Update: { created_at?: string; deleted_at?: string | null; entity_id?: string; entity_type?: string; id?: string; kind?: string | null; storage_path?: string; tenant_id?: string }
        Relationships: []
      }
      channel_members: {
        Row: { added_at: string; channel_id: string; removed_at: string | null; user_id: string }
        Insert: { added_at?: string; channel_id: string; removed_at?: string | null; user_id: string }
        Update: { added_at?: string; channel_id?: string; removed_at?: string | null; user_id?: string }
        Relationships: []
      }
      channel_types: { Row: { type: string }; Insert: { type: string }; Update: { type?: string }; Relationships: [] }
      channels: {
        Row: { created_at: string; deleted_at: string | null; id: string; name: string | null; tenant_id: string; type: string }
        Insert: { created_at?: string; deleted_at?: string | null; id?: string; name?: string | null; tenant_id: string; type: string }
        Update: { created_at?: string; deleted_at?: string | null; id?: string; name?: string | null; tenant_id?: string; type?: string }
        Relationships: []
      }
      client_reports: {
        Row: { client_id: string; created_at: string; deleted_at: string | null; id: string; period_end: string | null; period_start: string | null; published_at: string | null; status: string; tenant_id: string; title: string }
        Insert: { client_id: string; created_at?: string; deleted_at?: string | null; id?: string; period_end?: string | null; period_start?: string | null; published_at?: string | null; status?: string; tenant_id: string; title: string }
        Update: { client_id?: string; created_at?: string; deleted_at?: string | null; id?: string; period_end?: string | null; period_start?: string | null; published_at?: string | null; status?: string; tenant_id?: string; title?: string }
        Relationships: []
      }
      clients: {
        Row: { claimed_user_id: string | null; created_at: string; deleted_at: string | null; display_name: string; email: string | null; features: Json; id: string; region: string | null; start_date: string | null; tenant_id: string; timezone: string }
        Insert: { claimed_user_id?: string | null; created_at?: string; deleted_at?: string | null; display_name: string; email?: string | null; features?: Json; id: string; region?: string | null; start_date?: string | null; tenant_id: string; timezone?: string }
        Update: { claimed_user_id?: string | null; created_at?: string; deleted_at?: string | null; display_name?: string; email?: string | null; features?: Json; id?: string; region?: string | null; start_date?: string | null; tenant_id?: string; timezone?: string }
        Relationships: []
      }
      coach_clients: {
        Row: { client_id: string; coach_user_id: string; ended_at: string | null; id: string; started_at: string; tenant_id: string }
        Insert: { client_id: string; coach_user_id: string; ended_at?: string | null; id?: string; started_at?: string; tenant_id: string }
        Update: { client_id?: string; coach_user_id?: string; ended_at?: string | null; id?: string; started_at?: string; tenant_id?: string }
        Relationships: []
      }
      domains: { Row: { domain: string }; Insert: { domain: string }; Update: { domain?: string }; Relationships: [] }
      food_items: {
        Row: { basis: string | null; carbs_g: number; category: string | null; confidence: string | null; created_at: string; deleted_at: string | null; fat_g: number; id: string; kcal: number; name: string; owner_tenant_id: string | null; protein_g: number; source_note: string | null }
        Insert: { basis?: string | null; carbs_g?: number; category?: string | null; confidence?: string | null; created_at?: string; deleted_at?: string | null; fat_g?: number; id?: string; kcal: number; name: string; owner_tenant_id?: string | null; protein_g?: number; source_note?: string | null }
        Update: { basis?: string | null; carbs_g?: number; category?: string | null; confidence?: string | null; created_at?: string; deleted_at?: string | null; fat_g?: number; id?: string; kcal?: number; name?: string; owner_tenant_id?: string | null; protein_g?: number; source_note?: string | null }
        Relationships: []
      }
      food_log_entries: {
        Row: { at: string; carbs_g: number | null; client_id: string; created_at: string; deleted_at: string | null; description: string; entered_unit: string | null; entered_value: number | null; fat_g: number | null; food_item_id: string | null; id: string; kcal: number | null; local_date: string | null; meal_id: string | null; protein_g: number | null; qty: string | null; source: string; status: string; tenant_id: string; tier_id: number | null; tier_pct: number | null; weight_g: number | null }
        Insert: { at?: string; carbs_g?: number | null; client_id: string; created_at?: string; deleted_at?: string | null; description: string; entered_unit?: string | null; entered_value?: number | null; fat_g?: number | null; food_item_id?: string | null; id: string; kcal?: number | null; local_date?: string | null; meal_id?: string | null; protein_g?: number | null; qty?: string | null; source: string; status?: string; tenant_id: string; tier_id?: number | null; tier_pct?: number | null; weight_g?: number | null }
        Update: { at?: string; carbs_g?: number | null; client_id?: string; created_at?: string; deleted_at?: string | null; description?: string; entered_unit?: string | null; entered_value?: number | null; fat_g?: number | null; food_item_id?: string | null; id?: string; kcal?: number | null; local_date?: string | null; meal_id?: string | null; protein_g?: number | null; qty?: string | null; source?: string; status?: string; tenant_id?: string; tier_id?: number | null; tier_pct?: number | null; weight_g?: number | null }
        Relationships: []
      }
      messages: {
        Row: { body: string; channel_id: string; created_at: string; deleted_at: string | null; id: string; sender_user_id: string }
        Insert: { body: string; channel_id: string; created_at?: string; deleted_at?: string | null; id: string; sender_user_id: string }
        Update: { body?: string; channel_id?: string; created_at?: string; deleted_at?: string | null; id?: string; sender_user_id?: string }
        Relationships: []
      }
      note_categories: {
        Row: { id: string; label: string; position: number }
        Insert: { id: string; label: string; position?: number }
        Update: { id?: string; label?: string; position?: number }
        Relationships: []
      }
      nutrition_targets: {
        Row: { carbs_g: number | null; client_id: string; created_at: string; day_type: string; deleted_at: string | null; effective_date: string; fat_g: number | null; id: string; kcal: number | null; protein_g: number | null; tenant_id: string }
        Insert: { carbs_g?: number | null; client_id: string; created_at?: string; day_type?: string; deleted_at?: string | null; effective_date?: string; fat_g?: number | null; id?: string; kcal?: number | null; protein_g?: number | null; tenant_id: string }
        Update: { carbs_g?: number | null; client_id?: string; created_at?: string; day_type?: string; deleted_at?: string | null; effective_date?: string; fat_g?: number | null; id?: string; kcal?: number | null; protein_g?: number | null; tenant_id?: string }
        Relationships: []
      }
      report_notes: {
        Row: { body: string; category_id: string; created_at: string; deleted_at: string | null; delta_carbs_g: number | null; delta_fat_g: number | null; delta_kcal: number | null; delta_protein_g: number | null; domain: string; evidence: Json; id: string; position: number; report_id: string; tenant_id: string; title: string }
        Insert: { body?: string; category_id: string; created_at?: string; deleted_at?: string | null; delta_carbs_g?: number | null; delta_fat_g?: number | null; delta_kcal?: number | null; delta_protein_g?: number | null; domain?: string; evidence?: Json; id?: string; position?: number; report_id: string; tenant_id: string; title: string }
        Update: { body?: string; category_id?: string; created_at?: string; deleted_at?: string | null; delta_carbs_g?: number | null; delta_fat_g?: number | null; delta_kcal?: number | null; delta_protein_g?: number | null; domain?: string; evidence?: Json; id?: string; position?: number; report_id?: string; tenant_id?: string; title?: string }
        Relationships: []
      }
      role_types: { Row: { role: string }; Insert: { role: string }; Update: { role?: string }; Relationships: [] }
      source_types: { Row: { source: string }; Insert: { source: string }; Update: { source?: string }; Relationships: [] }
      standing_instructions: {
        Row: { active: boolean; body: string; client_id: string; created_at: string; deleted_at: string | null; id: string; position: number; tenant_id: string; title: string | null }
        Insert: { active?: boolean; body: string; client_id: string; created_at?: string; deleted_at?: string | null; id?: string; position?: number; tenant_id: string; title?: string | null }
        Update: { active?: boolean; body?: string; client_id?: string; created_at?: string; deleted_at?: string | null; id?: string; position?: number; tenant_id?: string; title?: string | null }
        Relationships: []
      }
      tenants: {
        Row: { created_at: string; deleted_at: string | null; id: string; name: string }
        Insert: { created_at?: string; deleted_at?: string | null; id?: string; name: string }
        Update: { created_at?: string; deleted_at?: string | null; id?: string; name?: string }
        Relationships: []
      }
      user_roles: {
        Row: { ended_at: string | null; id: string; role: string; started_at: string; tenant_id: string; user_id: string }
        Insert: { ended_at?: string | null; id?: string; role: string; started_at?: string; tenant_id: string; user_id: string }
        Update: { ended_at?: string | null; id?: string; role?: string; started_at?: string; tenant_id?: string; user_id?: string }
        Relationships: []
      }
    }
    Views: {
      v_daily_summary: {
        Row: { carbs_g: number | null; client_id: string | null; entries: number | null; fat_g: number | null; kcal: number | null; local_date: string | null; protein_g: number | null; protein_g_per_100kcal: number | null; tenant_id: string | null }
        Relationships: []
      }
      v_food_rollup: {
        Row: { client_id: string | null; description: string | null; kcal: number | null; protein_g: number | null; protein_g_per_100kcal: number | null; tenant_id: string | null; times_logged: number | null }
        Relationships: []
      }
      v_program_week_summary: {
        Row: { carbs_g_per_day: number | null; client_id: string | null; days_logged: number | null; fat_g_per_day: number | null; kcal_per_day: number | null; kcal_total: number | null; program_week: number | null; protein_g_per_100kcal: number | null; protein_g_per_day: number | null; tenant_id: string | null; week_end: string | null; week_start: string | null }
        Relationships: []
      }
    }
    Functions: {
      channel_tenant: { Args: { ch: string }; Returns: string }
      is_channel_member: { Args: { ch: string }; Returns: boolean }
      is_coach_of: { Args: { t: string }; Returns: boolean }
      my_client_ids: { Args: never; Returns: string[] }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type DefaultSchema = Database["public"]

export type Tables<T extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])> =
  (DefaultSchema["Tables"] & DefaultSchema["Views"])[T] extends { Row: infer R } ? R : never

export type TablesInsert<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T] extends { Insert: infer I } ? I : never

export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T] extends { Update: infer U } ? U : never
