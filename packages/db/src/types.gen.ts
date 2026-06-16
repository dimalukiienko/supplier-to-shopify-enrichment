/**
 * GENERATED FILE — DO NOT EDIT BY HAND.
 *
 * Regenerate from the live local schema with:
 *   pnpm --filter @repo/db gen:types
 * (runs `supabase gen types typescript --local`).
 *
 * This checked-in copy is the hand-authored stand-in that mirrors
 * `docs/DATABASE.md`, so the web app type-checks before the Supabase CLI has
 * been run locally. Once `supabase gen types` runs, it overwrites this file
 * and CI asserts the result matches (no git diff) — see .github/workflows/ci.yml.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      batches: {
        Row: {
          id: string;
          name: string;
          source_format: "csv" | "xlsx";
          status: "uploaded" | "clustering" | "enriching" | "done";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          source_format: "csv" | "xlsx";
          status?: "uploaded" | "clustering" | "enriching" | "done";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["batches"]["Insert"]>;
        Relationships: [];
      };
      supplier_rows: {
        Row: {
          id: string;
          batch_id: string;
          row_id: string | null;
          product_name: string | null;
          supplier_sku: string | null;
          barcode: string | null;
          supplier_notes: string | null;
          unit_price: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          batch_id: string;
          row_id?: string | null;
          product_name?: string | null;
          supplier_sku?: string | null;
          barcode?: string | null;
          supplier_notes?: string | null;
          unit_price?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["supplier_rows"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "supplier_rows_batch_id_fkey";
            columns: ["batch_id"];
            referencedRelation: "batches";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          id: string;
          batch_id: string;
          status:
            | "queued"
            | "enriching"
            | "enriched"
            | "approved"
            | "published";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          batch_id: string;
          status?:
            | "queued"
            | "enriching"
            | "enriched"
            | "approved"
            | "published";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "products_batch_id_fkey";
            columns: ["batch_id"];
            referencedRelation: "batches";
            referencedColumns: ["id"];
          },
        ];
      };
      variants: {
        Row: {
          id: string;
          product_id: string;
          supplier_row_id: string | null;
          size: string | null;
          color: string | null;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          supplier_row_id?: string | null;
          size?: string | null;
          color?: string | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["variants"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "variants_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "variants_supplier_row_id_fkey";
            columns: ["supplier_row_id"];
            referencedRelation: "supplier_rows";
            referencedColumns: ["id"];
          },
        ];
      };
      enriched_fields: {
        Row: {
          id: string;
          product_id: string;
          variant_id: string | null;
          field_name: string;
          value: string | null;
          confidence: number | null;
          source: "llm" | "web" | "manual";
          status: "ai" | "accepted" | "overridden";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          variant_id?: string | null;
          field_name: string;
          value?: string | null;
          confidence?: number | null;
          source?: "llm" | "web" | "manual";
          status?: "ai" | "accepted" | "overridden";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["enriched_fields"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "enriched_fields_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "enriched_fields_variant_id_fkey";
            columns: ["variant_id"];
            referencedRelation: "variants";
            referencedColumns: ["id"];
          },
        ];
      };
      jobs: {
        Row: {
          id: string;
          type: "cluster_batch" | "enrich_product";
          status: "queued" | "processing" | "done" | "failed";
          product_id: string | null;
          batch_id: string | null;
          payload: Json | null;
          error: string | null;
          attempts: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          type: "cluster_batch" | "enrich_product";
          status?: "queued" | "processing" | "done" | "failed";
          product_id?: string | null;
          batch_id?: string | null;
          payload?: Json | null;
          error?: string | null;
          attempts?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["jobs"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "jobs_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_batch_id_fkey";
            columns: ["batch_id"];
            referencedRelation: "batches";
            referencedColumns: ["id"];
          },
        ];
      };
      runs: {
        Row: {
          id: string;
          product_id: string;
          job_id: string;
          graph_version: string | null;
          status: "success" | "partial" | "failed";
          node_traces: Json | null;
          model: string | null;
          prompt_version: string | null;
          input_tokens: number | null;
          output_tokens: number | null;
          latency_ms: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          job_id: string;
          graph_version?: string | null;
          status?: "success" | "partial" | "failed";
          node_traces?: Json | null;
          model?: string | null;
          prompt_version?: string | null;
          input_tokens?: number | null;
          output_tokens?: number | null;
          latency_ms?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["runs"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "runs_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "runs_job_id_fkey";
            columns: ["job_id"];
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      settings: {
        Row: {
          id: string;
          title_template: Json;
          default_model: string;
          guardrail_config: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title_template?: Json;
          default_model?: string;
          guardrail_config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["settings"]["Insert"]>;
        Relationships: [];
      };
      prompt_versions: {
        Row: {
          id: string;
          name: string;
          version: number;
          content: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          version: number;
          content: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["prompt_versions"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
