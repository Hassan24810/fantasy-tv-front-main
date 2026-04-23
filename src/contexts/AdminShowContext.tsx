import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";
import i18n from "@/i18n";

type Show = Tables<"shows">;
type BrandingSettings = Tables<"branding_settings">;
type GameSettings = Tables<"game_settings">;

interface ShowWithRole extends Show {
  role: string;
}

interface AdminShowContextType {
  show: ShowWithRole | null;
  shows: ShowWithRole[];
  branding: BrandingSettings | null;
  settings: GameSettings | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  selectShow: (showId: string) => void;
}

const AdminShowContext = createContext<AdminShowContextType | undefined>(undefined);

export const useAdminShow = () => {
  const context = useContext(AdminShowContext);
  if (context === undefined) {
    throw new Error("useAdminShow must be used within an AdminShowProvider");
  }
  return context;
};

interface AdminShowProviderProps {
  children: React.ReactNode;
}

const SELECTED_SHOW_KEY = "admin_selected_show_id";

export const AdminShowProvider: React.FC<AdminShowProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [shows, setShows] = useState<ShowWithRole[]>([]);
  const [show, setShow] = useState<ShowWithRole | null>(null);
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadShowDetails = useCallback(async (selectedShow: ShowWithRole) => {
    console.log("[AdminShowContext] Loading details for show:", selectedShow.id, selectedShow.name);
    setShow(selectedShow);

    // Load branding and settings in parallel
    const [brandingRes, settingsRes] = await Promise.all([
      supabase
        .from("branding_settings")
        .select("*")
        .eq("show_id", selectedShow.id)
        .maybeSingle(),
      supabase
        .from("game_settings")
        .select("*")
        .eq("show_id", selectedShow.id)
        .maybeSingle(),
    ]);

    console.log("[AdminShowContext] Branding loaded:", brandingRes.data ? "Yes" : "No");
    console.log("[AdminShowContext] Settings loaded:", settingsRes.data ? "Yes" : "No");

    setBranding(brandingRes.data);
    setSettings(settingsRes.data);
    
    // Set i18n language from settings
    if (settingsRes.data?.language) {
      i18n.changeLanguage(settingsRes.data.language);
    }
  }, []);

  const loadShowData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("[AdminShowContext] Loading shows for user via admin_permissions:", user.id);
      
      // Get all shows for this user via admin_permissions (supports multi-tenant)
      const { data: memberships, error: membershipError } = await supabase
        .from("admin_permissions")
        .select("show_id, role, shows(*)")
        .eq("user_id", user.id)
        .eq("status", "accepted");

      if (membershipError) {
        console.error("[AdminShowContext] Memberships load error:", membershipError);
        throw membershipError;
      }

      if (!memberships || memberships.length === 0) {
        console.log("[AdminShowContext] No shows found for user");
        setShows([]);
        setShow(null);
        setIsLoading(false);
        return;
      }

      // Transform memberships to ShowWithRole array
      const showsWithRole: ShowWithRole[] = memberships
        .filter(m => m.shows)
        .map(m => ({
          ...(m.shows as Show),
          role: m.role || "member",
        }))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      console.log("[AdminShowContext] Shows loaded:", showsWithRole.length);
      setShows(showsWithRole);

      // Check for previously selected show in localStorage
      const savedShowId = localStorage.getItem(SELECTED_SHOW_KEY);
      let selectedShow = showsWithRole[0]; // Default to first (most recent)

      if (savedShowId) {
        const savedShow = showsWithRole.find(s => s.id === savedShowId);
        if (savedShow) {
          selectedShow = savedShow;
        }
      }

      await loadShowDetails(selectedShow);
    } catch (err) {
      console.error("[AdminShowContext] Error:", err);
      setError("Failed to load show data");
    } finally {
      setIsLoading(false);
    }
  }, [user, loadShowDetails]);

  const selectShow = useCallback(async (showId: string) => {
    const selectedShow = shows.find(s => s.id === showId);
    if (!selectedShow) return;

    console.log("[AdminShowContext] Switching to show:", showId);
    localStorage.setItem(SELECTED_SHOW_KEY, showId);
    await loadShowDetails(selectedShow);
  }, [shows, loadShowDetails]);

  useEffect(() => {
    loadShowData();
  }, [loadShowData]);

  return (
    <AdminShowContext.Provider
      value={{
        show,
        shows,
        branding,
        settings,
        isLoading,
        error,
        refetch: loadShowData,
        selectShow,
      }}
    >
      {children}
    </AdminShowContext.Provider>
  );
};
