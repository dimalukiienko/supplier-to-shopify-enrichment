export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      batches: {
        Row: {
          created_at: string
          id: string
          name: string
          source_format: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          source_format: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          source_format?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      enriched_fields: {
        Row: {
          confidence: number | null
          created_at: string
          field_name: string
          id: string
          product_id: string
          source: string
          status: string
          updated_at: string
          value: string | null
          variant_id: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          field_name: string
          id?: string
          product_id: string
          source?: string
          status?: string
          updated_at?: string
          value?: string | null
          variant_id?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          field_name?: string
          id?: string
          product_id?: string
          source?: string
          status?: string
          updated_at?: string
          value?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enriched_fields_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enriched_fields_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "variants"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          attempts: number
          batch_id: string | null
          created_at: string
          error: string | null
          id: string
          payload: Json | null
          product_id: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          batch_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          payload?: Json | null
          product_id?: string | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          batch_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          payload?: Json | null
          product_id?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          batch_id: string
          created_at: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_versions: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
          version: number
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          version: number
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      runs: {
        Row: {
          created_at: string
          graph_version: string | null
          id: string
          input_tokens: number | null
          job_id: string
          latency_ms: number | null
          model: string | null
          node_traces: Json | null
          output_tokens: number | null
          product_id: string
          prompt_version: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          graph_version?: string | null
          id?: string
          input_tokens?: number | null
          job_id: string
          latency_ms?: number | null
          model?: string | null
          node_traces?: Json | null
          output_tokens?: number | null
          product_id: string
          prompt_version?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          graph_version?: string | null
          id?: string
          input_tokens?: number | null
          job_id?: string
          latency_ms?: number | null
          model?: string | null
          node_traces?: Json | null
          output_tokens?: number | null
          product_id?: string
          prompt_version?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "runs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string
          default_model: string
          guardrail_config: Json
          id: string
          title_template: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_model?: string
          guardrail_config?: Json
          id?: string
          title_template?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_model?: string
          guardrail_config?: Json
          id?: string
          title_template?: Json
          updated_at?: string
        }
        Relationships: []
      }
      supplier_rows: {
        Row: {
          barcode: string | null
          batch_id: string
          created_at: string
          id: string
          product_name: string | null
          row_id: string | null
          supplier_notes: string | null
          supplier_sku: string | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          batch_id: string
          created_at?: string
          id?: string
          product_name?: string | null
          row_id?: string | null
          supplier_notes?: string | null
          supplier_sku?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          batch_id?: string
          created_at?: string
          id?: string
          product_name?: string | null
          row_id?: string | null
          supplier_notes?: string | null
          supplier_sku?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_rows_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      variants: {
        Row: {
          color: string | null
          created_at: string
          id: string
          position: number
          product_id: string
          size: string | null
          supplier_row_id: string | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          position?: number
          product_id: string
          size?: string | null
          supplier_row_id?: string | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          position?: number
          product_id?: string
          size?: string | null
          supplier_row_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variants_supplier_row_id_fkey"
            columns: ["supplier_row_id"]
            isOneToOne: false
            referencedRelation: "supplier_rows"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

