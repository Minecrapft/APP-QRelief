export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      beneficiaries: {
        Row: {
          address: string;
          beneficiary_latitude: number | null;
          beneficiary_longitude: number | null;
          contact_number: string;
          created_at: string;
          full_name: string;
          government_id: string;
          household_size: number;
          id: string;
          internal_notes: string | null;
          location_confidence: number | null;
          priority_flag: boolean;
          qr_token: string | null;
          rejection_reason: string | null;
          status: "pending" | "approved" | "rejected";
          updated_at: string;
        };
        Insert: {
          address: string;
          beneficiary_latitude?: number | null;
          beneficiary_longitude?: number | null;
          contact_number: string;
          full_name: string;
          government_id: string;
          household_size: number;
          id: string;
          internal_notes?: string | null;
          location_confidence?: number | null;
          priority_flag?: boolean;
          qr_token?: string | null;
          rejection_reason?: string | null;
          status?: "pending" | "approved" | "rejected";
        };
        Update: {
          address?: string;
          beneficiary_latitude?: number | null;
          beneficiary_longitude?: number | null;
          contact_number?: string;
          full_name?: string;
          government_id?: string;
          household_size?: number;
          id?: string;
          internal_notes?: string | null;
          location_confidence?: number | null;
          priority_flag?: boolean;
          qr_token?: string | null;
          rejection_reason?: string | null;
          status?: "pending" | "approved" | "rejected";
        };
        Relationships: [
          {
            foreignKeyName: "beneficiaries_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      event_items: {
        Row: {
          allocated_quantity: number;
          created_at: string;
          event_id: string;
          id: string;
          inventory_item_id: string;
          per_beneficiary_quantity: number;
        };
        Insert: {
          allocated_quantity: number;
          event_id: string;
          id?: string;
          inventory_item_id: string;
          per_beneficiary_quantity: number;
        };
        Update: {
          allocated_quantity?: number;
          event_id?: string;
          id?: string;
          inventory_item_id?: string;
          per_beneficiary_quantity?: number;
        };
        Relationships: [
          {
            foreignKeyName: "event_items_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_items_inventory_item_id_fkey";
            columns: ["inventory_item_id"];
            isOneToOne: false;
            referencedRelation: "inventory_items";
            referencedColumns: ["id"];
          }
        ];
      };
      events: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          ends_at: string | null;
          event_latitude: number | null;
          event_longitude: number | null;
          id: string;
          location: string;
          location_confidence: number | null;
          starts_at: string;
          status: "draft" | "active" | "cancelled" | "archived";
          title: string;
          updated_at: string;
        };
        Insert: {
          created_by?: string | null;
          description?: string | null;
          ends_at?: string | null;
          event_latitude?: number | null;
          event_longitude?: number | null;
          id?: string;
          location: string;
          location_confidence?: number | null;
          starts_at: string;
          status?: "draft" | "active" | "cancelled" | "archived";
          title: string;
        };
        Update: {
          created_by?: string | null;
          description?: string | null;
          ends_at?: string | null;
          event_latitude?: number | null;
          event_longitude?: number | null;
          id?: string;
          location?: string;
          location_confidence?: number | null;
          starts_at?: string;
          status?: "draft" | "active" | "cancelled" | "archived";
          title?: string;
        };
        Relationships: [];
      };
      distributions: {
        Row: {
          beneficiary_id: string;
          distributed_at: string;
          event_id: string;
          id: string;
          items: Json;
          notes: string | null;
          staff_id: string;
          sync_state: "synced";
        };
        Insert: {
          beneficiary_id: string;
          distributed_at?: string;
          event_id: string;
          id?: string;
          items: Json;
          notes?: string | null;
          staff_id?: string;
          sync_state?: "synced";
        };
        Update: {
          beneficiary_id?: string;
          distributed_at?: string;
          event_id?: string;
          id?: string;
          items?: Json;
          notes?: string | null;
          staff_id?: string;
          sync_state?: "synced";
        };
        Relationships: [
          {
            foreignKeyName: "distributions_beneficiary_id_fkey";
            columns: ["beneficiary_id"];
            isOneToOne: false;
            referencedRelation: "beneficiaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "distributions_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "distributions_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          }
        ];
      };
      inventory_items: {
        Row: {
          category: string;
          created_at: string;
          current_stock: number;
          id: string;
          low_stock_threshold: number;
          name: string;
          unit: string;
          updated_at: string;
        };
        Insert: {
          category: string;
          current_stock?: number;
          id?: string;
          low_stock_threshold?: number;
          name: string;
          unit: string;
        };
        Update: {
          category?: string;
          current_stock?: number;
          id?: string;
          low_stock_threshold?: number;
          name?: string;
          unit?: string;
        };
        Relationships: [];
      };
      inventory_movements: {
        Row: {
          actor_id: string | null;
          created_at: string;
          event_id: string | null;
          id: string;
          inventory_item_id: string;
          movement_type: "stock_in" | "stock_out" | "allocation" | "distribution" | "correction";
          quantity_delta: number;
          reason: string;
        };
        Insert: {
          actor_id?: string | null;
          event_id?: string | null;
          id?: string;
          inventory_item_id: string;
          movement_type: "stock_in" | "stock_out" | "allocation" | "distribution" | "correction";
          quantity_delta: number;
          reason: string;
        };
        Update: {
          actor_id?: string | null;
          event_id?: string | null;
          id?: string;
          inventory_item_id?: string;
          movement_type?: "stock_in" | "stock_out" | "allocation" | "distribution" | "correction";
          quantity_delta?: number;
          reason?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_movements_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_movements_inventory_item_id_fkey";
            columns: ["inventory_item_id"];
            isOneToOne: false;
            referencedRelation: "inventory_items";
            referencedColumns: ["id"];
          }
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string;
          id: string;
          role: "beneficiary" | "staff" | "admin";
          updated_at: string;
        };
        Insert: {
          full_name: string;
          id: string;
          role?: "beneficiary" | "staff" | "admin";
        };
        Update: {
          full_name?: string;
          id?: string;
          role?: "beneficiary" | "staff" | "admin";
        };
        Relationships: [];
      };
      staff: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          updated_at: string;
        };
        Insert: {
          id: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          is_active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "staff_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      staff_invitations: {
        Row: {
          accepted_at: string | null;
          accepted_user_id: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          full_name: string;
          id: string;
          invite_code: string;
          invited_by: string | null;
          revoked_at: string | null;
        };
        Insert: {
          accepted_at?: string | null;
          accepted_user_id?: string | null;
          created_at?: string;
          email: string;
          expires_at?: string;
          full_name: string;
          id?: string;
          invite_code: string;
          invited_by?: string | null;
          revoked_at?: string | null;
        };
        Update: {
          accepted_at?: string | null;
          accepted_user_id?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          full_name?: string;
          id?: string;
          invite_code?: string;
          invited_by?: string | null;
          revoked_at?: string | null;
        };
        Relationships: [];
      };
      staff_assignments: {
        Row: {
          created_at: string;
          event_id: string;
          id: string;
          staff_id: string;
        };
        Insert: {
          event_id: string;
          id?: string;
          staff_id: string;
        };
        Update: {
          event_id?: string;
          id?: string;
          staff_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_assignments_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_assignments_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      adjust_inventory_stock: {
        Args: {
          item_id: string;
          delta: number;
          movement_reason: string;
          movement_type: "stock_in" | "stock_out" | "allocation" | "distribution" | "correction";
          related_event_id?: string | null;
        };
        Returns: Database["public"]["Tables"]["inventory_items"]["Row"];
      };
      distribute_beneficiary: {
        Args: {
          target_event_id: string;
          target_beneficiary_id: string;
          distribution_items: Json;
          distribution_notes?: string | null;
        };
        Returns: Database["public"]["Tables"]["distributions"]["Row"];
      };
      lookup_beneficiary_for_event: {
        Args: {
          target_event_id: string;
          lookup_value: string;
        };
        Returns: Json;
      };
      predict_event_turnout: {
        Args: {
          target_event_id: string;
        };
        Returns: Json;
      };
      preload_beneficiary_roster_for_event: {
        Args: {
          target_event_id: string;
        };
        Returns: Json;
      };
      review_beneficiary: {
        Args: {
          beneficiary_id: string;
          next_status: "approved" | "rejected";
          next_rejection_reason?: string | null;
          next_internal_notes?: string | null;
          next_priority_flag?: boolean;
        };
        Returns: Database["public"]["Tables"]["beneficiaries"]["Row"];
      };
      create_staff_invitation: {
        Args: {
          invite_email: string;
          invite_full_name: string;
          invite_expires_at?: string | null;
        };
        Returns: Database["public"]["Tables"]["staff_invitations"]["Row"];
      };
      revoke_staff_invitation: {
        Args: {
          invitation_id: string;
        };
        Returns: Database["public"]["Tables"]["staff_invitations"]["Row"];
      };
      update_beneficiary_profile: {
        Args: {
          full_name: string;
          contact_number: string;
          address: string;
          household_size: number;
          government_id: string;
        };
        Returns: Database["public"]["Tables"]["beneficiaries"]["Row"];
      };
      validate_staff_invitation: {
        Args: {
          invite_email: string;
          provided_code: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      app_role: "beneficiary" | "staff" | "admin";
      beneficiary_status: "pending" | "approved" | "rejected";
      event_status: "draft" | "active" | "cancelled" | "archived";
      inventory_movement_type: "stock_in" | "stock_out" | "allocation" | "distribution" | "correction";
    };
  };
}
