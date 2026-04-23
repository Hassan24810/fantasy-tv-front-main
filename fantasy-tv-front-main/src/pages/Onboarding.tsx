import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { X, Info, Settings, Users, FileText, CheckCircle, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import ShowInfoStep from "@/components/onboarding/ShowInfoStep";
import GameSettingsStep from "@/components/onboarding/GameSettingsStep";
import ParticipantsStep from "@/components/onboarding/ParticipantsStep";
import GameRulesStep from "@/components/onboarding/GameRulesStep";
import LandingPageContentStep, { LandingPageContent } from "@/components/onboarding/LandingPageContentStep";
import { PreviewShowProvider } from "@/components/onboarding/PreviewShowProvider";
import { OnboardingPreviewPanel } from "@/components/onboarding/OnboardingPreviewPanel";

export interface ShowData {
  name: string;
  seasonNumber: number;
  description: string;
  genre: string;
  coverImageUrl: string;
  logoUrl: string;
  secondaryImageUrl: string;
  primaryColor: string;
  secondaryColor: string;
  language: string;
  email: string;
  phone: string;
  facebook: string;
  instagram: string;
  twitter: string;
  tiktok: string;
  useSocialMedia: boolean;
}

export interface GameSettings {
  playersPerTeam: number;
  minGirls: number;
  minBoys: number;
  transferResetFrequency: string;
  transfersPerReset: number;
  budgetEnabled: boolean;
  budgetAmount: number;
}

export interface Participant {
  id?: string;
  name: string;
  age: number;
  occupation: string;
  hometown: string;
  bio: string;
  photoUrl: string;
  gender: string;
  status: string;
  availableFromEpisode?: number | null;
  price?: number | null;
}

export interface GameRule {
  id?: string;
  eventType: string;
  eventName: string;
  points: number;
  description: string;
  template?: string;
  icon?: string;
  participantsCount: number;
  participantCountMode: "exact" | "variable";
  pointsPerPosition: number[];
  isElimination: boolean;
  eliminatedPosition?: number;
}

export default function Onboarding() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isNewShowMode = searchParams.get("mode") === "new";
  const isMobile = useIsMobile();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingExistingShow, setCheckingExistingShow] = useState(true);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const TOTAL_STEPS = 5;

  const steps = [
    { id: 1, name: t('onboarding.showInfo'), icon: Info },
    { id: 2, name: t('onboarding.gameSettings'), icon: Settings },
    { id: 3, name: t('onboarding.participants'), icon: Users },
    { id: 4, name: t('onboarding.gameRules'), icon: FileText },
    { id: 5, name: t('onboarding.review'), icon: CheckCircle },
  ];

  const [showData, setShowData] = useState<ShowData>({
    name: "",
    seasonNumber: 1,
    description: "",
    genre: "",
    coverImageUrl: "",
    logoUrl: "",
    secondaryImageUrl: "",
    primaryColor: "#3B82F6",
    secondaryColor: "#1E3A8A",
    language: "",
    email: "",
    phone: "",
    facebook: "",
    instagram: "",
    twitter: "",
    tiktok: "",
    useSocialMedia: false,
  });

  const [gameSettings, setGameSettings] = useState<GameSettings>({
    playersPerTeam: 5,
    minGirls: 0,
    minBoys: 0,
    transferResetFrequency: "weekly",
    transfersPerReset: 3,
    budgetEnabled: false,
    budgetAmount: 0,
  });

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [gameRules, setGameRules] = useState<GameRule[]>([]);
  const [landingPageContent, setLandingPageContent] = useState<LandingPageContent>({
    aboutTitle: "What's This All About?",
    aboutDescription: "",
    aboutItems: [
      { icon: "Target", text: "Pick your dream team of contestants" },
      { icon: "Tv", text: "Watch episodes and earn points" },
      { icon: "Trophy", text: "Compete with friends in leagues" },
    ],
    howItWorksTitle: "How It Works",
    howItWorksSubtitle: "Follow these simple steps to start playing",
    howItWorksCards: [
      { icon: "Users", title: "Create Account", description: "Sign up with your email" },
      { icon: "Target", title: "Pick Your Team", description: "Choose contestants for your roster" },
      { icon: "Tv", title: "Watch & Earn", description: "Earn points as your picks perform" },
      { icon: "Trophy", title: "Win Prizes", description: "Climb the leaderboard and win" },
    ],
    faqTitle: "Frequently Asked Questions",
    faqItems: [
      { question: "How do I earn points?", answer: "Your team earns points based on contestant actions during episodes." },
      { question: "Can I change my team?", answer: "Yes, you have a limited number of transfers each week." },
    ],
  });

  const handleShowDataChange = (data: ShowData) => {
    setShowData(data);
    if (data.name.trim() !== "" && validationErrors.showName) {
      setValidationErrors((prev) => {
        const { showName, ...rest } = prev;
        return rest;
      });
    }
  };

  useEffect(() => {
    const checkUserAndShow = async () => {
      if (loading) return;
      
      if (!user) {
        navigate("/auth");
        return;
      }

      if (isNewShowMode) {
        setCheckingExistingShow(false);
        return;
      }

      try {
        const { data: memberships, error } = await supabase
          .from("admin_permissions")
          .select("show_id")
          .eq("user_id", user.id)
          .eq("status", "accepted")
          .limit(1);

        if (error) throw error;

        if (memberships && memberships.length > 0) {
          navigate("/dashboard");
          return;
        }
      } catch (error) {
        console.error("Error checking existing shows:", error);
      } finally {
        setCheckingExistingShow(false);
      }
    };

    checkUserAndShow();
  }, [user, loading, navigate, isNewShowMode]);

  const handleNext = () => {
    if (currentStep === 1) {
      if (!showData.name || showData.name.trim() === "") {
        setValidationErrors({ showName: t('onboarding.pleaseEnterShowName') });
        return;
      }
    }
    
    setValidationErrors({});
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCopyLink = () => {
    const slug = showData.name.trim().toLowerCase().replace(/\s+/g, "-");
    const previewUrl = `${window.location.origin}/show/${slug}`;
    navigator.clipboard.writeText(previewUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    if (!showData.name || showData.name.trim() === "") {
      setValidationErrors({ showName: t('onboarding.showNameRequired') });
      setCurrentStep(1);
      return;
    }
    
    setSubmitError(null);
    setIsSubmitting(true);
    
    try {
      // Step 1: Create the show
      const { data: showResult, error: showError } = await supabase
        .from("shows")
        .insert({
          user_id: user.id,
          name: showData.name.trim(),
          season_number: showData.seasonNumber || 1,
          description: showData.description || null,
          genre: showData.genre || null,
          cover_image_url: showData.coverImageUrl || null,
          status: "active",
        })
        .select()
        .single();

      if (showError) throw new Error(`Failed to create show: ${showError.message}`);

      const showId = showResult.id;

      // Step 2: Create branding settings
      let brandingError = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { error } = await supabase
          .from("branding_settings")
          .insert({
            show_id: showId,
            logo_url: showData.logoUrl || null,
            cover_image_url: showData.coverImageUrl || null,
            background_image_url: showData.secondaryImageUrl || null,
            primary_color: showData.primaryColor || "#6366f1",
            secondary_color: showData.secondaryColor || "#8b5cf6",
            contact_email: showData.email || null,
            contact_phone: showData.phone || null,
            facebook_username: showData.useSocialMedia ? showData.facebook || null : null,
            instagram_username: showData.useSocialMedia ? showData.instagram || null : null,
            twitter_username: showData.useSocialMedia ? showData.twitter || null : null,
            tiktok_username: showData.useSocialMedia ? showData.tiktok || null : null,
          } as any);
        
        if (!error) { brandingError = null; break; }
        brandingError = error;
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Step 3: Create game settings
      await supabase.from("game_settings").insert({
        show_id: showId,
        team_size: gameSettings.playersPerTeam || 5,
        min_girls: gameSettings.minGirls || 0,
        min_boys: gameSettings.minBoys || 0,
        transfer_reset_frequency: gameSettings.transferResetFrequency || "weekly",
        transfers_per_reset: gameSettings.transfersPerReset || 3,
        language: showData.language || "en",
        budget_mode_enabled: gameSettings.budgetEnabled || false,
        budget_amount: gameSettings.budgetEnabled ? (gameSettings.budgetAmount || null) : null,
      });

      // Step 4: Create participants
      if (participants.length > 0) {
        await supabase.from("participants").insert(
          participants.map((p) => ({
            show_id: showId,
            name: p.name,
            age: p.age || null,
            occupation: p.occupation || null,
            hometown: p.hometown || null,
            bio: p.bio || null,
            photo_url: p.photoUrl || null,
            gender: p.gender || null,
            status: p.status || "active",
            available_from_episode: p.availableFromEpisode || null,
            price: gameSettings.budgetEnabled ? (p.price ?? null) : null,
          }))
        );
      }

      // Step 5: Create game rules
      if (gameRules.length > 0) {
        const validEventTypes = ["positive", "negative", "bonus", "elimination", "social"];
        await supabase.from("game_rules").insert(
          gameRules.map((r) => ({
            show_id: showId,
            event_type: validEventTypes.includes(r.eventType) ? r.eventType : "positive",
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
          })) as any
        );
      }

      // Step 6: Create default public league
      await supabase.from("leagues").insert({
        show_id: showId,
        name: "Global League",
        description: "The main public league for all players",
        is_public: true,
        max_members: 10000,
      });

      // Step 7: Create landing page content
      await supabase.from("landing_page_content").insert({
        show_id: showId,
        about_title: landingPageContent.aboutTitle,
        about_description: landingPageContent.aboutDescription,
        about_items: landingPageContent.aboutItems as unknown as any,
        how_it_works_title: landingPageContent.howItWorksTitle,
        how_it_works_subtitle: landingPageContent.howItWorksSubtitle,
        how_it_works_cards: landingPageContent.howItWorksCards as unknown as any,
        faq_title: landingPageContent.faqTitle,
        faq_items: landingPageContent.faqItems as unknown as any,
      });

      navigate("/dashboard");
    } catch (error: any) {
      console.error("[Onboarding] Submission failed:", error);
      setSubmitError(error.message || t('onboarding.failedToCreateShow'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isNewShowMode) {
      navigate("/dashboard");
    } else {
      navigate("/no-shows");
    }
  };

  if (loading || checkingExistingShow) {
    return (
      <div className="min-h-screen onboarding-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const renderPublishStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-bold text-white">{t('onboarding.review')}</h3>
        <p className="text-sm text-white/60">
          Alt er klart! Se forhåndsvisningen til høyre, og publiser når du er fornøyd.
        </p>
      </div>

      {/* Landing page content inline */}
      <div className="border-t border-white/10 pt-6">
        <LandingPageContentStep 
          data={landingPageContent}
          onChange={setLandingPageContent}
        />
      </div>

      {/* Preview link */}
      <div className="bg-white/5 rounded-xl border border-white/10 p-4 space-y-3">
        <p className="text-sm font-medium text-white/80">Del forhåndsvisning</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white/10 rounded-lg px-3 py-2 text-xs text-white/60 truncate">
            {window.location.origin}/show/{showData.name.trim().toLowerCase().replace(/\s+/g, "-") || "..."}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20 flex-shrink-0"
          >
            {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen onboarding-bg flex">
      {/* LEFT: Admin Form Panel */}
      <div className={`flex flex-col ${isMobile ? "w-full" : "w-1/2"} p-4 md:p-6`}>
        <div className="relative w-full onboarding-container rounded-2xl p-6 md:p-8 z-10 animate-fade-in flex-1 flex flex-col overflow-hidden">
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors z-10"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>

          {/* Step Indicator */}
          <div className="flex justify-center items-center gap-2 md:gap-3 mb-6 flex-shrink-0">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              const canNavigate = isCompleted || isActive;
              
              return (
                <div key={step.id} className="flex items-center">
                  {index !== 0 && (
                    <div
                      className={`hidden md:block w-8 lg:w-12 border-t-2 border-dashed mr-2 md:mr-3 ${
                        isCompleted ? "border-primary" : "border-white/30"
                      }`}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => canNavigate && setCurrentStep(step.id)}
                    disabled={!canNavigate}
                    className={`flex flex-col items-center gap-1.5 ${
                      canNavigate ? "cursor-pointer" : "cursor-not-allowed"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all ${
                        isActive
                          ? "bg-primary text-white shadow-lg shadow-primary/30"
                          : isCompleted
                          ? "bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30"
                          : "bg-white/10 text-white/50 border border-white/20"
                      }`}
                    >
                      <Icon className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    <span className={`hidden md:block text-xs font-medium ${
                      isActive ? "text-primary" : isCompleted ? "text-primary/70" : "text-white/50"
                    }`}>
                      {step.name}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {currentStep === 1 && (
              <>
                <ShowInfoStep data={showData} onChange={handleShowDataChange} />
                {validationErrors.showName && (
                  <p className="text-xs text-red-400 mt-2">{validationErrors.showName}</p>
                )}
              </>
            )}
            {currentStep === 2 && (
              <GameSettingsStep data={gameSettings} onChange={setGameSettings} />
            )}
            {currentStep === 3 && (
              <ParticipantsStep participants={participants} onChange={setParticipants} budgetEnabled={gameSettings.budgetEnabled} />
            )}
            {currentStep === 4 && (
              <GameRulesStep rules={gameRules} onChange={setGameRules} />
            )}
            {currentStep === 5 && renderPublishStep()}
          </div>

          {/* Submit Error */}
          {submitError && (
            <p className="text-xs text-red-400 mt-2 text-center">{submitError}</p>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6 pt-4 border-t border-white/10 flex-shrink-0">
            <Button
              onClick={handleBack}
              disabled={currentStep === 1}
              className="bg-primary hover:bg-primary/90 text-white disabled:opacity-30"
            >
              {t('common.back')}
            </Button>
            {currentStep < TOTAL_STEPS ? (
              <Button onClick={handleNext} className="bg-primary hover:bg-primary/90 text-white">
                {t('common.next')}
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-white min-w-[160px]"
              >
                {isSubmitting ? t('common.creating') : "Publiser nå"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT: Live Preview Panel (hidden on mobile) */}
      {!isMobile && (
        <div className="w-1/2 border-l border-white/10 bg-[hsl(220,14%,96%)]">
          <PreviewShowProvider
            showData={showData}
            gameSettings={gameSettings}
            participants={participants}
            gameRules={gameRules}
          >
            <OnboardingPreviewPanel currentStep={currentStep} />
          </PreviewShowProvider>
        </div>
      )}
    </div>
  );
}
