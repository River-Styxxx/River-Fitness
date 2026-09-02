export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_release: {
        Row: {
          id: string
          min_build: string
          note: string | null
          updated_at: string
        }
        Insert: {
          id: string
          min_build: string
          note?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          min_build?: string
          note?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      attachments: {
        Row: {
          created_at: string
          deleted_at: string | null
          entity_id: string
          entity_type: string
          id: string
          kind: string | null
          storage_path: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          kind?: string | null
          storage_path: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          kind?: string | null
          storage_path?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_run: {
        Row: {
          bytes: number | null
          detail: string | null
          ok: boolean
          rows_total: number | null
          run_no: number
          slots: number[]
          taken_at: string
        }
        Insert: {
          bytes?: number | null
          detail?: string | null
          ok?: boolean
          rows_total?: number | null
          run_no?: number
          slots: number[]
          taken_at?: string
        }
        Update: {
          bytes?: number | null
          detail?: string | null
          ok?: boolean
          rows_total?: number | null
          run_no?: number
          slots?: number[]
          taken_at?: string
        }
        Relationships: []
      }
      backup_slot: {
        Row: {
          bytes: number | null
          payload: Json | null
          rows_total: number | null
          run_no: number | null
          slot: number
          taken_at: string | null
        }
        Insert: {
          bytes?: number | null
          payload?: Json | null
          rows_total?: number | null
          run_no?: number | null
          slot: number
          taken_at?: string | null
        }
        Update: {
          bytes?: number | null
          payload?: Json | null
          rows_total?: number | null
          run_no?: number | null
          slot?: number
          taken_at?: string | null
        }
        Relationships: []
      }
      bound_types: {
        Row: {
          key: string
          label: string
          note: string | null
        }
        Insert: {
          key: string
          label: string
          note?: string | null
        }
        Update: {
          key?: string
          label?: string
          note?: string | null
        }
        Relationships: []
      }
      channel_members: {
        Row: {
          added_at: string
          channel_id: string
          removed_at: string | null
          user_id: string
        }
        Insert: {
          added_at?: string
          channel_id: string
          removed_at?: string | null
          user_id: string
        }
        Update: {
          added_at?: string
          channel_id?: string
          removed_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_types: {
        Row: {
          type: string
        }
        Insert: {
          type: string
        }
        Update: {
          type?: string
        }
        Relationships: []
      }
      channels: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string | null
          tenant_id: string
          type: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string | null
          tenant_id: string
          type: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string | null
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "channels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channels_type_fkey"
            columns: ["type"]
            isOneToOne: false
            referencedRelation: "channel_types"
            referencedColumns: ["type"]
          },
        ]
      }
      client_reports: {
        Row: {
          client_id: string
          created_at: string
          deleted_at: string | null
          id: string
          period_end: string | null
          period_start: string | null
          published_at: string | null
          status: string
          tenant_id: string
          title: string
        }
        Insert: {
          client_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          published_at?: string | null
          status?: string
          tenant_id: string
          title: string
        }
        Update: {
          client_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          published_at?: string | null
          status?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_reports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          claimed_user_id: string | null
          created_at: string
          deleted_at: string | null
          display_name: string
          email: string | null
          features: Json
          id: string
          region: string | null
          start_date: string | null
          tenant_id: string
          timezone: string
        }
        Insert: {
          claimed_user_id?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name: string
          email?: string | null
          features?: Json
          id: string
          region?: string | null
          start_date?: string | null
          tenant_id: string
          timezone?: string
        }
        Update: {
          claimed_user_id?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string
          email?: string | null
          features?: Json
          id?: string
          region?: string | null
          start_date?: string | null
          tenant_id?: string
          timezone?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_clients: {
        Row: {
          client_id: string
          coach_user_id: string
          ended_at: string | null
          id: string
          started_at: string
          tenant_id: string
        }
        Insert: {
          client_id: string
          coach_user_id: string
          ended_at?: string | null
          id?: string
          started_at?: string
          tenant_id: string
        }
        Update: {
          client_id?: string
          coach_user_id?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      document_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          client_id: string
          document_id: string
          id: string
          revoked_at: string | null
          tenant_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          client_id: string
          document_id: string
          id?: string
          revoked_at?: string | null
          tenant_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          client_id?: string
          document_id?: string
          id?: string
          revoked_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_assignments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          bytes: number | null
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          id: string
          mime_type: string | null
          storage_path: string
          tenant_id: string
          title: string
        }
        Insert: {
          bytes?: number | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          id: string
          mime_type?: string | null
          storage_path: string
          tenant_id: string
          title: string
        }
        Update: {
          bytes?: number | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          mime_type?: string | null
          storage_path?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      domains: {
        Row: {
          domain: string
        }
        Insert: {
          domain: string
        }
        Update: {
          domain?: string
        }
        Relationships: []
      }
      estimate_runs: {
        Row: {
          carbs_g_total: number | null
          client_id: string | null
          corrected_at: string | null
          corrected_kcal: number | null
          created_at: string
          escalation_reasons: Json
          fat_g_total: number | null
          had_label: boolean
          id: string
          item_count: number | null
          kcal_total: number | null
          latency_ms: number | null
          model: string
          photo_count: number
          protein_g_total: number | null
          raw: Json | null
          reconcile_delta_pct: number | null
          requested_by: string | null
          self_confidence: number | null
          spread_ratio: number | null
          tenant_id: string | null
          total_weight_g: number | null
          would_escalate: boolean
        }
        Insert: {
          carbs_g_total?: number | null
          client_id?: string | null
          corrected_at?: string | null
          corrected_kcal?: number | null
          created_at?: string
          escalation_reasons?: Json
          fat_g_total?: number | null
          had_label?: boolean
          id?: string
          item_count?: number | null
          kcal_total?: number | null
          latency_ms?: number | null
          model: string
          photo_count: number
          protein_g_total?: number | null
          raw?: Json | null
          reconcile_delta_pct?: number | null
          requested_by?: string | null
          self_confidence?: number | null
          spread_ratio?: number | null
          tenant_id?: string | null
          total_weight_g?: number | null
          would_escalate?: boolean
        }
        Update: {
          carbs_g_total?: number | null
          client_id?: string | null
          corrected_at?: string | null
          corrected_kcal?: number | null
          created_at?: string
          escalation_reasons?: Json
          fat_g_total?: number | null
          had_label?: boolean
          id?: string
          item_count?: number | null
          kcal_total?: number | null
          latency_ms?: number | null
          model?: string
          photo_count?: number
          protein_g_total?: number | null
          raw?: Json | null
          reconcile_delta_pct?: number | null
          requested_by?: string | null
          self_confidence?: number | null
          spread_ratio?: number | null
          tenant_id?: string | null
          total_weight_g?: number | null
          would_escalate?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "estimate_runs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      food_items: {
        Row: {
          basis: string | null
          carbs_g: number
          category: string | null
          confidence: string | null
          created_at: string
          deleted_at: string | null
          fat_g: number
          id: string
          kcal: number
          name: string
          owner_tenant_id: string | null
          protein_g: number
          source_note: string | null
        }
        Insert: {
          basis?: string | null
          carbs_g?: number
          category?: string | null
          confidence?: string | null
          created_at?: string
          deleted_at?: string | null
          fat_g?: number
          id?: string
          kcal: number
          name: string
          owner_tenant_id?: string | null
          protein_g?: number
          source_note?: string | null
        }
        Update: {
          basis?: string | null
          carbs_g?: number
          category?: string | null
          confidence?: string | null
          created_at?: string
          deleted_at?: string | null
          fat_g?: number
          id?: string
          kcal?: number
          name?: string
          owner_tenant_id?: string | null
          protein_g?: number
          source_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_items_owner_tenant_id_fkey"
            columns: ["owner_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      food_log_entries: {
        Row: {
          at: string
          carbs_g: number | null
          client_id: string
          created_at: string
          deleted_at: string | null
          description: string
          entered_unit: string | null
          entered_value: number | null
          estimate_attempts: number
          estimate_last_at: string | null
          estimate_note: string | null
          fat_g: number | null
          fiber_g: number | null
          food_item_id: string | null
          id: string
          kcal: number | null
          local_date: string | null
          meal_id: string | null
          protein_g: number | null
          qty: string | null
          source: string
          status: string
          tenant_id: string
          tier_id: number | null
          tier_pct: number | null
          weight_g: number | null
        }
        Insert: {
          at?: string
          carbs_g?: number | null
          client_id: string
          created_at?: string
          deleted_at?: string | null
          description: string
          entered_unit?: string | null
          entered_value?: number | null
          estimate_attempts?: number
          estimate_last_at?: string | null
          estimate_note?: string | null
          fat_g?: number | null
          fiber_g?: number | null
          food_item_id?: string | null
          id: string
          kcal?: number | null
          local_date?: string | null
          meal_id?: string | null
          protein_g?: number | null
          qty?: string | null
          source: string
          status?: string
          tenant_id: string
          tier_id?: number | null
          tier_pct?: number | null
          weight_g?: number | null
        }
        Update: {
          at?: string
          carbs_g?: number | null
          client_id?: string
          created_at?: string
          deleted_at?: string | null
          description?: string
          entered_unit?: string | null
          entered_value?: number | null
          estimate_attempts?: number
          estimate_last_at?: string | null
          estimate_note?: string | null
          fat_g?: number | null
          fiber_g?: number | null
          food_item_id?: string | null
          id?: string
          kcal?: number | null
          local_date?: string | null
          meal_id?: string | null
          protein_g?: number | null
          qty?: string | null
          source?: string
          status?: string
          tenant_id?: string
          tier_id?: number | null
          tier_pct?: number | null
          weight_g?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "food_log_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_log_entries_food_item_id_fkey"
            columns: ["food_item_id"]
            isOneToOne: false
            referencedRelation: "food_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_log_entries_source_fkey"
            columns: ["source"]
            isOneToOne: false
            referencedRelation: "source_types"
            referencedColumns: ["source"]
          },
          {
            foreignKeyName: "food_log_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          channel_id: string
          created_at: string
          deleted_at: string | null
          document_id: string | null
          id: string
          sender_user_id: string
        }
        Insert: {
          body: string
          channel_id: string
          created_at?: string
          deleted_at?: string | null
          document_id?: string | null
          id: string
          sender_user_id: string
        }
        Update: {
          body?: string
          channel_id?: string
          created_at?: string
          deleted_at?: string | null
          document_id?: string | null
          id?: string
          sender_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      note_categories: {
        Row: {
          id: string
          label: string
          position: number
        }
        Insert: {
          id: string
          label: string
          position?: number
        }
        Update: {
          id?: string
          label?: string
          position?: number
        }
        Relationships: []
      }
      nutrition_targets: {
        Row: {
          carbs_bound: string
          carbs_g: number | null
          client_id: string
          created_at: string
          day_type: string
          deleted_at: string | null
          effective_date: string
          fat_bound: string
          fat_g: number | null
          id: string
          kcal: number | null
          kcal_bound: string
          protein_bound: string
          protein_g: number | null
          tenant_id: string
        }
        Insert: {
          carbs_bound?: string
          carbs_g?: number | null
          client_id: string
          created_at?: string
          day_type?: string
          deleted_at?: string | null
          effective_date?: string
          fat_bound?: string
          fat_g?: number | null
          id?: string
          kcal?: number | null
          kcal_bound?: string
          protein_bound?: string
          protein_g?: number | null
          tenant_id: string
        }
        Update: {
          carbs_bound?: string
          carbs_g?: number | null
          client_id?: string
          created_at?: string
          day_type?: string
          deleted_at?: string | null
          effective_date?: string
          fat_bound?: string
          fat_g?: number | null
          id?: string
          kcal?: number | null
          kcal_bound?: string
          protein_bound?: string
          protein_g?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_targets_carbs_bound_fkey"
            columns: ["carbs_bound"]
            isOneToOne: false
            referencedRelation: "bound_types"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "nutrition_targets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutrition_targets_fat_bound_fkey"
            columns: ["fat_bound"]
            isOneToOne: false
            referencedRelation: "bound_types"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "nutrition_targets_kcal_bound_fkey"
            columns: ["kcal_bound"]
            isOneToOne: false
            referencedRelation: "bound_types"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "nutrition_targets_protein_bound_fkey"
            columns: ["protein_bound"]
            isOneToOne: false
            referencedRelation: "bound_types"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "nutrition_targets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_policy: {
        Row: {
          ceiling_bytes: number
          dry_run: boolean
          escalate_after_days: number
          id: string
          require_published_review: boolean
          retention_days: number
          updated_at: string
        }
        Insert: {
          ceiling_bytes?: number
          dry_run?: boolean
          escalate_after_days?: number
          id?: string
          require_published_review?: boolean
          retention_days?: number
          updated_at?: string
        }
        Update: {
          ceiling_bytes?: number
          dry_run?: boolean
          escalate_after_days?: number
          id?: string
          require_published_review?: boolean
          retention_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      photo_purge_audit: {
        Row: {
          attachment_id: string | null
          bytes: number | null
          client_id: string | null
          dry_run: boolean
          id: string
          outcome: string
          ran_at: string
          reason: string
          run_id: string
          storage_path: string
        }
        Insert: {
          attachment_id?: string | null
          bytes?: number | null
          client_id?: string | null
          dry_run: boolean
          id?: string
          outcome: string
          ran_at?: string
          reason: string
          run_id: string
          storage_path: string
        }
        Update: {
          attachment_id?: string | null
          bytes?: number | null
          client_id?: string | null
          dry_run?: boolean
          id?: string
          outcome?: string
          ran_at?: string
          reason?: string
          run_id?: string
          storage_path?: string
        }
        Relationships: []
      }
      report_notes: {
        Row: {
          body: string
          category_id: string
          created_at: string
          deleted_at: string | null
          delta_carbs_g: number | null
          delta_fat_g: number | null
          delta_kcal: number | null
          delta_protein_g: number | null
          domain: string
          evidence: Json
          id: string
          position: number
          report_id: string
          tenant_id: string
          title: string
        }
        Insert: {
          body?: string
          category_id: string
          created_at?: string
          deleted_at?: string | null
          delta_carbs_g?: number | null
          delta_fat_g?: number | null
          delta_kcal?: number | null
          delta_protein_g?: number | null
          domain?: string
          evidence?: Json
          id?: string
          position?: number
          report_id: string
          tenant_id: string
          title: string
        }
        Update: {
          body?: string
          category_id?: string
          created_at?: string
          deleted_at?: string | null
          delta_carbs_g?: number | null
          delta_fat_g?: number | null
          delta_kcal?: number | null
          delta_protein_g?: number | null
          domain?: string
          evidence?: Json
          id?: string
          position?: number
          report_id?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_notes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "note_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_notes_domain_fkey"
            columns: ["domain"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["domain"]
          },
          {
            foreignKeyName: "report_notes_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "client_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      role_types: {
        Row: {
          role: string
        }
        Insert: {
          role: string
        }
        Update: {
          role?: string
        }
        Relationships: []
      }
      source_types: {
        Row: {
          source: string
        }
        Insert: {
          source: string
        }
        Update: {
          source?: string
        }
        Relationships: []
      }
      standing_instructions: {
        Row: {
          active: boolean
          body: string
          client_id: string
          created_at: string
          deleted_at: string | null
          id: string
          position: number
          tenant_id: string
          title: string | null
        }
        Insert: {
          active?: boolean
          body: string
          client_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          position?: number
          tenant_id: string
          title?: string | null
        }
        Update: {
          active?: boolean
          body?: string
          client_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          position?: number
          tenant_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "standing_instructions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standing_instructions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          ended_at: string | null
          id: string
          role: string
          started_at: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          ended_at?: string | null
          id?: string
          role: string
          started_at?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          ended_at?: string | null
          id?: string
          role?: string
          started_at?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_fkey"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "role_types"
            referencedColumns: ["role"]
          },
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_daily_summary: {
        Row: {
          carbs_g: number | null
          client_id: string | null
          entries: number | null
          fat_g: number | null
          fiber_g: number | null
          kcal: number | null
          local_date: string | null
          protein_g: number | null
          protein_g_per_100kcal: number | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_log_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_log_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_estimate_shadow: {
        Row: {
          avg_latency_ms: number | null
          avg_reconcile_delta: number | null
          avg_spread: number | null
          day: string | null
          escalate_pct: number | null
          model: string | null
          runs: number | null
          would_escalate: number | null
        }
        Relationships: []
      }
      v_food_rollup: {
        Row: {
          client_id: string | null
          description: string | null
          kcal: number | null
          protein_g: number | null
          protein_g_per_100kcal: number | null
          tenant_id: string | null
          times_logged: number | null
        }
        Relationships: [
          {
            foreignKeyName: "food_log_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_log_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_meal_photo_state: {
        Row: {
          age: string | null
          attachment_id: string | null
          bytes: number | null
          client_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          extracted: boolean | null
          local_date: string | null
          storage_path: string | null
        }
        Relationships: []
      }
      v_program_week_summary: {
        Row: {
          carbs_g_per_day: number | null
          client_id: string | null
          days_logged: number | null
          fat_g_per_day: number | null
          kcal_per_day: number | null
          kcal_total: number | null
          program_week: number | null
          protein_g_per_100kcal: number | null
          protein_g_per_day: number | null
          tenant_id: string | null
          week_end: string | null
          week_start: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_log_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_log_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_triage_pending: {
        Row: {
          client_id: string | null
          created_at: string | null
          description: string | null
          estimate_attempts: number | null
          estimate_last_at: string | null
          estimate_note: string | null
          gave_up: boolean | null
          has_photo: boolean | null
          hours_blank: number | null
          id: string | null
          local_date: string | null
          meal_id: string | null
          qty: string | null
          tenant_id: string | null
          weight_g: number | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          estimate_attempts?: number | null
          estimate_last_at?: string | null
          estimate_note?: string | null
          gave_up?: never
          has_photo?: never
          hours_blank?: never
          id?: string | null
          local_date?: string | null
          meal_id?: string | null
          qty?: string | null
          tenant_id?: string | null
          weight_g?: number | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          estimate_attempts?: number | null
          estimate_last_at?: string | null
          estimate_note?: string | null
          gave_up?: never
          has_photo?: never
          hours_blank?: never
          id?: string | null
          local_date?: string | null
          meal_id?: string | null
          qty?: string | null
          tenant_id?: string | null
          weight_g?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "food_log_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_log_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      call_own_function: { Args: { p_slug: string }; Returns: number }
      can_see_client: { Args: { c: string }; Returns: boolean }
      channel_tenant: { Args: { ch: string }; Returns: string }
      client_tenant: { Args: { c: string }; Returns: string }
      is_channel_member: { Args: { ch: string }; Returns: boolean }
      is_coach_of: { Args: { t: string }; Returns: boolean }
      my_client_ids: { Args: never; Returns: string[] }
      photo_purge_plan: {
        Args: never
        Returns: {
          action: string
          age_days: number
          attachment_id: string
          bytes: number
          client_id: string
          detail: string
          storage_path: string
        }[]
      }
      take_backup: { Args: never; Returns: number }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
