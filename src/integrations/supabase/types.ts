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
      audio_phone_imitations: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          imitator_player_id: string
          imitator_player_name: string
          original_recording_id: string
          reversed_storage_path: string | null
          round_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          imitator_player_id: string
          imitator_player_name: string
          original_recording_id: string
          reversed_storage_path?: string | null
          round_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          imitator_player_id?: string
          imitator_player_name?: string
          original_recording_id?: string
          reversed_storage_path?: string | null
          round_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_phone_imitations_original_recording_id_fkey"
            columns: ["original_recording_id"]
            isOneToOne: false
            referencedRelation: "audio_phone_recordings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audio_phone_imitations_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "audio_phone_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      audio_phone_recordings: {
        Row: {
          created_at: string
          duration_seconds: number
          id: string
          player_id: string
          player_name: string
          player_order_index: number
          reversed_storage_path: string | null
          round_id: string
          storage_path: string
          transcribed_text: string | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number
          id?: string
          player_id: string
          player_name: string
          player_order_index: number
          reversed_storage_path?: string | null
          round_id: string
          storage_path: string
          transcribed_text?: string | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          id?: string
          player_id?: string
          player_name?: string
          player_order_index?: number
          reversed_storage_path?: string | null
          round_id?: string
          storage_path?: string
          transcribed_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audio_phone_recordings_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "audio_phone_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      audio_phone_rounds: {
        Row: {
          created_at: string
          current_phrase_index: number | null
          current_player_index: number
          id: string
          lobby_id: string
          max_recording_seconds: number
          original_phrase: string | null
          phase: string
          player_order: string[]
          reveal_is_playing: boolean | null
          reveal_phrase_index: number | null
          reveal_step: string | null
          round_number: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_phrase_index?: number | null
          current_player_index?: number
          id?: string
          lobby_id: string
          max_recording_seconds?: number
          original_phrase?: string | null
          phase?: string
          player_order: string[]
          reveal_is_playing?: boolean | null
          reveal_phrase_index?: number | null
          reveal_step?: string | null
          round_number?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_phrase_index?: number | null
          current_player_index?: number
          id?: string
          lobby_id?: string
          max_recording_seconds?: number
          original_phrase?: string | null
          phase?: string
          player_order?: string[]
          reveal_is_playing?: boolean | null
          reveal_phrase_index?: number | null
          reveal_step?: string | null
          round_number?: number
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          lobby_id: string
          message_type: string
          player_id: string
          player_name: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          lobby_id: string
          message_type?: string
          player_id: string
          player_name: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          lobby_id?: string
          message_type?: string
          player_id?: string
          player_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read_at: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      friend_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      game_invitations: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          lobby_code: string
          receiver_id: string
          sender_id: string
          sender_name: string
          status: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          lobby_code: string
          receiver_id: string
          sender_id: string
          sender_name: string
          status?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          lobby_code?: string
          receiver_id?: string
          sender_id?: string
          sender_name?: string
          status?: string
        }
        Relationships: []
      }
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
      game_teams: {
        Row: {
          created_at: string
          id: string
          lobby_id: string
          player_id: string
          player_name: string
          team_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          lobby_id: string
          player_id: string
          player_name: string
          team_number: number
        }
        Update: {
          created_at?: string
          id?: string
          lobby_id?: string
          player_id?: string
          player_name?: string
          team_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_teams_lobby_id_fkey"
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
          game_mode: string
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
          game_mode?: string
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
          game_mode?: string
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
          connection_status: string
          disconnected_at: string | null
          id: string
          is_host: boolean
          joined_at: string
          lobby_id: string
          player_id: string
          player_name: string
        }
        Insert: {
          connection_status?: string
          disconnected_at?: string | null
          id?: string
          is_host?: boolean
          joined_at?: string
          lobby_id: string
          player_id: string
          player_name: string
        }
        Update: {
          connection_status?: string
          disconnected_at?: string | null
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
      monopoly_actions: {
        Row: {
          action_data: Json | null
          action_type: string
          created_at: string
          game_id: string
          id: string
          player_id: string
        }
        Insert: {
          action_data?: Json | null
          action_type: string
          created_at?: string
          game_id: string
          id?: string
          player_id: string
        }
        Update: {
          action_data?: Json | null
          action_type?: string
          created_at?: string
          game_id?: string
          id?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monopoly_actions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "monopoly_games"
            referencedColumns: ["id"]
          },
        ]
      }
      monopoly_games: {
        Row: {
          created_at: string
          current_player_index: number
          doubles_count: number
          free_parking_pot: number
          id: string
          is_finished: boolean
          last_dice_1: number | null
          last_dice_2: number | null
          lobby_id: string
          phase: string
          player_order: string[]
          trade_from_player: string | null
          trade_offer: Json | null
          trade_to_player: string | null
          updated_at: string
          winner_id: string | null
          winner_name: string | null
        }
        Insert: {
          created_at?: string
          current_player_index?: number
          doubles_count?: number
          free_parking_pot?: number
          id?: string
          is_finished?: boolean
          last_dice_1?: number | null
          last_dice_2?: number | null
          lobby_id: string
          phase?: string
          player_order?: string[]
          trade_from_player?: string | null
          trade_offer?: Json | null
          trade_to_player?: string | null
          updated_at?: string
          winner_id?: string | null
          winner_name?: string | null
        }
        Update: {
          created_at?: string
          current_player_index?: number
          doubles_count?: number
          free_parking_pot?: number
          id?: string
          is_finished?: boolean
          last_dice_1?: number | null
          last_dice_2?: number | null
          lobby_id?: string
          phase?: string
          player_order?: string[]
          trade_from_player?: string | null
          trade_offer?: Json | null
          trade_to_player?: string | null
          updated_at?: string
          winner_id?: string | null
          winner_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monopoly_games_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: true
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
        ]
      }
      monopoly_players: {
        Row: {
          created_at: string
          game_id: string
          has_get_out_of_jail_card: number
          id: string
          in_jail: boolean
          is_bankrupt: boolean
          jail_turns: number
          money: number
          player_id: string
          player_name: string
          player_order: number
          position: number
          token_type: string
        }
        Insert: {
          created_at?: string
          game_id: string
          has_get_out_of_jail_card?: number
          id?: string
          in_jail?: boolean
          is_bankrupt?: boolean
          jail_turns?: number
          money?: number
          player_id: string
          player_name: string
          player_order?: number
          position?: number
          token_type?: string
        }
        Update: {
          created_at?: string
          game_id?: string
          has_get_out_of_jail_card?: number
          id?: string
          in_jail?: boolean
          is_bankrupt?: boolean
          jail_turns?: number
          money?: number
          player_id?: string
          player_name?: string
          player_order?: number
          position?: number
          token_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "monopoly_players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "monopoly_games"
            referencedColumns: ["id"]
          },
        ]
      }
      monopoly_properties: {
        Row: {
          created_at: string
          game_id: string
          houses: number
          id: string
          is_mortgaged: boolean
          owner_id: string | null
          property_index: number
        }
        Insert: {
          created_at?: string
          game_id: string
          houses?: number
          id?: string
          is_mortgaged?: boolean
          owner_id?: string | null
          property_index: number
        }
        Update: {
          created_at?: string
          game_id?: string
          houses?: number
          id?: string
          is_mortgaged?: boolean
          owner_id?: string | null
          property_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "monopoly_properties_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "monopoly_games"
            referencedColumns: ["id"]
          },
        ]
      }
      pixoguess_guesses: {
        Row: {
          created_at: string
          guess: string
          guess_time_ms: number
          id: string
          is_correct: boolean
          lobby_id: string
          player_id: string
          player_name: string
          points_earned: number
          round_number: number
        }
        Insert: {
          created_at?: string
          guess: string
          guess_time_ms: number
          id?: string
          is_correct?: boolean
          lobby_id: string
          player_id: string
          player_name: string
          points_earned?: number
          round_number: number
        }
        Update: {
          created_at?: string
          guess?: string
          guess_time_ms?: number
          id?: string
          is_correct?: boolean
          lobby_id?: string
          player_id?: string
          player_name?: string
          points_earned?: number
          round_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "pixoguess_guesses_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
        ]
      }
      pixoguess_rounds: {
        Row: {
          acceptable_answers: string[] | null
          category: string | null
          correct_answer: string
          created_at: string
          id: string
          image_url: string
          lobby_id: string
          phase: string
          round_number: number
          started_at: string | null
          winner_id: string | null
          winner_name: string | null
        }
        Insert: {
          acceptable_answers?: string[] | null
          category?: string | null
          correct_answer: string
          created_at?: string
          id?: string
          image_url: string
          lobby_id: string
          phase?: string
          round_number?: number
          started_at?: string | null
          winner_id?: string | null
          winner_name?: string | null
        }
        Update: {
          acceptable_answers?: string[] | null
          category?: string | null
          correct_answer?: string
          created_at?: string
          id?: string
          image_url?: string
          lobby_id?: string
          phase?: string
          round_number?: number
          started_at?: string | null
          winner_id?: string | null
          winner_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pixoguess_rounds_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
        ]
      }
      player_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
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
      player_global_avatars: {
        Row: {
          avatar_type: string
          background_color: string | null
          created_at: string
          id: string
          image_url: string | null
          player_id: string
          updated_at: string
        }
        Insert: {
          avatar_type?: string
          background_color?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          player_id: string
          updated_at?: string
        }
        Update: {
          avatar_type?: string
          background_color?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          player_id?: string
          updated_at?: string
        }
        Relationships: []
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
      player_rewards: {
        Row: {
          id: string
          is_equipped: boolean | null
          reward_id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          id?: string
          is_equipped?: boolean | null
          reward_id: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          id?: string
          is_equipped?: boolean | null
          reward_id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      player_stats: {
        Row: {
          audio_phone_games: number | null
          best_login_streak_days: number
          best_streak: number | null
          chat_color: string | null
          created_at: string
          current_streak: number | null
          current_xp: number | null
          equipped_voice_filter: string | null
          games_hosted: number | null
          games_played: number | null
          games_won: number | null
          id: string
          last_login_date: string | null
          level: number | null
          login_streak_days: number
          messages_sent: number | null
          quiz_games: number | null
          recordings_made: number | null
          standard_games: number | null
          total_play_time_minutes: number | null
          total_xp: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          audio_phone_games?: number | null
          best_login_streak_days?: number
          best_streak?: number | null
          chat_color?: string | null
          created_at?: string
          current_streak?: number | null
          current_xp?: number | null
          equipped_voice_filter?: string | null
          games_hosted?: number | null
          games_played?: number | null
          games_won?: number | null
          id?: string
          last_login_date?: string | null
          level?: number | null
          login_streak_days?: number
          messages_sent?: number | null
          quiz_games?: number | null
          recordings_made?: number | null
          standard_games?: number | null
          total_play_time_minutes?: number | null
          total_xp?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          audio_phone_games?: number | null
          best_login_streak_days?: number
          best_streak?: number | null
          chat_color?: string | null
          created_at?: string
          current_streak?: number | null
          current_xp?: number | null
          equipped_voice_filter?: string | null
          games_hosted?: number | null
          games_played?: number | null
          games_won?: number | null
          id?: string
          last_login_date?: string | null
          level?: number | null
          login_streak_days?: number
          messages_sent?: number | null
          quiz_games?: number | null
          recordings_made?: number | null
          standard_games?: number | null
          total_play_time_minutes?: number | null
          total_xp?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quest_progress: {
        Row: {
          created_at: string
          id: string
          is_claimed: boolean
          period_key: string
          progress: number
          quest_id: string
          quest_kind: string
          target: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_claimed?: boolean
          period_key: string
          progress?: number
          quest_id: string
          quest_kind: string
          target?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_claimed?: boolean
          period_key?: string
          progress?: number
          quest_id?: string
          quest_kind?: string
          target?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_answers: {
        Row: {
          answer: string
          answered_at: string
          created_at: string
          id: string
          is_correct: boolean
          lobby_id: string
          player_id: string
          player_name: string
          points_earned: number
          response_time_ms: number
          round_number: number
        }
        Insert: {
          answer: string
          answered_at?: string
          created_at?: string
          id?: string
          is_correct?: boolean
          lobby_id: string
          player_id: string
          player_name: string
          points_earned?: number
          response_time_ms?: number
          round_number?: number
        }
        Update: {
          answer?: string
          answered_at?: string
          created_at?: string
          id?: string
          is_correct?: boolean
          lobby_id?: string
          player_id?: string
          player_name?: string
          points_earned?: number
          response_time_ms?: number
          round_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answers_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_rounds: {
        Row: {
          answer_duration_ms: number
          category: string
          correct_answer: string
          created_at: string
          difficulty: string
          difficulty_filter: string | null
          id: string
          lobby_id: string
          options: string[] | null
          phase: string
          question_mode: string
          question_text: string
          question_type: string | null
          round_number: number
          started_at: string | null
          total_rounds: number
        }
        Insert: {
          answer_duration_ms?: number
          category?: string
          correct_answer: string
          created_at?: string
          difficulty?: string
          difficulty_filter?: string | null
          id?: string
          lobby_id: string
          options?: string[] | null
          phase?: string
          question_mode?: string
          question_text: string
          question_type?: string | null
          round_number?: number
          started_at?: string | null
          total_rounds?: number
        }
        Update: {
          answer_duration_ms?: number
          category?: string
          correct_answer?: string
          created_at?: string
          difficulty?: string
          difficulty_filter?: string | null
          id?: string
          lobby_id?: string
          options?: string[] | null
          phase?: string
          question_mode?: string
          question_text?: string
          question_type?: string | null
          round_number?: number
          started_at?: string | null
          total_rounds?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_rounds_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_scores: {
        Row: {
          average_time_ms: number
          correct_answers: number
          created_at: string
          id: string
          lobby_id: string
          player_id: string
          player_name: string
          total_points: number
        }
        Insert: {
          average_time_ms?: number
          correct_answers?: number
          created_at?: string
          id?: string
          lobby_id: string
          player_id: string
          player_name: string
          total_points?: number
        }
        Update: {
          average_time_ms?: number
          correct_answers?: number
          created_at?: string
          id?: string
          lobby_id?: string
          player_id?: string
          player_name?: string
          total_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_scores_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
        ]
      }
      social_post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          caption: string | null
          challenge_clip_id: string | null
          clip_id: string
          created_at: string
          id: string
          is_featured: boolean
          is_hidden: boolean
          likes_count: number
          owner_id: string
          owner_name: string
          views_count: number
          week_key: string
        }
        Insert: {
          caption?: string | null
          challenge_clip_id?: string | null
          clip_id: string
          created_at?: string
          id?: string
          is_featured?: boolean
          is_hidden?: boolean
          likes_count?: number
          owner_id: string
          owner_name: string
          views_count?: number
          week_key: string
        }
        Update: {
          caption?: string | null
          challenge_clip_id?: string | null
          clip_id?: string
          created_at?: string
          id?: string
          is_featured?: boolean
          is_hidden?: boolean
          likes_count?: number
          owner_id?: string
          owner_name?: string
          views_count?: number
          week_key?: string
        }
        Relationships: []
      }
      undercover_games: {
        Row: {
          civilian_wins: number
          civilian_word: string
          clue_pass: number
          created_at: string
          current_player_index: number
          current_round: number
          eliminated_player_id: string | null
          eliminated_role: string | null
          enable_mr_white: boolean
          id: string
          is_finished: boolean
          lobby_id: string
          num_undercover: number
          phase: string
          player_order: string[]
          settings_locked: boolean
          total_rounds: number
          undercover_wins: number
          undercover_word: string
          updated_at: string
          winner_role: string | null
        }
        Insert: {
          civilian_wins?: number
          civilian_word: string
          clue_pass?: number
          created_at?: string
          current_player_index?: number
          current_round?: number
          eliminated_player_id?: string | null
          eliminated_role?: string | null
          enable_mr_white?: boolean
          id?: string
          is_finished?: boolean
          lobby_id: string
          num_undercover?: number
          phase?: string
          player_order?: string[]
          settings_locked?: boolean
          total_rounds?: number
          undercover_wins?: number
          undercover_word: string
          updated_at?: string
          winner_role?: string | null
        }
        Update: {
          civilian_wins?: number
          civilian_word?: string
          clue_pass?: number
          created_at?: string
          current_player_index?: number
          current_round?: number
          eliminated_player_id?: string | null
          eliminated_role?: string | null
          enable_mr_white?: boolean
          id?: string
          is_finished?: boolean
          lobby_id?: string
          num_undercover?: number
          phase?: string
          player_order?: string[]
          settings_locked?: boolean
          total_rounds?: number
          undercover_wins?: number
          undercover_word?: string
          updated_at?: string
          winner_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "undercover_games_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: true
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
        ]
      }
      undercover_players: {
        Row: {
          created_at: string
          current_clue: string | null
          game_id: string
          id: string
          is_alive: boolean
          player_id: string
          player_name: string
          role: string
          vote_target: string | null
          word: string | null
        }
        Insert: {
          created_at?: string
          current_clue?: string | null
          game_id: string
          id?: string
          is_alive?: boolean
          player_id: string
          player_name: string
          role?: string
          vote_target?: string | null
          word?: string | null
        }
        Update: {
          created_at?: string
          current_clue?: string | null
          game_id?: string
          id?: string
          is_alive?: boolean
          player_id?: string
          player_name?: string
          role?: string
          vote_target?: string | null
          word?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "undercover_players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "undercover_games"
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
      bump_quest_progress: {
        Args: {
          p_increment?: number
          p_period_key: string
          p_quest_id: string
          p_quest_kind: string
          p_target: number
        }
        Returns: number
      }
      claim_quest_reward: {
        Args: { p_period_key: string; p_quest_id: string; p_xp_reward: number }
        Returns: number
      }
      cleanup_old_lobbies: { Args: never; Returns: undefined }
      generate_friend_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      publish_social_post: {
        Args: {
          p_caption: string
          p_challenge_clip_id: string
          p_clip_id: string
        }
        Returns: string
      }
      toggle_social_like: { Args: { p_post_id: string }; Returns: boolean }
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
