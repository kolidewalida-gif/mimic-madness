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
      game_rounds: {
        Row: {
          challenge_player_id: string
          created_at: string
          current_challenge_id: string
          id: string
          lobby_id: string
          phase: string
          round_number: number
        }
        Insert: {
          challenge_player_id: string
          created_at?: string
          current_challenge_id: string
          id?: string
          lobby_id: string
          phase?: string
          round_number?: number
        }
        Update: {
          challenge_player_id?: string
          created_at?: string
          current_challenge_id?: string
          id?: string
          lobby_id?: string
          phase?: string
          round_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_rounds_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
        ]
      }
      imitation_votes: {
        Row: {
          created_at: string
          id: string
          imitation_player_id: string
          lobby_id: string
          round_number: number
          vote_type: string
          voter_player_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          imitation_player_id: string
          lobby_id: string
          round_number?: number
          vote_type: string
          voter_player_id: string
        }
        Update: {
          created_at?: string
          id?: string
          imitation_player_id?: string
          lobby_id?: string
          round_number?: number
          vote_type?: string
          voter_player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "imitation_votes_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
        ]
      }
      lobbies: {
        Row: {
          code: string
          created_at: string
          game_phase: string | null
          host_id: string
          id: string
          max_players: number | null
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          game_phase?: string | null
          host_id: string
          id?: string
          max_players?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          game_phase?: string | null
          host_id?: string
          id?: string
          max_players?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      lobby_players: {
        Row: {
          id: string
          is_host: boolean
          joined_at: string
          lobby_id: string
          player_id: string
          player_name: string
        }
        Insert: {
          id?: string
          is_host?: boolean
          joined_at?: string
          lobby_id: string
          player_id: string
          player_name: string
        }
        Update: {
          id?: string
          is_host?: boolean
          joined_at?: string
          lobby_id?: string
          player_id?: string
          player_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "lobby_players_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
        ]
      }
      player_avatars: {
        Row: {
          avatar_type: string
          background_color: string | null
          created_at: string
          id: string
          image_url: string | null
          lobby_id: string
          player_id: string
          updated_at: string
        }
        Insert: {
          avatar_type?: string
          background_color?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          lobby_id: string
          player_id: string
          updated_at?: string
        }
        Update: {
          avatar_type?: string
          background_color?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          lobby_id?: string
          player_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_avatars_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
        ]
      }
      player_imitations: {
        Row: {
          created_at: string
          id: string
          include_original_audio: boolean
          is_ready: boolean
          lobby_id: string
          original_audio_volume: number
          player_id: string
          player_name: string
          round_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          include_original_audio?: boolean
          is_ready?: boolean
          lobby_id: string
          original_audio_volume?: number
          player_id: string
          player_name: string
          round_number?: number
        }
        Update: {
          created_at?: string
          id?: string
          include_original_audio?: boolean
          is_ready?: boolean
          lobby_id?: string
          original_audio_volume?: number
          player_id?: string
          player_name?: string
          round_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_imitations_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
        ]
      }
      player_submissions: {
        Row: {
          challenges_count: number
          id: string
          lobby_id: string
          player_id: string
          player_name: string
          submitted_at: string
        }
        Insert: {
          challenges_count?: number
          id?: string
          lobby_id: string
          player_id: string
          player_name: string
          submitted_at?: string
        }
        Update: {
          challenges_count?: number
          id?: string
          lobby_id?: string
          player_id?: string
          player_name?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_submissions_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
        ]
      }
      video_clips: {
        Row: {
          created_at: string
          duration: number
          end_time: number
          id: string
          is_muted: boolean
          lobby_id: string | null
          name: string
          player_id: string
          player_name: string
          round_number: number | null
          start_time: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          duration: number
          end_time: number
          id: string
          is_muted?: boolean
          lobby_id?: string | null
          name: string
          player_id: string
          player_name: string
          round_number?: number | null
          start_time?: number
          storage_path: string
        }
        Update: {
          created_at?: string
          duration?: number
          end_time?: number
          id?: string
          is_muted?: boolean
          lobby_id?: string | null
          name?: string
          player_id?: string
          player_name?: string
          round_number?: number | null
          start_time?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_clips_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
        ]
      }
      voting_session: {
        Row: {
          created_at: string
          current_imitation_index: number
          id: string
          is_playing: boolean
          lobby_id: string
          round_number: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_imitation_index?: number
          id?: string
          is_playing?: boolean
          lobby_id: string
          round_number?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_imitation_index?: number
          id?: string
          is_playing?: boolean
          lobby_id?: string
          round_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "voting_session_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_lobbies: { Args: never; Returns: undefined }
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
