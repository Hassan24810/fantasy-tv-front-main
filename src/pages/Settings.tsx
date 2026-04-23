import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, ArrowLeftRight, Shield, Trophy, Palette, UserCog, FileText, Globe } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminShow } from "@/contexts/AdminShowContext";
import { TeamRulesSection } from "@/components/settings/TeamRulesSection";
import { TransfersSection } from "@/components/settings/TransfersSection";
import { RosterConstraintsSection } from "@/components/settings/RosterConstraintsSection";
import { ScoringSection } from "@/components/settings/ScoringSection";
import { BrandingSection } from "@/components/settings/BrandingSection";
import { PermissionsSection } from "@/components/settings/PermissionsSection";
import { LandingPageSection } from "@/components/settings/LandingPageSection";
import { LanguageSection } from "@/components/settings/LanguageSection";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import type { LanguageCode } from "@/i18n";
export interface GameSettings {
  id?: string;
  show_id: string;
  team_size: number;
  min_boys: number;
  min_girls: number;
  max_boys: number | null;
  max_girls: number | null;
  transfer_reset_frequency: string;
  transfers_per_reset: number;
  transfer_window_mode: string;
  transfer_windows: { start: string; end: string }[];
  max_players_per_category: number | null;
  budget_mode_enabled: boolean;
  budget_amount: number | null;
  lock_roster_after_episode: boolean;
  wildcard_enabled: boolean;
  free_hit_enabled: boolean;
  scoring_profile: string;
  bonus_points_enabled: boolean;
  tiebreak_rule: string;
  language: LanguageCode;
}

export interface BrandingSettings {
  id?: string;
  show_id: string;
  logo_url: string | null;
  background_image_url: string | null;
  cover_image_url: string | null;
  primary_color: string;
  secondary_color: string;
  contact_email: string | null;
  contact_phone: string | null;
  facebook_username: string | null;
  instagram_username: string | null;
  twitter_username: string | null;
  tiktok_username: string | null;
}

export interface AdminPermission {
  id: string;
  show_id: string;
  user_id: string;
  email: string;
  role: string;
  can_publish_episodes: boolean;
  invited_at: string;
}

