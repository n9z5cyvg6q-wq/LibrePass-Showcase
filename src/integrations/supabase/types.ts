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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      favorite_parkings: {
        Row: {
          created_at: string
          id: string
          parking_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parking_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parking_id?: string
          user_id?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          parking_name: string
          plate_number: string
          session_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          parking_name: string
          plate_number?: string
          session_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          parking_name?: string
          plate_number?: string
          session_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      parking_spots: {
        Row: {
          created_at: string
          id: string
          last_seen_at: string
          name: string
          occupied_plate: string | null
          parking_id: string
          position_x: number
          position_y: number
          position_z: number
          rotation_y: number
          size_x: number
          size_y: number
          size_z: number
          status: Database["public"]["Enums"]["spot_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen_at?: string
          name: string
          occupied_plate?: string | null
          parking_id: string
          position_x?: number
          position_y?: number
          position_z?: number
          rotation_y?: number
          size_x?: number
          size_y?: number
          size_z?: number
          status?: Database["public"]["Enums"]["spot_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_seen_at?: string
          name?: string
          occupied_plate?: string | null
          parking_id?: string
          position_x?: number
          position_y?: number
          position_z?: number
          rotation_y?: number
          size_x?: number
          size_y?: number
          size_z?: number
          status?: Database["public"]["Enums"]["spot_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parking_spots_parking_id_fkey"
            columns: ["parking_id"]
            isOneToOne: false
            referencedRelation: "parkings"
            referencedColumns: ["id"]
          },
        ]
      }
      parkings: {
        Row: {
          address: string | null
          available_spaces: number
          created_at: string
          has_ev_charging: boolean
          id: string
          is_outdoor: boolean
          lat: number
          lng: number
          name: string
          price_per_hour: number
          splat_source_url: string | null
          total_capacity: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          available_spaces?: number
          created_at?: string
          has_ev_charging?: boolean
          id?: string
          is_outdoor?: boolean
          lat: number
          lng: number
          name: string
          price_per_hour: number
          splat_source_url?: string | null
          total_capacity: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          available_spaces?: number
          created_at?: string
          has_ev_charging?: boolean
          id?: string
          is_outdoor?: boolean
          lat?: number
          lng?: number
          name?: string
          price_per_hour?: number
          splat_source_url?: string | null
          total_capacity?: number
          updated_at?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          card_brand: string
          cardholder_name: string
          created_at: string
          expiry_month: number
          expiry_year: number
          id: string
          is_default: boolean
          last_four: string
          user_id: string
        }
        Insert: {
          card_brand?: string
          cardholder_name?: string
          created_at?: string
          expiry_month: number
          expiry_year: number
          id?: string
          is_default?: boolean
          last_four: string
          user_id: string
        }
        Update: {
          card_brand?: string
          cardholder_name?: string
          created_at?: string
          expiry_month?: number
          expiry_year?: number
          id?: string
          is_default?: boolean
          last_four?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          plate_number: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          plate_number?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          plate_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reservations: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          parking_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          parking_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          parking_id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          created_at: string
          end_time: string | null
          id: string
          parking_id: string
          plate_number: string
          start_time: string
          total_price: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          id?: string
          parking_id: string
          plate_number: string
          start_time?: string
          total_price?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          end_time?: string | null
          id?: string
          parking_id?: string
          plate_number?: string
          start_time?: string
          total_price?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_parking_id_fkey"
            columns: ["parking_id"]
            isOneToOne: false
            referencedRelation: "parkings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          plate_number: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          plate_number: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          plate_number?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      spot_status: "EMPTY" | "OCCUPIED" | "RESERVED"
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
      spot_status: ["EMPTY", "OCCUPIED", "RESERVED"],
    },
  },
} as const
