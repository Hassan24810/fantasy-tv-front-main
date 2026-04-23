import React from "react";
import { ShowContext } from "@/contexts/ShowContext";
import type { ShowData, GameSettings, Participant, GameRule } from "@/pages/Onboarding";
import type { Tables } from "@/integrations/supabase/types";

interface PreviewShowProviderProps {
  children: React.ReactNode;
  showData: ShowData;
  gameSettings: GameSettings;
  participants: Participant[];
  gameRules: GameRule[];
}

const noop = async () => {};

/**
 * Mock ShowContext provider that maps onboarding form state
 * into the shape expected by B2C components.
 */
export const PreviewShowProvider: React.FC<PreviewShowProviderProps> = ({
  children,
  showData,
  gameSettings,
  participants,
  gameRules,
}) => {
  const mockShowId = "preview-show-id";

  const show: Tables<"shows"> = {
    id: mockShowId,
    name: showData.name || "My Show",
    description: showData.description || null,
    genre: showData.genre || null,
    season_number: showData.seasonNumber || 1,
    cover_image_url: showData.coverImageUrl || null,
    episode_count: null,
    status: "active",
    user_id: "preview-user",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockParticipants: Tables<"participants">[] = participants.map((p, i) => ({
    id: p.id || `preview-participant-${i}`,
    show_id: mockShowId,
    name: p.name,
    age: p.age || null,
    occupation: p.occupation || null,
    hometown: p.hometown || null,
    bio: p.bio || null,
    photo_url: p.photoUrl || null,
    gender: p.gender || null,
    status: p.status || "active",
    role: null,
    visibility: "released",
    available_from_episode: p.availableFromEpisode || null,
    eliminated_episode: null,
    eliminated_by_event_id: null,
    custom_status_label: null,
    media_url: null,
    media_type: null,
    attachments: null,
    price: (p as any).price ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const mockRules: Tables<"game_rules">[] = gameRules.map((r, i) => ({
    id: r.id || `preview-rule-${i}`,
    show_id: mockShowId,
    event_type: r.eventType,
    event_name: r.eventName,
    points: r.pointsPerPosition?.[0] || r.points || 0,
    description: r.description || null,
    template: r.template || null,
    icon: r.icon || "star",
    participants_count: r.participantsCount || 1,
    participant_count_mode: r.participantCountMode || "exact",
    points_per_position: r.pointsPerPosition || [0],
    is_elimination: r.isElimination || false,
    eliminated_position: r.eliminatedPosition || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const mockBranding: Tables<"branding_settings"> = {
    id: "preview-branding",
    show_id: mockShowId,
    logo_url: showData.logoUrl || null,
    cover_image_url: showData.coverImageUrl || null,
    background_image_url: showData.secondaryImageUrl || null,
    primary_color: showData.primaryColor || "#3B82F6",
    secondary_color: showData.secondaryColor || "#1E3A8A",
    contact_email: showData.email || null,
    contact_phone: showData.phone || null,
    facebook_username: showData.facebook || null,
    instagram_username: showData.instagram || null,
    twitter_username: showData.twitter || null,
    tiktok_username: showData.tiktok || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockSettings: Tables<"game_settings"> = {
    id: "preview-settings",
    show_id: mockShowId,
    team_size: gameSettings.playersPerTeam || 5,
    min_girls: gameSettings.minGirls || 0,
    min_boys: gameSettings.minBoys || 0,
    transfer_reset_frequency: gameSettings.transferResetFrequency || "weekly",
    transfers_per_reset: gameSettings.transfersPerReset || 3,
    language: showData.language || "en",
    scoring_profile: "standard",
    bonus_points_enabled: false,
    budget_amount: gameSettings.budgetAmount || null,
    budget_mode_enabled: gameSettings.budgetEnabled || false,
    episode_reset_interval: null,
    free_hit_enabled: false,
    lock_roster_after_episode: false,
    max_boys: null,
    max_girls: null,
    max_players_per_category: null,
    tiebreak_rule: null,
    transfer_window_mode: "always_open",
    transfer_windows: null,
    wildcard_enabled: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const contextValue = {
    show,
    participants: mockParticipants,
    rules: mockRules,
    branding: mockBranding,
    settings: mockSettings,
    episodes: [],
    events: [],
    landingPageContent: null,
    isLoading: false,
    error: null,
    refetchParticipants: noop,
    refetchRules: noop,
    refetchBranding: noop,
    refetchSettings: noop,
    refetchEpisodes: noop,
    refetchEvents: noop,
    refetchLandingPageContent: noop,
    refetchAll: noop,
  };

  return (
    <ShowContext.Provider value={contextValue}>
      {children}
    </ShowContext.Provider>
  );
};
