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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      aura_cards: {
        Row: {
          aura_type: string
          created_at: string
          headline: string
          id: string
          image_url: string | null
          is_public: boolean
          lines: Json
          mode: Database["public"]["Enums"]["scan_mode"]
          percentile: number
          public_id: string
          rarity: string
          scan_id: string | null
          score: number
          user_id: string
          visual: Json
        }
        Insert: {
          aura_type: string
          created_at?: string
          headline: string
          id?: string
          image_url?: string | null
          is_public?: boolean
          lines?: Json
          mode: Database["public"]["Enums"]["scan_mode"]
          percentile: number
          public_id?: string
          rarity: string
          scan_id?: string | null
          score: number
          user_id: string
          visual?: Json
        }
        Update: {
          aura_type?: string
          created_at?: string
          headline?: string
          id?: string
          image_url?: string | null
          is_public?: boolean
          lines?: Json
          mode?: Database["public"]["Enums"]["scan_mode"]
          percentile?: number
          public_id?: string
          rarity?: string
          scan_id?: string | null
          score?: number
          user_id?: string
          visual?: Json
        }
        Relationships: [
          {
            foreignKeyName: "aura_cards_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          callee_id: string
          caller_id: string
          chat_id: string | null
          created_at: string
          ended_at: string | null
          id: string
          kind: string
          started_at: string | null
          state: string
        }
        Insert: {
          callee_id: string
          caller_id: string
          chat_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          kind: string
          started_at?: string | null
          state?: string
        }
        Update: {
          callee_id?: string
          caller_id?: string
          chat_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          kind?: string
          started_at?: string | null
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          body: string | null
          chat_id: string
          created_at: string
          deleted_at: string | null
          id: string
          media_url: string | null
          reaction: Database["public"]["Enums"]["reaction_key"] | null
          read_at: string | null
          reply_to: string | null
          sender_id: string
        }
        Insert: {
          body?: string | null
          chat_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          media_url?: string | null
          reaction?: Database["public"]["Enums"]["reaction_key"] | null
          read_at?: string | null
          reply_to?: string | null
          sender_id: string
        }
        Update: {
          body?: string | null
          chat_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          media_url?: string | null
          reaction?: Database["public"]["Enums"]["reaction_key"] | null
          read_at?: string | null
          reply_to?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participants: {
        Row: {
          chat_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          chat_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          chat_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          created_at: string
          created_by: string
          id: string
          kind: string
          last_message_at: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          kind?: string
          last_message_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          kind?: string
          last_message_at?: string | null
        }
        Relationships: []
      }
      crush_selections: {
        Row: {
          created_at: string
          crush_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          crush_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          crush_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      feed_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction: Database["public"]["Enums"]["reaction_key"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction: Database["public"]["Enums"]["reaction_key"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction?: Database["public"]["Enums"]["reaction_key"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "vibe_feed"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          category: string
          created_at: string
          id: string
          is_read: boolean
          payload: Json
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          category: string
          created_at?: string
          id?: string
          is_read?: boolean
          payload?: Json
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          payload?: Json
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string
          country_code: string | null
          created_at: string
          currency: string
          display_name: string
          id: string
          is_private: boolean
          is_verified: boolean
          language: string
          metadata: Json
          timezone: string
          updated_at: string
          username: string
          vibers_count: number
          vibing_count: number
        }
        Insert: {
          avatar_url?: string | null
          bio?: string
          country_code?: string | null
          created_at?: string
          currency?: string
          display_name?: string
          id: string
          is_private?: boolean
          is_verified?: boolean
          language?: string
          metadata?: Json
          timezone?: string
          updated_at?: string
          username: string
          vibers_count?: number
          vibing_count?: number
        }
        Update: {
          avatar_url?: string | null
          bio?: string
          country_code?: string | null
          created_at?: string
          currency?: string
          display_name?: string
          id?: string
          is_private?: boolean
          is_verified?: boolean
          language?: string
          metadata?: Json
          timezone?: string
          updated_at?: string
          username?: string
          vibers_count?: number
          vibing_count?: number
        }
        Relationships: []
      }
      reel_reactions: {
        Row: {
          created_at: string
          id: string
          reaction: Database["public"]["Enums"]["reaction_key"]
          reel_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction: Database["public"]["Enums"]["reaction_key"]
          reel_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction?: Database["public"]["Enums"]["reaction_key"]
          reel_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_reactions_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
        ]
      }
      reels: {
        Row: {
          audio_label: string | null
          caption: string
          category: string
          created_at: string
          creator_id: string
          duration_seconds: number | null
          hashtags: string[]
          id: string
          is_published: boolean
          is_sponsored: boolean
          moderation_state: string
          thumbnail_url: string | null
          updated_at: string
          video_url: string | null
          views_count: number
          watch_seconds: number
        }
        Insert: {
          audio_label?: string | null
          caption?: string
          category?: string
          created_at?: string
          creator_id: string
          duration_seconds?: number | null
          hashtags?: string[]
          id?: string
          is_published?: boolean
          is_sponsored?: boolean
          moderation_state?: string
          thumbnail_url?: string | null
          updated_at?: string
          video_url?: string | null
          views_count?: number
          watch_seconds?: number
        }
        Update: {
          audio_label?: string | null
          caption?: string
          category?: string
          created_at?: string
          creator_id?: string
          duration_seconds?: number | null
          hashtags?: string[]
          id?: string
          is_published?: boolean
          is_sponsored?: boolean
          moderation_state?: string
          thumbnail_url?: string | null
          updated_at?: string
          video_url?: string | null
          views_count?: number
          watch_seconds?: number
        }
        Relationships: []
      }
      scans: {
        Row: {
          created_at: string
          id: string
          mode: Database["public"]["Enums"]["scan_mode"]
          result: Json
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mode: Database["public"]["Enums"]["scan_mode"]
          result?: Json
          source?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mode?: Database["public"]["Enums"]["scan_mode"]
          result?: Json
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      secret_messages: {
        Row: {
          body: string
          created_at: string
          hint: string
          id: string
          is_hidden: boolean
          is_read: boolean
          moderation_state: string
          recipient_id: string
          sender_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          hint?: string
          id?: string
          is_hidden?: boolean
          is_read?: boolean
          moderation_state?: string
          recipient_id: string
          sender_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          hint?: string
          id?: string
          is_hidden?: boolean
          is_read?: boolean
          moderation_state?: string
          recipient_id?: string
          sender_id?: string | null
        }
        Relationships: []
      }
      secret_replies: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          message_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          message_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "secret_replies_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "secret_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      social_connections: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
          state: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
          state?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
          state?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          animation_level: string
          app_language: string
          captions_enabled: boolean
          contact_discovery: boolean
          content_languages: string[]
          created_at: string
          currency_display: string | null
          data_saver: boolean
          email_enabled: boolean
          extras: Json
          font_scale: number
          in_app_enabled: boolean
          muted_words: string[]
          neon_intensity: number
          personalization: boolean
          push_enabled: boolean
          quiet_hours_end: number | null
          quiet_hours_start: number | null
          read_receipts: boolean
          reduced_motion: boolean
          reel_autoplay: boolean
          region: string | null
          searchable: boolean
          sensitive_content: string
          show_online_status: boolean
          theme: string
          translation_language: string | null
          typing_indicators: boolean
          updated_at: string
          user_id: string
          video_quality: string
          who_can_call: string
          who_can_comment: string
          who_can_message: string
          who_can_send_secrets: string
          who_can_tag: string
          wifi_only_downloads: boolean
        }
        Insert: {
          animation_level?: string
          app_language?: string
          captions_enabled?: boolean
          contact_discovery?: boolean
          content_languages?: string[]
          created_at?: string
          currency_display?: string | null
          data_saver?: boolean
          email_enabled?: boolean
          extras?: Json
          font_scale?: number
          in_app_enabled?: boolean
          muted_words?: string[]
          neon_intensity?: number
          personalization?: boolean
          push_enabled?: boolean
          quiet_hours_end?: number | null
          quiet_hours_start?: number | null
          read_receipts?: boolean
          reduced_motion?: boolean
          reel_autoplay?: boolean
          region?: string | null
          searchable?: boolean
          sensitive_content?: string
          show_online_status?: boolean
          theme?: string
          translation_language?: string | null
          typing_indicators?: boolean
          updated_at?: string
          user_id: string
          video_quality?: string
          who_can_call?: string
          who_can_comment?: string
          who_can_message?: string
          who_can_send_secrets?: string
          who_can_tag?: string
          wifi_only_downloads?: boolean
        }
        Update: {
          animation_level?: string
          app_language?: string
          captions_enabled?: boolean
          contact_discovery?: boolean
          content_languages?: string[]
          created_at?: string
          currency_display?: string | null
          data_saver?: boolean
          email_enabled?: boolean
          extras?: Json
          font_scale?: number
          in_app_enabled?: boolean
          muted_words?: string[]
          neon_intensity?: number
          personalization?: boolean
          push_enabled?: boolean
          quiet_hours_end?: number | null
          quiet_hours_start?: number | null
          read_receipts?: boolean
          reduced_motion?: boolean
          reel_autoplay?: boolean
          region?: string | null
          searchable?: boolean
          sensitive_content?: string
          show_online_status?: boolean
          theme?: string
          translation_language?: string | null
          typing_indicators?: boolean
          updated_at?: string
          user_id?: string
          video_quality?: string
          who_can_call?: string
          who_can_comment?: string
          who_can_message?: string
          who_can_send_secrets?: string
          who_can_tag?: string
          wifi_only_downloads?: boolean
        }
        Relationships: []
      }
      user_restrictions: {
        Row: {
          created_at: string
          id: string
          kind: string
          target_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          target_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          target_id?: string
          user_id?: string
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
      vibe_feed: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          image_url: string | null
          is_anonymous: boolean
          moderation_state: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_anonymous?: boolean
          moderation_state?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_anonymous?: boolean
          moderation_state?: string
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
      is_chat_member: {
        Args: { _chat_id: string; _user_id: string }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      reaction_key: "vibe" | "curious" | "savage" | "lol"
      scan_mode: "secrets" | "love" | "future"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
      reaction_key: ["vibe", "curious", "savage", "lol"],
      scan_mode: ["secrets", "love", "future"],
    },
  },
} as const
