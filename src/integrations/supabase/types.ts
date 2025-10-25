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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_suggestion_events: {
        Row: {
          accepted: boolean
          created_at: string | null
          id: string
          ingredient: string
          reason: string | null
          user_id: string | null
        }
        Insert: {
          accepted?: boolean
          created_at?: string | null
          id?: string
          ingredient: string
          reason?: string | null
          user_id?: string | null
        }
        Update: {
          accepted?: boolean
          created_at?: string | null
          id?: string
          ingredient?: string
          reason?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_usage_log: {
        Row: {
          created_at: string | null
          function_name: string
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          function_name: string
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          function_name?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      batches: {
        Row: {
          age_hours: number | null
          brix: number | null
          cabinet_temp_c: number | null
          created_at: string | null
          draw_temp_c: number | null
          hardness_score: number | null
          id: string
          machine: string | null
          meltdown_min: number | null
          notes: string | null
          overrun_pct: number | null
          panel_score: number | null
          ph: number | null
          recipe_id: string | null
          scoop_temp_c: number | null
          user_id: string
        }
        Insert: {
          age_hours?: number | null
          brix?: number | null
          cabinet_temp_c?: number | null
          created_at?: string | null
          draw_temp_c?: number | null
          hardness_score?: number | null
          id?: string
          machine?: string | null
          meltdown_min?: number | null
          notes?: string | null
          overrun_pct?: number | null
          panel_score?: number | null
          ph?: number | null
          recipe_id?: string | null
          scoop_temp_c?: number | null
          user_id?: string
        }
        Update: {
          age_hours?: number | null
          brix?: number | null
          cabinet_temp_c?: number | null
          created_at?: string | null
          draw_temp_c?: number | null
          hardness_score?: number | null
          id?: string
          machine?: string | null
          meltdown_min?: number | null
          notes?: string | null
          overrun_pct?: number | null
          panel_score?: number | null
          ph?: number | null
          recipe_id?: string | null
          scoop_temp_c?: number | null
          user_id?: string
        }
        Relationships: []
      }
      calculated_metrics: {
        Row: {
          created_at: string | null
          fat_pct: number
          fpdt: number | null
          id: string
          lactose_pct: number
          msnf_pct: number
          other_solids_pct: number
          pac: number | null
          pod_index: number | null
          recipe_id: string
          sp: number | null
          sugars_pct: number
          total_fat_g: number
          total_lactose_g: number
          total_msnf_g: number
          total_other_solids_g: number
          total_quantity_g: number
          total_solids_g: number
          total_solids_pct: number
          total_sugars_g: number
          total_water_g: number
          updated_at: string | null
          water_pct: number
        }
        Insert: {
          created_at?: string | null
          fat_pct: number
          fpdt?: number | null
          id?: string
          lactose_pct: number
          msnf_pct: number
          other_solids_pct: number
          pac?: number | null
          pod_index?: number | null
          recipe_id: string
          sp?: number | null
          sugars_pct: number
          total_fat_g: number
          total_lactose_g: number
          total_msnf_g: number
          total_other_solids_g: number
          total_quantity_g: number
          total_solids_g: number
          total_solids_pct: number
          total_sugars_g: number
          total_water_g: number
          updated_at?: string | null
          water_pct: number
        }
        Update: {
          created_at?: string | null
          fat_pct?: number
          fpdt?: number | null
          id?: string
          lactose_pct?: number
          msnf_pct?: number
          other_solids_pct?: number
          pac?: number | null
          pod_index?: number | null
          recipe_id?: string
          sp?: number | null
          sugars_pct?: number
          total_fat_g?: number
          total_lactose_g?: number
          total_msnf_g?: number
          total_other_solids_g?: number
          total_quantity_g?: number
          total_solids_g?: number
          total_solids_pct?: number
          total_sugars_g?: number
          total_water_g?: number
          updated_at?: string | null
          water_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "calculated_metrics_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: true
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string | null
          event: string
          id: string
          meta: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event: string
          id?: string
          meta?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event?: string
          id?: string
          meta?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      ingredient_access_log: {
        Row: {
          accessed_at: string | null
          action: string | null
          id: string
          ingredient_id: string | null
          user_id: string | null
        }
        Insert: {
          accessed_at?: string | null
          action?: string | null
          id?: string
          ingredient_id?: string | null
          user_id?: string | null
        }
        Update: {
          accessed_at?: string | null
          action?: string | null
          id?: string
          ingredient_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_access_log_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredient_access_log_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients_public"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          category: string
          cost_per_kg: number | null
          created_at: string | null
          fat_pct: number | null
          hardening_factor: number
          id: string
          msnf_pct: number | null
          name: string
          notes: string | null
          other_solids_pct: number | null
          pac_coeff: number | null
          sp_coeff: number | null
          sugar_split: Json | null
          sugars_pct: number | null
          tags: string[] | null
          updated_at: string | null
          water_pct: number | null
        }
        Insert: {
          category: string
          cost_per_kg?: number | null
          created_at?: string | null
          fat_pct?: number | null
          hardening_factor?: number
          id?: string
          msnf_pct?: number | null
          name: string
          notes?: string | null
          other_solids_pct?: number | null
          pac_coeff?: number | null
          sp_coeff?: number | null
          sugar_split?: Json | null
          sugars_pct?: number | null
          tags?: string[] | null
          updated_at?: string | null
          water_pct?: number | null
        }
        Update: {
          category?: string
          cost_per_kg?: number | null
          created_at?: string | null
          fat_pct?: number | null
          hardening_factor?: number
          id?: string
          msnf_pct?: number | null
          name?: string
          notes?: string | null
          other_solids_pct?: number | null
          pac_coeff?: number | null
          sp_coeff?: number | null
          sugar_split?: Json | null
          sugars_pct?: number | null
          tags?: string[] | null
          updated_at?: string | null
          water_pct?: number | null
        }
        Relationships: []
      }
      pairing_feedback: {
        Row: {
          a_id: string | null
          b_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          rating: number | null
          user_id: string | null
        }
        Insert: {
          a_id?: string | null
          b_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          rating?: number | null
          user_id?: string | null
        }
        Update: {
          a_id?: string | null
          b_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          rating?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pairing_feedback_a_id_fkey"
            columns: ["a_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pairing_feedback_a_id_fkey"
            columns: ["a_id"]
            isOneToOne: false
            referencedRelation: "ingredients_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pairing_feedback_b_id_fkey"
            columns: ["b_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pairing_feedback_b_id_fkey"
            columns: ["b_id"]
            isOneToOne: false
            referencedRelation: "ingredients_public"
            referencedColumns: ["id"]
          },
        ]
      }
      pastes: {
        Row: {
          category: string
          comp_cached: Json | null
          components_json: Json
          cost_per_kg: number | null
          created_at: string | null
          id: string
          lab_json: Json | null
          name: string
          preservation_json: Json | null
          tags: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category: string
          comp_cached?: Json | null
          components_json: Json
          cost_per_kg?: number | null
          created_at?: string | null
          id?: string
          lab_json?: Json | null
          name: string
          preservation_json?: Json | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          category?: string
          comp_cached?: Json | null
          components_json?: Json
          cost_per_kg?: number | null
          created_at?: string | null
          id?: string
          lab_json?: Json | null
          name?: string
          preservation_json?: Json | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      production_plans: {
        Row: {
          created_at: string | null
          id: string
          name: string
          procurement_list: Json | null
          recipe_allocations: Json
          sku_size: number
          total_cost: number | null
          total_liters: number
          updated_at: string | null
          user_id: string
          waste_factor: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          procurement_list?: Json | null
          recipe_allocations?: Json
          sku_size: number
          total_cost?: number | null
          total_liters: number
          updated_at?: string | null
          user_id?: string
          waste_factor?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          procurement_list?: Json | null
          recipe_allocations?: Json
          sku_size?: number
          total_cost?: number | null
          total_liters?: number
          updated_at?: string | null
          user_id?: string
          waste_factor?: number
        }
        Relationships: []
      }
      recipe_outcomes: {
        Row: {
          actual_texture: string | null
          created_at: string | null
          id: string
          notes: string | null
          outcome: string
          recipe_id: string
          user_id: string
        }
        Insert: {
          actual_texture?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          outcome: string
          recipe_id: string
          user_id: string
        }
        Update: {
          actual_texture?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          outcome?: string
          recipe_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_outcomes_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_rows: {
        Row: {
          created_at: string | null
          fat_g: number
          id: string
          ingredient: string
          lactose_g: number
          msnf_g: number
          other_solids_g: number
          quantity_g: number
          recipe_id: string
          sugars_g: number
          total_solids_g: number
          water_g: number
        }
        Insert: {
          created_at?: string | null
          fat_g?: number
          id?: string
          ingredient: string
          lactose_g?: number
          msnf_g?: number
          other_solids_g?: number
          quantity_g: number
          recipe_id: string
          sugars_g?: number
          total_solids_g?: number
          water_g?: number
        }
        Update: {
          created_at?: string | null
          fat_g?: number
          id?: string
          ingredient?: string
          lactose_g?: number
          msnf_g?: number
          other_solids_g?: number
          quantity_g?: number
          recipe_id?: string
          sugars_g?: number
          total_solids_g?: number
          water_g?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipe_rows_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          created_at: string | null
          id: string
          product_type: string | null
          recipe_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_type?: string | null
          recipe_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_type?: string | null
          recipe_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      ingredients_public: {
        Row: {
          category: string | null
          created_at: string | null
          fat_pct: number | null
          id: string | null
          msnf_pct: number | null
          name: string | null
          notes: string | null
          other_solids_pct: number | null
          pac_coeff: number | null
          sp_coeff: number | null
          sugar_split: Json | null
          sugars_pct: number | null
          tags: string[] | null
          updated_at: string | null
          water_pct: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          fat_pct?: number | null
          id?: string | null
          msnf_pct?: number | null
          name?: string | null
          notes?: string | null
          other_solids_pct?: number | null
          pac_coeff?: number | null
          sp_coeff?: number | null
          sugar_split?: Json | null
          sugars_pct?: number | null
          tags?: string[] | null
          updated_at?: string | null
          water_pct?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          fat_pct?: number | null
          id?: string | null
          msnf_pct?: number | null
          name?: string | null
          notes?: string | null
          other_solids_pct?: number | null
          pac_coeff?: number | null
          sp_coeff?: number | null
          sugar_split?: Json | null
          sugars_pct?: number | null
          tags?: string[] | null
          updated_at?: string | null
          water_pct?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_ingredient_with_cost: {
        Args: { ingredient_id: string }
        Returns: {
          category: string
          cost_per_kg: number
          created_at: string
          fat_pct: number
          hardening_factor: number
          id: string
          msnf_pct: number
          name: string
          notes: string
          other_solids_pct: number
          pac_coeff: number
          sp_coeff: number
          sugar_split: Json
          sugars_pct: number
          tags: string[]
          updated_at: string
          water_pct: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      refresh_ml_training_dataset: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
