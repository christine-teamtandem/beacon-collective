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
      mentor_assignments: {
        Row: {
          created_at: string
          id: string
          mentee_id: string
          mentor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mentee_id: string
          mentor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mentee_id?: string
          mentor_id?: string
        }
        Relationships: []
      }
      parent_links: {
        Row: {
          child_id: string
          created_at: string
          id: string
          parent_id: string
        }
        Insert: {
          child_id: string
          created_at?: string
          id?: string
          parent_id: string
        }
        Update: {
          child_id?: string
          created_at?: string
          id?: string
          parent_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string
          id: string
          program: Database["public"]["Enums"]["program_type"] | null
          status: Database["public"]["Enums"]["profile_status"]
          updated_at: string
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string
          id: string
          program?: Database["public"]["Enums"]["program_type"] | null
          status?: Database["public"]["Enums"]["profile_status"]
          updated_at?: string
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string
          id?: string
          program?: Database["public"]["Enums"]["program_type"] | null
          status?: Database["public"]["Enums"]["profile_status"]
          updated_at?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          created_at: string
          description: string | null
          external_url: string | null
          id: string
          kind: string
          program: Database["public"]["Enums"]["program_type"]
          storage_bucket: string | null
          storage_path: string | null
          title: string
          updated_at: string
          uploaded_by: string
          week_number: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          external_url?: string | null
          id?: string
          kind?: string
          program: Database["public"]["Enums"]["program_type"]
          storage_bucket?: string | null
          storage_path?: string | null
          title: string
          updated_at?: string
          uploaded_by: string
          week_number?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          external_url?: string | null
          id?: string
          kind?: string
          program?: Database["public"]["Enums"]["program_type"]
          storage_bucket?: string | null
          storage_path?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string
          week_number?: number | null
        }
        Relationships: []
      }
      tracking_logs: {
        Row: {
          category: Database["public"]["Enums"]["log_category"]
          created_at: string
          id: string
          mentee_id: string
          mentor_id: string
          note: string | null
          title: string
          week_number: number | null
        }
        Insert: {
          category: Database["public"]["Enums"]["log_category"]
          created_at?: string
          id?: string
          mentee_id: string
          mentor_id: string
          note?: string | null
          title: string
          week_number?: number | null
        }
        Update: {
          category?: Database["public"]["Enums"]["log_category"]
          created_at?: string
          id?: string
          mentee_id?: string
          mentor_id?: string
          note?: string | null
          title?: string
          week_number?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weekly_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          mentee_id: string
          program: Database["public"]["Enums"]["program_type"]
          reflection: string | null
          updated_at: string
          week_number: number
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          mentee_id: string
          program: Database["public"]["Enums"]["program_type"]
          reflection?: string | null
          updated_at?: string
          week_number: number
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          mentee_id?: string
          program?: Database["public"]["Enums"]["program_type"]
          reflection?: string | null
          updated_at?: string
          week_number?: number
        }
        Relationships: []
      }
      workbook_entries: {
        Row: {
          content: string
          created_at: string
          id: string
          mentee_id: string
          mentor_id: string
          updated_at: string
          week_number: number
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          mentee_id: string
          mentor_id: string
          updated_at?: string
          week_number: number
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          mentee_id?: string
          mentor_id?: string
          updated_at?: string
          week_number?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bucket_program: {
        Args: { _bucket: string }
        Returns: Database["public"]["Enums"]["program_type"]
      }
      get_user_program: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["program_type"]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "mentee" | "mentor" | "admin" | "parent"
      log_category: "mentee_wins" | "engagement" | "family_liaison"
      profile_status: "active" | "pending" | "inactive"
      program_type: "vanguard" | "flow"
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
      app_role: ["mentee", "mentor", "admin", "parent"],
      log_category: ["mentee_wins", "engagement", "family_liaison"],
      profile_status: ["active", "pending", "inactive"],
      program_type: ["vanguard", "flow"],
    },
  },
} as const
