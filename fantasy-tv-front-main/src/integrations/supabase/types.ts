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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_permissions: {
        Row: {
          can_publish_episodes: boolean
          created_at: string
          email: string
          id: string
          invited_at: string
          invited_by: string | null
          role: string
          show_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_publish_episodes?: boolean
          created_at?: string
          email: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          role?: string
          show_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_publish_episodes?: boolean
          created_at?: string
          email?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          role?: string
          show_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_permissions_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      branding_settings: {
        Row: {
          background_image_url: string | null
          contact_email: string | null
          contact_phone: string | null
          cover_image_url: string | null
          created_at: string
          facebook_username: string | null
          id: string
          instagram_username: string | null
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          show_id: string
          tiktok_username: string | null
          twitter_username: string | null
          updated_at: string
        }
        Insert: {
          background_image_url?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          cover_image_url?: string | null
          created_at?: string
          facebook_username?: string | null
          id?: string
          instagram_username?: string | null
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          show_id: string
          tiktok_username?: string | null
          twitter_username?: string | null
          updated_at?: string
        }
        Update: {
          background_image_url?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          cover_image_url?: string | null
          created_at?: string
          facebook_username?: string | null
          id?: string
          instagram_username?: string | null
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          show_id?: string
          tiktok_username?: string | null
          twitter_username?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branding_settings_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: true
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      episodes: {
        Row: {
          active_from_datetime: string | null
          active_until_datetime: string | null
          created_at: string
          episode_duration_minutes: number | null
          episode_duration_seconds: number | null
          episode_name: string
          episode_number: number
          events_count: number
          id: string
          is_active: boolean
          show_id: string
          updated_at: string
        }
        Insert: {
          active_from_datetime?: string | null
          active_until_datetime?: string | null
          created_at?: string
          episode_duration_minutes?: number | null
          episode_duration_seconds?: number | null
          episode_name: string
          episode_number: number
          events_count?: number
          id?: string
          is_active?: boolean
          show_id: string
          updated_at?: string
        }
        Update: {
          active_from_datetime?: string | null
          active_until_datetime?: string | null
          created_at?: string
          episode_duration_minutes?: number | null
          episode_duration_seconds?: number | null
          episode_name?: string
          episode_number?: number
          events_count?: number
          id?: string
          is_active?: boolean
          show_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "episodes_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants: {
        Row: {
          created_at: string
          event_id: string
          id: string
          participant_id: string
          participant_position: number | null
          points_awarded: number
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          participant_id: string
          participant_position?: number | null
          points_awarded?: number
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          participant_id?: string
          participant_position?: number | null
          points_awarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          episode_number: number
          event_date: string | null
          event_offset_minutes: number | null
          event_offset_seconds: number | null
          id: string
          notes: string | null
          participant_id: string | null
          points_awarded: number
          rule_id: string | null
          show_id: string
        }
        Insert: {
          created_at?: string
          episode_number: number
          event_date?: string | null
          event_offset_minutes?: number | null
          event_offset_seconds?: number | null
          id?: string
          notes?: string | null
          participant_id?: string | null
          points_awarded?: number
          rule_id?: string | null
          show_id: string
        }
        Update: {
          created_at?: string
          episode_number?: number
          event_date?: string | null
          event_offset_minutes?: number | null
          event_offset_seconds?: number | null
          id?: string
          notes?: string | null
          participant_id?: string | null
          points_awarded?: number
          rule_id?: string | null
          show_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "game_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      game_rules: {
        Row: {
          created_at: string
          description: string | null
          eliminated_position: number | null
          event_name: string
          event_type: string
          icon: string | null
          id: string
          is_elimination: boolean
          participant_count_mode: string | null
          participants_count: number
          points: number
          points_per_position: Json | null
          show_id: string
          template: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          eliminated_position?: number | null
          event_name: string
          event_type: string
          icon?: string | null
          id?: string
          is_elimination?: boolean
          participant_count_mode?: string | null
          participants_count?: number
          points: number
          points_per_position?: Json | null
          show_id: string
          template?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          eliminated_position?: number | null
          event_name?: string
          event_type?: string
          icon?: string | null
          id?: string
          is_elimination?: boolean
          participant_count_mode?: string | null
          participants_count?: number
          points?: number
          points_per_position?: Json | null
          show_id?: string
          template?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_rules_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      game_settings: {
        Row: {
          bonus_points_enabled: boolean
          budget_amount: number | null
          budget_mode_enabled: boolean
          created_at: string
          episode_reset_interval: number | null
          free_hit_enabled: boolean
          id: string
          language: string
          lock_roster_after_episode: boolean
          max_boys: number | null
          max_girls: number | null
          max_players_per_category: number | null
          min_boys: number
          min_girls: number
          scoring_profile: string
          show_id: string
          team_size: number
          tiebreak_rule: string | null
          transfer_reset_frequency: string
          transfer_window_mode: string
          transfer_windows: Json | null
          transfers_per_reset: number
          updated_at: string
          wildcard_enabled: boolean
        }
        Insert: {
          bonus_points_enabled?: boolean
          budget_amount?: number | null
          budget_mode_enabled?: boolean
          created_at?: string
          episode_reset_interval?: number | null
          free_hit_enabled?: boolean
          id?: string
          language?: string
          lock_roster_after_episode?: boolean
          max_boys?: number | null
          max_girls?: number | null
          max_players_per_category?: number | null
          min_boys?: number
          min_girls?: number
          scoring_profile?: string
          show_id: string
          team_size?: number
          tiebreak_rule?: string | null
          transfer_reset_frequency?: string
          transfer_window_mode?: string
          transfer_windows?: Json | null
          transfers_per_reset?: number
          updated_at?: string
          wildcard_enabled?: boolean
        }
        Update: {
          bonus_points_enabled?: boolean
          budget_amount?: number | null
          budget_mode_enabled?: boolean
          created_at?: string
          episode_reset_interval?: number | null
          free_hit_enabled?: boolean
          id?: string
          language?: string
          lock_roster_after_episode?: boolean
          max_boys?: number | null
          max_girls?: number | null
          max_players_per_category?: number | null
          min_boys?: number
          min_girls?: number
          scoring_profile?: string
          show_id?: string
          team_size?: number
          tiebreak_rule?: string | null
          transfer_reset_frequency?: string
          transfer_window_mode?: string
          transfer_windows?: Json | null
          transfers_per_reset?: number
          updated_at?: string
          wildcard_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "game_settings_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: true
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_page_content: {
        Row: {
          about_description: string | null
          about_items: Json | null
          about_title: string | null
          created_at: string
          faq_items: Json | null
          faq_title: string | null
          hero_subtitle: string | null
          hero_title: string | null
          how_it_works_cards: Json | null
          how_it_works_subtitle: string | null
          how_it_works_title: string | null
          id: string
          show_id: string
          updated_at: string
        }
        Insert: {
          about_description?: string | null
          about_items?: Json | null
          about_title?: string | null
          created_at?: string
          faq_items?: Json | null
          faq_title?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          how_it_works_cards?: Json | null
          how_it_works_subtitle?: string | null
          how_it_works_title?: string | null
          id?: string
          show_id: string
          updated_at?: string
        }
        Update: {
          about_description?: string | null
          about_items?: Json | null
          about_title?: string | null
          created_at?: string
          faq_items?: Json | null
          faq_title?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          how_it_works_cards?: Json | null
          how_it_works_subtitle?: string | null
          how_it_works_title?: string | null
          id?: string
          show_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      league_members: {
        Row: {
          id: string
          joined_at: string
          league_id: string
          show_id: string
          show_user_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          league_id: string
          show_id: string
          show_user_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          league_id?: string
          show_id?: string
          show_user_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_league_members_show_id"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_members_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_members_show_user_id_fkey"
            columns: ["show_user_id"]
            isOneToOne: false
            referencedRelation: "show_users"
            referencedColumns: ["id"]
          },
        ]
      }
      leagues: {
        Row: {
          created_at: string
          description: string | null
          id: string
          invite_code: string | null
          is_public: boolean | null
          max_members: number | null
          name: string
          show_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          invite_code?: string | null
          is_public?: boolean | null
          max_members?: number | null
          name: string
          show_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          invite_code?: string | null
          is_public?: boolean | null
          max_members?: number | null
          name?: string
          show_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leagues_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          age: number | null
          attachments: Json | null
          available_from_episode: number | null
          bio: string | null
          created_at: string
          custom_status_label: string | null
          eliminated_by_event_id: string | null
          eliminated_episode: number | null
          gender: string | null
          hometown: string | null
          id: string
          media_type: string | null
          media_url: string | null
          name: string
          occupation: string | null
          photo_url: string | null
          price: number | null
          role: string | null
          show_id: string
          status: string | null
          updated_at: string
          visibility: string | null
        }
        Insert: {
          age?: number | null
          attachments?: Json | null
          available_from_episode?: number | null
          bio?: string | null
          created_at?: string
          custom_status_label?: string | null
          eliminated_by_event_id?: string | null
          eliminated_episode?: number | null
          gender?: string | null
          hometown?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          name: string
          occupation?: string | null
          photo_url?: string | null
          price?: number | null
          role?: string | null
          show_id: string
          status?: string | null
          updated_at?: string
          visibility?: string | null
        }
        Update: {
          age?: number | null
          attachments?: Json | null
          available_from_episode?: number | null
          bio?: string | null
          created_at?: string
          custom_status_label?: string | null
          eliminated_by_event_id?: string | null
          eliminated_episode?: number | null
          gender?: string | null
          hometown?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          name?: string
          occupation?: string | null
          photo_url?: string | null
          price?: number | null
          role?: string | null
          show_id?: string
          status?: string | null
          updated_at?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "participants_eliminated_by_event_id_fkey"
            columns: ["eliminated_by_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rule_templates: {
        Row: {
          created_at: string
          description: string | null
          event_type: string
          icon: string | null
          id: string
          is_elimination: boolean | null
          name: string
          participant_count_mode: string
          participants_count: number
          points_per_position: Json
          sort_order: number | null
          template: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_type?: string
          icon?: string | null
          id?: string
          is_elimination?: boolean | null
          name: string
          participant_count_mode?: string
          participants_count?: number
          points_per_position: Json
          sort_order?: number | null
          template: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_type?: string
          icon?: string | null
          id?: string
          is_elimination?: boolean | null
          name?: string
          participant_count_mode?: string
          participants_count?: number
          points_per_position?: Json
          sort_order?: number | null
          template?: string
        }
        Relationships: []
      }
      show_updates: {
        Row: {
          body: string
          created_at: string | null
          created_by: string | null
          expire_at: string | null
          id: string
          is_enabled: boolean | null
          media_url: string | null
          publish_at: string
          show_id: string
          title: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          created_by?: string | null
          expire_at?: string | null
          id?: string
          is_enabled?: boolean | null
          media_url?: string | null
          publish_at: string
          show_id: string
          title: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          created_by?: string | null
          expire_at?: string | null
          id?: string
          is_enabled?: boolean | null
          media_url?: string | null
          publish_at?: string
          show_id?: string
          title?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      show_users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          gender: string | null
          gw_points: number
          id: string
          joined_at: string
          show_id: string
          total_points: number
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          gender?: string | null
          gw_points?: number
          id?: string
          joined_at?: string
          show_id: string
          total_points?: number
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          gender?: string | null
          gw_points?: number
          id?: string
          joined_at?: string
          show_id?: string
          total_points?: number
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "show_users_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      shows: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          episode_count: number | null
          genre: string | null
          id: string
          name: string
          season_number: number | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          episode_count?: number | null
          genre?: string | null
          id?: string
          name: string
          season_number?: number | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          episode_count?: number | null
          genre?: string | null
          id?: string
          name?: string
          season_number?: number | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transfers: {
        Row: {
          created_at: string
          effective_from_episode: number | null
          id: string
          participant_in_id: string
          participant_out_id: string
          reset_period: string
          show_id: string
          transfer_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          effective_from_episode?: number | null
          id?: string
          participant_in_id: string
          participant_out_id: string
          reset_period: string
          show_id: string
          transfer_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          effective_from_episode?: number | null
          id?: string
          participant_in_id?: string
          participant_out_id?: string
          reset_period?: string
          show_id?: string
          transfer_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_participant_in_id_fkey"
            columns: ["participant_in_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_participant_out_id_fkey"
            columns: ["participant_out_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      user_teams: {
        Row: {
          added_at: string
          added_episode: number
          created_at: string
          id: string
          participant_id: string
          removed_at: string | null
          removed_episode: number | null
          show_id: string
          slot_position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          added_at?: string
          added_episode?: number
          created_at?: string
          id?: string
          participant_id: string
          removed_at?: string | null
          removed_episode?: number | null
          show_id: string
          slot_position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          added_at?: string
          added_episode?: number
          created_at?: string
          id?: string
          participant_id?: string
          removed_at?: string | null
          removed_episode?: number | null
          show_id?: string
          slot_position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_teams_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_teams_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_admin_invitation: {
        Args: { p_invitation_id: string }
        Returns: Json
      }
      admin_get_show_users_with_live_points: {
        Args: { p_show_id: string }
        Returns: {
          avatar_url: string
          email: string
          gameweek_points: number
          gender: string
          id: string
          joined_at: string
          team_size: number
          total_points: number
          user_id: string
          username: string
        }[]
      }
      admin_get_user_team: {
        Args: {
          p_episode_number?: number
          p_show_id: string
          p_user_id: string
        }
        Returns: {
          added_episode: number
          gameweek_points: number
          participant_id: string
          participant_name: string
          participant_photo_url: string
          removed_episode: number
          slot_position: number
          team_member_id: string
          total_points: number
        }[]
      }
      calculate_participant_points: {
        Args: {
          p_episode_number?: number
          p_participant_id: string
          p_show_id: string
        }
        Returns: number
      }
      calculate_user_gameweek_points: {
        Args: { p_show_id: string }
        Returns: number
      }
      calculate_user_total_points: {
        Args: { p_show_id: string }
        Returns: number
      }
      create_event_with_participants:
        | {
            Args: {
              p_episode_number: number
              p_event_date?: string
              p_notes?: string
              p_participant_ids: string[]
              p_rule_id: string
              p_show_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_episode_number: number
              p_event_date?: string
              p_event_offset_seconds?: number
              p_notes?: string
              p_participant_ids: string[]
              p_rule_id: string
              p_show_id: string
            }
            Returns: Json
          }
      create_league_with_membership: {
        Args: {
          p_description?: string
          p_is_public?: boolean
          p_name: string
          p_show_id: string
        }
        Returns: Json
      }
      decline_admin_invitation: {
        Args: { p_invitation_id: string }
        Returns: Json
      }
      delete_transfer_in_current_round: {
        Args: { p_transfer_id: string }
        Returns: Json
      }
      edit_transfer_in_current_round: {
        Args: {
          p_new_participant_in_id: string
          p_new_participant_out_id: string
          p_transfer_id: string
        }
        Returns: Json
      }
      format_event_display_text: {
        Args: { p_participants: Json; p_template: string }
        Returns: string
      }
      get_current_active_episode: {
        Args: { p_show_id: string }
        Returns: {
          active_from_datetime: string | null
          active_until_datetime: string | null
          created_at: string
          episode_duration_minutes: number | null
          episode_duration_seconds: number | null
          episode_name: string
          episode_number: number
          events_count: number
          id: string
          is_active: boolean
          show_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "episodes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_current_reset_period: { Args: { p_show_id: string }; Returns: string }
      get_current_visible_episode_number: {
        Args: { p_show_id: string }
        Returns: number
      }
      get_episode_events_filtered: {
        Args: {
          p_episode_number: number
          p_only_my_team?: boolean
          p_show_id: string
        }
        Returns: {
          event_id: string
          event_offset_minutes: number
          event_offset_seconds: number
          notes: string
          participants: Json
          rule_icon: string
          rule_id: string
          rule_name: string
          rule_template: string
        }[]
      }
      get_episode_status: {
        Args: {
          p_active_from_datetime: string
          p_active_until_datetime: string
          p_episode_duration_seconds: number
          p_is_active: boolean
        }
        Returns: string
      }
      get_league_insights: {
        Args: { p_last_gws?: number; p_league_id: string }
        Returns: Json
      }
      get_league_leaderboard: {
        Args: { p_league_id: string }
        Returns: {
          avatar_url: string
          gameweek_points: number
          joined_at: string
          member_id: string
          rank: number
          show_user_id: string
          team_size: number
          total_points: number
          user_id: string
          username: string
        }[]
      }
      get_leagues_with_stats: { Args: { p_show_id: string }; Returns: Json }
      get_my_leagues_insights: {
        Args: { p_last_gws?: number; p_show_id: string }
        Returns: Json
      }
      get_my_team_events_all_episodes: {
        Args: { p_show_id: string }
        Returns: Json
      }
      get_next_transfer_time: { Args: { p_show_id: string }; Returns: Json }
      get_participant_event_counts: {
        Args: { p_limit?: number; p_show_id: string }
        Returns: {
          event_count: number
          name: string
          participant_id: string
          photo_url: string
        }[]
      }
      get_participant_pick_counts: {
        Args: { p_show_id: string }
        Returns: {
          participant_id: string
          participant_name: string
          participant_photo_url: string
          pick_count: number
          pick_percentage: number
          total_users: number
        }[]
      }
      get_pending_invitations_for_email: {
        Args: { p_email: string }
        Returns: {
          can_publish_episodes: boolean
          id: string
          invited_at: string
          role: string
          season_number: number
          show_id: string
          show_name: string
          show_status: string
        }[]
      }
      get_released_participants: {
        Args: { p_show_id: string }
        Returns: {
          age: number | null
          attachments: Json | null
          available_from_episode: number | null
          bio: string | null
          created_at: string
          custom_status_label: string | null
          eliminated_by_event_id: string | null
          eliminated_episode: number | null
          gender: string | null
          hometown: string | null
          id: string
          media_type: string | null
          media_url: string | null
          name: string
          occupation: string | null
          photo_url: string | null
          price: number | null
          role: string | null
          show_id: string
          status: string | null
          updated_at: string
          visibility: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "participants"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_show_global_ranking: {
        Args: { p_show_id: string }
        Returns: {
          avatar_url: string
          rank: number
          show_user_id: string
          total_points: number
          user_id: string
          username: string
        }[]
      }
      get_user_leagues_with_stats: {
        Args: { p_show_id: string }
        Returns: Json
      }
      get_user_points_breakdown: { Args: { p_show_id: string }; Returns: Json }
      get_user_points_comparison: {
        Args: { p_show_id: string }
        Returns: {
          avatar_url: string
          gameweek_points: number
          total_points: number
          user_id: string
          username: string
        }[]
      }
      get_user_team_for_episode: {
        Args: { p_episode_number: number; p_show_id: string }
        Returns: {
          added_episode: number
          participant_id: string
          participant_name: string
          photo_url: string
          removed_episode: number
          slot_position: number
        }[]
      }
      is_participant_released: {
        Args: { p_participant_id: string; p_show_id: string }
        Returns: boolean
      }
      is_participant_selectable: {
        Args: { p_participant_id: string; p_show_id: string }
        Returns: boolean
      }
      is_show_owner: { Args: { p_show_id: string }; Returns: boolean }
      join_league_by_code: { Args: { p_invite_code: string }; Returns: Json }
      join_league_public: { Args: { p_league_id: string }; Returns: Json }
      leave_league: { Args: { p_league_id: string }; Returns: Json }
      update_event_with_participants: {
        Args: {
          p_event_id: string
          p_event_offset_seconds?: number
          p_notes?: string
          p_participant_ids: string[]
          p_rule_id: string
        }
        Returns: Json
      }
      validate_and_execute_transfer: {
        Args: {
          p_participant_in_id: string
          p_participant_out_id: string
          p_show_id: string
        }
        Returns: Json
      }
      validate_team_constraints:
        | {
            Args: { p_participant_ids: string[]; p_show_id: string }
            Returns: Json
          }
        | {
            Args: { p_participant_ids: string[]; p_show_id: string }
            Returns: Json
          }
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
