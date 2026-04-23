import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import i18n from "@/i18n";
import type { Tables } from "@/integrations/supabase/types";

type Show = Tables<"shows">;
type Participant = Tables<"participants">;
type GameRule = Tables<"game_rules">;
type BrandingSettings = Tables<"branding_settings">;
type GameSettings = Tables<"game_settings">;
type Episode = Tables<"episodes">;
type Event = Tables<"events">;

export interface AboutItem {
  icon: string;
  text: string;
}

export interface HowItWorksCard {
  icon: string;
  title: string;
  description: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface LandingPageContent {
  id?: string;
  show_id: string;
  hero_title: string | null;
  hero_subtitle: string | null;
  about_title: string;
  about_description: string | null;
  about_items: AboutItem[];
  how_it_works_title: string;
  how_it_works_subtitle: string | null;
  how_it_works_cards: HowItWorksCard[];
  faq_title: string;
  faq_items: FAQItem[];
}

interface ShowContextType {
  show: Show | null;
  participants: Participant[];
  rules: GameRule[];
  branding: BrandingSettings | null;
  settings: GameSettings | null;
  episodes: Episode[];
  events: Event[];
  landingPageContent: LandingPageContent | null;
  isLoading: boolean;
  error: string | null;
  // Refetch functions for manual refresh
  refetchParticipants: () => Promise<void>;
  refetchRules: () => Promise<void>;
  refetchBranding: () => Promise<void>;
  refetchSettings: () => Promise<void>;
  refetchEpisodes: () => Promise<void>;
  refetchEvents: () => Promise<void>;
  refetchLandingPageContent: () => Promise<void>;
  refetchAll: () => Promise<void>;
}

export const ShowContext = createContext<ShowContextType | undefined>(undefined);

export const useShow = () => {
  const context = useContext(ShowContext);
  if (context === undefined) {
    throw new Error("useShow must be used within a ShowProvider");
  }
  return context;
};

interface ShowProviderProps {
  children: React.ReactNode;
  showSlug: string;
}

export const ShowProvider: React.FC<ShowProviderProps> = ({ children, showSlug }) => {
  const [show, setShow] = useState<Show | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [rules, setRules] = useState<GameRule[]>([]);
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [landingPageContent, setLandingPageContent] = useState<LandingPageContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Individual fetch functions for refetching
  // Fetch ALL participants (including inactive) - filtering happens in components
  const fetchParticipants = useCallback(async (showId: string) => {
    const { data } = await supabase
      .from("participants")
      .select("*")
      .eq("show_id", showId);
    setParticipants(data || []);
  }, []);

  const fetchRules = useCallback(async (showId: string) => {
    const { data } = await supabase
      .from("game_rules")
      .select("*")
      .eq("show_id", showId);
    setRules(data || []);
  }, []);

  const fetchBranding = useCallback(async (showId: string) => {
    const { data } = await supabase
      .from("branding_settings")
      .select("*")
      .eq("show_id", showId)
      .maybeSingle();
    setBranding(data);
  }, []);

  const fetchSettings = useCallback(async (showId: string) => {
    const { data } = await supabase
      .from("game_settings")
      .select("*")
      .eq("show_id", showId)
      .maybeSingle();
    setSettings(data);
    
    // Set i18n language from settings
    if (data?.language) {
      i18n.changeLanguage(data.language);
    }
  }, []);

  const fetchEpisodes = useCallback(async (showId: string) => {
    const { data } = await supabase
      .from("episodes")
      .select("*")
      .eq("show_id", showId)
      .order("episode_number", { ascending: true });
    setEpisodes(data || []);
  }, []);

  const fetchEvents = useCallback(async (showId: string) => {
    const { data } = await supabase
      .from("events")
      .select("*")
      .eq("show_id", showId)
      .order("event_date", { ascending: false });
    setEvents(data || []);
  }, []);

  const fetchLandingPageContent = useCallback(async (showId: string) => {
    const { data } = await supabase
      .from("landing_page_content")
      .select("*")
      .eq("show_id", showId)
      .maybeSingle();
    
    if (data) {
      setLandingPageContent({
        ...data,
        about_items: (data.about_items as unknown as AboutItem[]) || [],
        how_it_works_cards: (data.how_it_works_cards as unknown as HowItWorksCard[]) || [],
        faq_items: (data.faq_items as unknown as FAQItem[]) || [],
      });
    } else {
      setLandingPageContent(null);
    }
  }, []);

  // Refetch functions exposed to consumers
  const refetchParticipants = useCallback(async () => {
    if (show?.id) await fetchParticipants(show.id);
  }, [show?.id, fetchParticipants]);

  const refetchRules = useCallback(async () => {
    if (show?.id) await fetchRules(show.id);
  }, [show?.id, fetchRules]);

  const refetchBranding = useCallback(async () => {
    if (show?.id) await fetchBranding(show.id);
  }, [show?.id, fetchBranding]);

  const refetchSettings = useCallback(async () => {
    if (show?.id) await fetchSettings(show.id);
  }, [show?.id, fetchSettings]);

  const refetchEpisodes = useCallback(async () => {
    if (show?.id) await fetchEpisodes(show.id);
  }, [show?.id, fetchEpisodes]);

  const refetchEvents = useCallback(async () => {
    if (show?.id) await fetchEvents(show.id);
  }, [show?.id, fetchEvents]);

  const refetchLandingPageContent = useCallback(async () => {
    if (show?.id) await fetchLandingPageContent(show.id);
  }, [show?.id, fetchLandingPageContent]);

  const refetchAll = useCallback(async () => {
    if (!show?.id) return;
    await Promise.all([
      fetchParticipants(show.id),
      fetchRules(show.id),
      fetchBranding(show.id),
      fetchSettings(show.id),
      fetchEpisodes(show.id),
      fetchEvents(show.id),
      fetchLandingPageContent(show.id),
    ]);
  }, [show?.id, fetchParticipants, fetchRules, fetchBranding, fetchSettings, fetchEpisodes, fetchEvents, fetchLandingPageContent]);

  // Initial data load
  useEffect(() => {
    const loadShowData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // First, try to find show by ID (UUID) or by name slug
        let showData: Show | null = null;
        
        // Try by ID first
        const { data: showById } = await supabase
          .from("shows")
          .select("*")
          .eq("id", showSlug)
          .maybeSingle();
        
        if (showById) {
          showData = showById;
        } else {
          // Try by name (case-insensitive slug match)
          const { data: showByName } = await supabase
            .from("shows")
            .select("*")
            .ilike("name", showSlug.replace(/-/g, " "))
            .maybeSingle();
          
          showData = showByName;
        }

        if (!showData) {
          setError("Show not found");
          setIsLoading(false);
          return;
        }

        setShow(showData);

        // Load all related data in parallel
        await Promise.all([
          fetchParticipants(showData.id),
          fetchRules(showData.id),
          fetchBranding(showData.id),
          fetchSettings(showData.id),
          fetchEpisodes(showData.id),
          fetchEvents(showData.id),
          fetchLandingPageContent(showData.id),
        ]);
      } catch (err) {
        setError("Failed to load show data");
        console.error("Error loading show:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (showSlug) {
      loadShowData();
    }
  }, [showSlug, fetchParticipants, fetchRules, fetchBranding, fetchSettings, fetchEpisodes, fetchEvents, fetchLandingPageContent]);

  // Real-time subscriptions for all show-scoped data
  useEffect(() => {
    if (!show?.id) return;

    const showId = show.id;

    // Create a single channel for all show-scoped real-time updates
    const channel = supabase
      .channel(`show-realtime-${showId}`)
      // Participants changes
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participants", filter: `show_id=eq.${showId}` },
        () => {
          console.log("[Realtime] Participants changed");
          fetchParticipants(showId);
        }
      )
      // Game rules changes
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_rules", filter: `show_id=eq.${showId}` },
        () => {
          console.log("[Realtime] Rules changed");
          fetchRules(showId);
        }
      )
      // Branding changes
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "branding_settings", filter: `show_id=eq.${showId}` },
        () => {
          console.log("[Realtime] Branding changed");
          fetchBranding(showId);
        }
      )
      // Game settings changes
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_settings", filter: `show_id=eq.${showId}` },
        () => {
          console.log("[Realtime] Settings changed");
          fetchSettings(showId);
        }
      )
      // Episodes changes
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "episodes", filter: `show_id=eq.${showId}` },
        () => {
          console.log("[Realtime] Episodes changed");
          fetchEpisodes(showId);
        }
      )
      // Events changes
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events", filter: `show_id=eq.${showId}` },
        () => {
          console.log("[Realtime] Events changed");
          fetchEvents(showId);
        }
      )
      // Event participants changes (for multi-participant events)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_participants" },
        () => {
          console.log("[Realtime] Event participants changed");
          // Refetch events to update points display
          fetchEvents(showId);
        }
      )
      // Landing page content changes
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "landing_page_content", filter: `show_id=eq.${showId}` },
        () => {
          console.log("[Realtime] Landing page content changed");
          fetchLandingPageContent(showId);
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] Subscription status for show ${showId}:`, status);
      });

    return () => {
      console.log(`[Realtime] Unsubscribing from show ${showId}`);
      supabase.removeChannel(channel);
    };
  }, [show?.id, fetchParticipants, fetchRules, fetchBranding, fetchSettings, fetchEpisodes, fetchEvents, fetchLandingPageContent]);

  // Polling for episode status changes (handles active_from_datetime passing without DB changes)
  // This ensures newly released participants appear within 30 seconds
  useEffect(() => {
    if (!show?.id) return;

    const interval = setInterval(() => {
      console.log("[Polling] Re-fetching episodes and participants for visibility updates");
      fetchEpisodes(show.id);
      fetchParticipants(show.id);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [show?.id, fetchEpisodes, fetchParticipants]);

  return (
    <ShowContext.Provider
      value={{
        show,
        participants,
        rules,
        branding,
        settings,
        episodes,
        events,
        landingPageContent,
        isLoading,
        error,
        refetchParticipants,
        refetchRules,
        refetchBranding,
        refetchSettings,
        refetchEpisodes,
        refetchEvents,
        refetchLandingPageContent,
        refetchAll,
      }}
    >
      {children}
    </ShowContext.Provider>
  );
};