const SettingsContent = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { show, settings: adminSettings, branding: adminBranding, isLoading: showLoading } = useAdminShow();
  const [activeTab, setActiveTab] = useState("team-rules");
  const [loading, setLoading] = useState(true);
  
  const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);
  const [brandingSettings, setBrandingSettings] = useState<BrandingSettings | null>(null);
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);

  const showId = show?.id || null;

  // Fetch settings when show is available
  useEffect(() => {
    const fetchSettings = async () => {
      if (!showId) {
        setLoading(false);
        return;
      }
      setLoading(true);

      try {
        // Fetch game settings
        const { data: gameData, error: gameError } = await supabase
          .from("game_settings")
          .select("*")
          .eq("show_id", showId)
          .maybeSingle();

        if (gameError && gameError.code !== "PGRST116") {
          console.error("Error fetching game settings:", gameError);
        }

        if (gameData) {
          setGameSettings({
            ...gameData,
            transfer_windows: gameData.transfer_windows as { start: string; end: string }[] || [],
            language: (gameData.language || 'en') as LanguageCode,
          });
          // Set i18n language from settings
          if (gameData.language) {
            i18n.changeLanguage(gameData.language);
          }
        } else {
          // Create default settings
          setGameSettings({
            show_id: showId,
            team_size: 5,
            min_boys: 0,
            min_girls: 0,
            max_boys: null,
            max_girls: null,
            transfer_reset_frequency: "weekly",
            transfers_per_reset: 2,
            transfer_window_mode: "always_open",
            transfer_windows: [],
            max_players_per_category: null,
            budget_mode_enabled: false,
            budget_amount: null,
            lock_roster_after_episode: false,
            wildcard_enabled: false,
            free_hit_enabled: false,
            scoring_profile: "standard",
            bonus_points_enabled: true,
            tiebreak_rule: "total_points",
            language: "en",
          });
        }

        // Fetch branding settings
        const { data: brandingData, error: brandingError } = await supabase
          .from("branding_settings")
          .select("*")
          .eq("show_id", showId)
          .maybeSingle();

        if (brandingError && brandingError.code !== "PGRST116") {
          console.error("Error fetching branding settings:", brandingError);
        }

        if (brandingData) {
          setBrandingSettings(brandingData);
        } else {
          setBrandingSettings({
            show_id: showId,
            logo_url: null,
            background_image_url: null,
            cover_image_url: null,
            primary_color: "#6366f1",
            secondary_color: "#8b5cf6",
            contact_email: null,
            contact_phone: null,
            facebook_username: null,
            instagram_username: null,
            twitter_username: null,
            tiktok_username: null,
          });
        }

        // Fetch permissions
        const { data: permData, error: permError } = await supabase
          .from("admin_permissions")
          .select("*")
          .eq("show_id", showId);

        if (permError) {
          console.error("Error fetching permissions:", permError);
        } else {
          setPermissions(permData || []);
        }
      } catch (err) {
        console.error("Error loading settings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [showId]);

  const saveGameSettings = async (updates: Partial<GameSettings>) => {
    if (!showId || !gameSettings) return;

    const newSettings = { ...gameSettings, ...updates };
    setGameSettings(newSettings);

    try {
      if (gameSettings.id) {
        const { error } = await supabase
          .from("game_settings")
          .update({
            ...updates,
            transfer_windows: updates.transfer_windows || gameSettings.transfer_windows,
          })
          .eq("id", gameSettings.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("game_settings")
          .insert({
            show_id: showId,
            ...newSettings,
          })
          .select()
          .single();

        if (error) throw error;
        setGameSettings({ ...newSettings, id: data.id });
      }

      toast({
        title: t('toast.settingsSaved'),
        description: t('toast.savedChanges'),
      });
    } catch (err) {
      console.error("Error saving game settings:", err);
      toast({
        title: t('toast.error'),
        description: t('toast.pleaseTryAgain'),
        variant: "destructive",
      });
    }
  };

  const saveBrandingSettings = async (updates: Partial<BrandingSettings>) => {
    if (!showId || !brandingSettings) return;

    const newSettings = { ...brandingSettings, ...updates };
    setBrandingSettings(newSettings);

    try {
      if (brandingSettings.id) {
        const { error } = await supabase
          .from("branding_settings")
          .update(updates)
          .eq("id", brandingSettings.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("branding_settings")
          .insert({
            show_id: showId,
            ...newSettings,
          })
          .select()
          .single();

        if (error) throw error;
        setBrandingSettings({ ...newSettings, id: data.id });
      }

      toast({
        title: t('settings.branding.saved'),
        description: t('settings.branding.savedDescription'),
      });
    } catch (err) {
      console.error("Error saving branding settings:", err);
      toast({
        title: t('toast.error'),
        description: t('toast.pleaseTryAgain'),
        variant: "destructive",
      });
    }
  };

  const tabs = [
    { id: "team-rules", label: t('settings.teamRules'), icon: Users },
    { id: "transfers", label: t('settings.transfers'), icon: ArrowLeftRight },
    { id: "roster", label: t('settings.roster'), icon: Shield },
    { id: "scoring", label: t('settings.scoring'), icon: Trophy },
    { id: "branding", label: t('settings.branding'), icon: Palette },
    { id: "landing-page", label: t('settings.landingPage'), icon: FileText },
    { id: "language", label: t('settings.language'), icon: Globe },
    { id: "permissions", label: t('settings.permissions'), icon: UserCog },
  ];

  if (!showId && !showLoading && !loading) {
    return (
      <Card className="bg-card text-card-foreground">
        <CardContent className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">{t('admin.noShowFound')}</h2>
          <p className="text-muted-foreground">
            {t('admin.completeOnboarding')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">{t('settings.title')}</h1>
        <p className="text-muted-foreground">
          {t('settings.pageDescription')}
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <Card className="bg-card text-card-foreground border-0 shadow-lg">
          <CardContent className="p-2">
            <TabsList className="grid grid-cols-8 gap-2 bg-transparent h-auto p-0">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-2 px-4 py-3 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white text-slate-600 hover:text-slate-900 transition-all"
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden lg:inline text-sm font-medium">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </CardContent>
        </Card>

        {loading || showLoading ? (
          <Card className="bg-card text-card-foreground border-0 shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="animate-pulse">{t('admin.loadingSettings')}</div>
            </CardContent>
          </Card>
        ) : (
          <>
            <TabsContent value="team-rules" className="mt-6">
              {gameSettings && (
                <TeamRulesSection
                  settings={gameSettings}
                  onSave={saveGameSettings}
                />
              )}
            </TabsContent>

            <TabsContent value="transfers" className="mt-6">
              {gameSettings && (
                <TransfersSection
                  settings={gameSettings}
                  onSave={saveGameSettings}
                />
              )}
            </TabsContent>

            <TabsContent value="roster" className="mt-6">
              {gameSettings && (
              <RosterConstraintsSection
                  settings={gameSettings}
                  showId={showId!}
                  onSave={saveGameSettings}
                />
              )}
            </TabsContent>

            <TabsContent value="scoring" className="mt-6">
              {gameSettings && (
                <ScoringSection
                  settings={gameSettings}
                  onSave={saveGameSettings}
                />
              )}
            </TabsContent>

            <TabsContent value="branding" className="mt-6">
              {brandingSettings && (
                <BrandingSection
                  settings={brandingSettings}
                  onSave={saveBrandingSettings}
                />
              )}
            </TabsContent>

            <TabsContent value="landing-page" className="mt-6">
              <LandingPageSection showId={showId!} showName={show?.name} />
            </TabsContent>

            <TabsContent value="language" className="mt-6">
              {gameSettings && (
                <LanguageSection
                  language={gameSettings.language || 'en'}
                  onSave={saveGameSettings}
                />
              )}
            </TabsContent>

            <TabsContent value="permissions" className="mt-6">
              <PermissionsSection
                showId={showId!}
                permissions={permissions}
                onRefresh={async () => {
                  const { data } = await supabase
                    .from("admin_permissions")
                    .select("*")
                    .eq("show_id", showId);
                  setPermissions(data || []);
                }}
              />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
};

const Settings = () => {
  return (
    <AdminLayout>
      <SettingsContent />
    </AdminLayout>
  );
};

export default Settings;