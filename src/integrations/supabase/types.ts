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
      announcements: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          pinned: boolean
          program: Database["public"]["Enums"]["program_type"]
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          pinned?: boolean
          program: Database["public"]["Enums"]["program_type"]
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          pinned?: boolean
          program?: Database["public"]["Enums"]["program_type"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          sender_id: string
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender_id: string
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_thread_members: {
        Row: {
          joined_at: string
          last_read_at: string
          thread_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          last_read_at?: string
          thread_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          last_read_at?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_thread_members_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          cohort: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["thread_kind"]
          program: Database["public"]["Enums"]["program_type"] | null
          title: string | null
        }
        Insert: {
          cohort?: string | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["thread_kind"]
          program?: Database["public"]["Enums"]["program_type"] | null
          title?: string | null
        }
        Update: {
          cohort?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["thread_kind"]
          program?: Database["public"]["Enums"]["program_type"] | null
          title?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
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
          last_seen_announcements_at: string | null
          managed_by_parent: boolean
          notification_prefs: Json
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
          last_seen_announcements_at?: string | null
          managed_by_parent?: boolean
          notification_prefs?: Json
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
          last_seen_announcements_at?: string | null
          managed_by_parent?: boolean
          notification_prefs?: Json
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
      sessions: {
        Row: {
          cohort: string | null
          created_at: string
          created_by: string
          description: string | null
          ends_at: string
          id: string
          mentor_id: string | null
          program: Database["public"]["Enums"]["program_type"]
          starts_at: string
          title: string
          updated_at: string
          zoom_meeting_id: string | null
          zoom_passcode: string | null
          zoom_start_url: string | null
          zoom_url: string | null
        }
        Insert: {
          cohort?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          ends_at: string
          id?: string
          mentor_id?: string | null
          program: Database["public"]["Enums"]["program_type"]
          starts_at: string
          title: string
          updated_at?: string
          zoom_meeting_id?: string | null
          zoom_passcode?: string | null
          zoom_start_url?: string | null
          zoom_url?: string | null
        }
        Update: {
          cohort?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string
          id?: string
          mentor_id?: string | null
          program?: Database["public"]["Enums"]["program_type"]
          starts_at?: string
          title?: string
          updated_at?: string
          zoom_meeting_id?: string | null
          zoom_passcode?: string | null
          zoom_start_url?: string | null
          zoom_url?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
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
      week_lessons: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          position: number
          program: Database["public"]["Enums"]["program_type"]
          title: string
          updated_at: string
          week_number: number
        }
        Insert: {
          author_id: string
          body?: string
          created_at?: string
          id?: string
          position?: number
          program: Database["public"]["Enums"]["program_type"]
          title: string
          updated_at?: string
          week_number: number
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          position?: number
          program?: Database["public"]["Enums"]["program_type"]
          title?: string
          updated_at?: string
          week_number?: number
        }
        Relationships: []
      }
      weekly_checkin_sends: {
        Row: {
          created_at: string
          sent_for_week: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          sent_for_week: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          sent_for_week?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_checkin_sends_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
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
      zoom_connections: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          refresh_token: string
          scope: string | null
          updated_at: string
          user_id: string
          zoom_email: string | null
          zoom_user_id: string | null
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          refresh_token: string
          scope?: string | null
          updated_at?: string
          user_id: string
          zoom_email?: string | null
          zoom_user_id?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          refresh_token?: string
          scope?: string | null
          updated_at?: string
          user_id?: string
          zoom_email?: string | null
          zoom_user_id?: string | null
        }
        Relationships: []
      }
      zoom_oauth_states: {
        Row: {
          created_at: string
          state: string
          user_id: string
        }
        Insert: {
          created_at?: string
          state: string
          user_id: string
        }
        Update: {
          created_at?: string
          state?: string
          user_id?: string
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
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
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
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_thread_member: {
        Args: { _thread_id: string; _user_id: string }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "mentee" | "mentor" | "admin" | "parent"
      log_category: "mentee_wins" | "engagement" | "family_liaison"
      profile_status: "active" | "pending" | "inactive"
      program_type: "vanguard" | "flow"
      thread_kind: "direct" | "group"
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
      thread_kind: ["direct", "group"],
    },
  },
} as const
