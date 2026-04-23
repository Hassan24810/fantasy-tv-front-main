import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, FileText, Settings, Info, Mail, Phone, Globe, Eye, Layout, Home, Users, Trophy, Tv, Target, Crown, Star, Users2, Award, Zap, Heart, Flame } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ShowData, GameSettings, Participant, GameRule } from "@/pages/Onboarding";
import type { LandingPageContent } from "./LandingPageContentStep";

interface ReviewStepProps {
  showData: ShowData;
  gameSettings: GameSettings;
  participants: Participant[];
  gameRules: GameRule[];
  landingPageContent?: LandingPageContent;
}

// Icon mapping for landing page content
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Target,
  Users,
  Tv,
  Crown,
  Star,
  Users2,
  Trophy,
  Award,
  Zap,
  Heart,
  Flame,
  Home,
};

export default function ReviewStep({ showData, gameSettings, participants, gameRules, landingPageContent }: ReviewStepProps) {
  const { t } = useTranslation();
  const [previewTab, setPreviewTab] = useState<"landing" | "dashboard">("landing");
  
  const eventTypeLabels: Record<string, string> = {
    positive: t('admin.eventTypes.positive'),
    negative: t('admin.eventTypes.negative'),
    bonus: t('admin.eventTypes.bonus'),
    elimination: t('admin.eventTypes.elimination'),
    social: t('admin.eventTypes.social'),
  };

  const transferFrequencyLabels: Record<string, string> = {
    daily: t('settings.transfersSection.daily'),
    weekly: t('settings.transfersSection.weekly'),
    per_episode: t('settings.transfersSection.perEpisode'),
    custom: t('settings.transfersSection.custom'),
  };

  // Get icon component
  const getIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName] || Star;
    return <IconComponent className="w-5 h-5" />;
  };

  return (
    <div className="space-y-6">

      {/* B2C Preview Section */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-white">
            <Eye className="w-4 h-4 text-primary" />
            {t('onboarding.review.b2cPreview', 'B2C Preview')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={previewTab} onValueChange={(v) => setPreviewTab(v as "landing" | "dashboard")}>
            <TabsList className="w-full justify-start px-4 bg-white/5 rounded-none border-b border-white/10">
              <TabsTrigger value="landing" className="flex items-center gap-2 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">
                <Layout className="w-4 h-4" />
                {t('onboarding.review.landingPage', 'Landing Page')}
              </TabsTrigger>
              <TabsTrigger value="dashboard" className="flex items-center gap-2 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">
                <Home className="w-4 h-4" />
                {t('onboarding.review.dashboard', 'Dashboard')}
              </TabsTrigger>
            </TabsList>

            {/* Landing Page Preview */}
            <TabsContent value="landing" className="m-0">
              <div className="relative overflow-hidden rounded-b-lg" style={{ maxHeight: "400px" }}>
                {/* Mini Landing Page Preview */}
                <div 
                  className="relative"
                  style={{
                    background: showData.coverImageUrl 
                      ? `linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.9)), url(${showData.coverImageUrl}) center/cover`
                      : `linear-gradient(135deg, ${showData.primaryColor}20, ${showData.secondaryColor}40)`,
                  }}
                >
                  {/* Hero Section */}
                  <div className="px-6 py-8 text-center">
                    {showData.logoUrl ? (
                      <img src={showData.logoUrl} alt="Logo" className="h-12 w-auto mx-auto mb-4 object-contain" />
                    ) : (
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <Trophy className="h-8 w-8" style={{ color: showData.primaryColor }} />
                        <span className="text-xl font-bold text-white">Fantasy</span>
                      </div>
                    )}
                    <h1 className="text-2xl font-bold text-white mb-2">
                      Join Fantasy {showData.name || "Show"}
                    </h1>
                    {showData.seasonNumber && (
                      <p className="text-sm font-semibold mb-3" style={{ color: showData.primaryColor }}>
                        SEASON {showData.seasonNumber}
                      </p>
                    )}
                    <p className="text-sm text-gray-300 mb-4">
                      Compete with fellow fans. Track your predictions.
                    </p>
                    <div className="flex gap-2 justify-center">
                      <button 
                        className="px-4 py-2 rounded-full text-xs font-semibold text-white"
                        style={{ background: `linear-gradient(135deg, ${showData.primaryColor}, ${showData.secondaryColor})` }}
                      >
                        Register
                      </button>
                      <button className="px-4 py-2 rounded-full text-xs font-semibold text-white bg-white/20 border border-white/30">
                        Log In
                      </button>
                    </div>
                  </div>

                  {/* About Section Preview */}
                  {landingPageContent && landingPageContent.aboutItems.some(item => item.text) && (
                    <div className="bg-white/95 px-6 py-5">
                      <div className="space-y-2">
                        {landingPageContent.aboutItems.filter(item => item.text).slice(0, 3).map((item, i) => (
                          <div key={i} className="flex items-center gap-3 text-sm text-slate-700">
                            <div 
                              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ background: `${showData.primaryColor}15` }}
                            >
                              <span style={{ color: showData.primaryColor }}>{getIcon(item.icon)}</span>
                            </div>
                            <span>{item.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* How It Works Preview */}
                  {landingPageContent && landingPageContent.howItWorksCards.some(card => card.title) && (
                    <div className="bg-slate-50 px-6 py-5">
                      <div className="grid grid-cols-4 gap-3">
                        {landingPageContent.howItWorksCards.filter(card => card.title).map((card, i) => (
                          <div key={i} className="text-center">
                            <div 
                              className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-white shadow-sm"
                              style={{ background: `linear-gradient(135deg, ${showData.primaryColor}, ${showData.secondaryColor})` }}
                            >
                              {getIcon(card.icon)}
                            </div>
                            <p className="text-xs font-semibold text-slate-800">{card.title}</p>
                            {card.description && (
                              <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{card.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Dashboard Preview */}
            <TabsContent value="dashboard" className="m-0">
              <div className="bg-white p-6 rounded-b-lg" style={{ maxHeight: "400px", overflow: "hidden" }}>
                {/* Mini Navigation */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    {showData.logoUrl ? (
                      <img src={showData.logoUrl} alt="Logo" className="h-6 w-auto object-contain" />
                    ) : (
                      <Trophy className="h-5 w-5" style={{ color: showData.primaryColor }} />
                    )}
                    <span className="text-sm font-semibold text-slate-800">{showData.name || "Show"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600">User123</span>
                    <div className="w-6 h-6 rounded-full bg-slate-200" />
                  </div>
                </div>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-3 gap-4">
                  {/* Team Section */}
                  <div className="col-span-2">
                    <h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                      <Users className="w-4 h-4" style={{ color: showData.primaryColor }} />
                      Your Team
                    </h4>
                    <div className="grid grid-cols-5 gap-2">
                      {participants.length > 0 ? (
                        participants.slice(0, Math.min(gameSettings.playersPerTeam, 5)).map((p, i) => (
                          <div key={i} className="text-center">
                            <div className="w-10 h-10 rounded-full bg-slate-100 mx-auto mb-1 overflow-hidden">
                              {p.photoUrl ? (
                                <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                  <User className="w-5 h-5" />
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-slate-700 truncate">{p.name.split(" ")[0]}</p>
                          </div>
                        ))
                      ) : (
                        Array.from({ length: Math.min(gameSettings.playersPerTeam, 5) }).map((_, i) => (
                          <div key={i} className="text-center">
                            <div className="w-10 h-10 rounded-full bg-slate-100 mx-auto mb-1 flex items-center justify-center">
                              <User className="w-5 h-5 text-slate-300" />
                            </div>
                            <p className="text-xs text-slate-400">Slot {i + 1}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Points Section */}
                  <div className="space-y-3">
                    <div 
                      className="rounded-lg p-3"
                      style={{ background: `linear-gradient(135deg, ${showData.primaryColor}15, ${showData.secondaryColor}15)` }}
                    >
                      <p className="text-xs text-slate-500">Total Points</p>
                      <p className="text-xl font-bold text-slate-800">0</p>
                      <p className="text-xs text-slate-500 mt-1">Rank: #--</p>
                    </div>
                    <div className="rounded-lg p-3 bg-slate-50">
                      <p className="text-xs text-slate-500">Transfers</p>
                      <p className="text-lg font-bold text-slate-800">{gameSettings.transfersPerReset}</p>
                      <p className="text-xs text-slate-400">{transferFrequencyLabels[gameSettings.transferResetFrequency] || gameSettings.transferResetFrequency}</p>
                    </div>
                  </div>
                </div>

                {/* Rules Preview */}
                {gameRules.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" style={{ color: showData.primaryColor }} />
                      Scoring Rules
                    </h4>
                    <div className="flex gap-2 overflow-hidden">
                      {gameRules.slice(0, 4).map((rule, i) => (
                        <div 
                          key={i} 
                          className="flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                          style={{ 
                            background: rule.points >= 0 ? "#dcfce7" : "#fee2e2",
                            color: rule.points >= 0 ? "#166534" : "#991b1b"
                          }}
                        >
                          <span className="font-semibold">{rule.points > 0 ? `+${rule.points}` : rule.points}</span>
                          <span className="truncate max-w-[60px]">{rule.eventName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Show Info Summary */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-white">
            <Info className="w-4 h-4 text-primary" />
            {t('onboarding.review.showInformation')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Uploaded Images Preview */}
          {(showData.logoUrl || showData.coverImageUrl || showData.secondaryImageUrl) && (
            <div className="flex gap-4 pb-3 border-b border-white/10">
              {showData.logoUrl && (
                <div className="text-center">
                  <p className="text-xs text-white/60 mb-1">{t('settings.branding.logo')}</p>
                  <div className="w-16 h-16 rounded-lg border border-white/20 overflow-hidden bg-white/5">
                    <img src={showData.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  </div>
                </div>
              )}
              {showData.coverImageUrl && (
                <div className="text-center">
                  <p className="text-xs text-white/60 mb-1">{t('settings.branding.cover')}</p>
                  <div className="w-16 h-16 rounded-lg border border-white/20 overflow-hidden bg-white/5">
                    <img src={showData.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
              {showData.secondaryImageUrl && (
                <div className="text-center">
                  <p className="text-xs text-white/60 mb-1">{t('settings.branding.background')}</p>
                  <div className="w-16 h-16 rounded-lg border border-white/20 overflow-hidden bg-white/5">
                    <img src={showData.secondaryImageUrl} alt="Background" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-white/60">{t('onboarding.showName')}</p>
              <p className="font-medium text-white">{showData.name || t('common.notSpecified')}</p>
            </div>
            <div>
              <p className="text-xs text-white/60">{t('onboarding.seasonNumber')}</p>
              <p className="font-medium text-white">{showData.seasonNumber || 1}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-white/60">{t('onboarding.language')}</p>
              <p className="font-medium capitalize text-white">{showData.language || t('common.notSpecified')}</p>
            </div>
            <div>
              <p className="text-xs text-white/60">{t('onboarding.review.colors')}</p>
              <div className="flex items-center gap-2">
                <div 
                  className="w-6 h-6 rounded border border-white/20"
                  style={{ backgroundColor: showData.primaryColor }}
                />
                <div 
                  className="w-6 h-6 rounded border border-white/20"
                  style={{ backgroundColor: showData.secondaryColor }}
                />
              </div>
            </div>
          </div>
          {(showData.email || showData.phone) && (
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/10">
              {showData.email && (
                <div className="flex items-center gap-2 text-sm text-white">
                  <Mail className="w-3 h-3 text-white/60" />
                  <span>{showData.email}</span>
                </div>
              )}
              {showData.phone && (
                <div className="flex items-center gap-2 text-sm text-white">
                  <Phone className="w-3 h-3 text-white/60" />
                  <span>{showData.phone}</span>
                </div>
              )}
            </div>
          )}
          {showData.useSocialMedia && (showData.facebook || showData.instagram || showData.twitter || showData.tiktok) && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
              {showData.facebook && (
                <Badge variant="secondary" className="bg-white/10 text-white border-white/20">Facebook</Badge>
              )}
              {showData.instagram && (
                <Badge variant="secondary" className="bg-white/10 text-white border-white/20">Instagram</Badge>
              )}
              {showData.twitter && (
                <Badge variant="secondary" className="bg-white/10 text-white border-white/20">Twitter</Badge>
              )}
              {showData.tiktok && (
                <Badge variant="secondary" className="bg-white/10 text-white border-white/20">TikTok</Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Game Settings Summary */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-white">
            <Settings className="w-4 h-4 text-primary" />
            {t('onboarding.review.gameSettings')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-white/60">{t('onboarding.review.teamSize')}</p>
              <p className="font-medium text-white">{gameSettings.playersPerTeam} {t('onboarding.review.players')}</p>
            </div>
            <div>
              <p className="text-xs text-white/60">{t('onboarding.gameSettings.minBoys')}</p>
              <p className="font-medium text-white">{gameSettings.minBoys}</p>
            </div>
            <div>
              <p className="text-xs text-white/60">{t('onboarding.gameSettings.minGirls')}</p>
              <p className="font-medium text-white">{gameSettings.minGirls}</p>
            </div>
            <div>
              <p className="text-xs text-white/60">{t('onboarding.review.transferReset')}</p>
              <p className="font-medium text-white">{transferFrequencyLabels[gameSettings.transferResetFrequency] || gameSettings.transferResetFrequency}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Participants Summary */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-white">
            <Users className="w-4 h-4 text-primary" />
            {t('nav.participants')} ({participants.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {participants.length > 0 ? (
            <div className="border border-white/10 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 bg-white/5 hover:bg-white/5">
                    <TableHead className="text-white/60">#</TableHead>
                    <TableHead className="text-white/60">{t('common.name')}</TableHead>
                    <TableHead className="text-white/60">{t('common.age')}</TableHead>
                    <TableHead className="text-white/60">{t('common.gender')}</TableHead>
                    <TableHead className="text-white/60">{t('common.occupation')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participants.slice(0, 5).map((p, i) => (
                    <TableRow key={i} className="border-white/10">
                      <TableCell className="text-white">{i + 1}</TableCell>
                      <TableCell className="text-white">
                        <div className="flex items-center gap-2">
                          {p.photoUrl ? (
                            <img src={p.photoUrl} alt={p.name} className="w-6 h-6 rounded-full object-cover" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                              <User className="w-3 h-3 text-white/40" />
                            </div>
                          )}
                          {p.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-white/70">{p.age || "-"}</TableCell>
                      <TableCell className="text-white/70 capitalize">{p.gender || "-"}</TableCell>
                      <TableCell className="text-white/70">{p.occupation || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {participants.length > 5 && (
                <div className="px-4 py-2 bg-white/5 text-sm text-white/60 text-center">
                  +{participants.length - 5} {t('common.more')}
                </div>
              )}
            </div>
          ) : (
            <p className="text-white/60 text-sm">{t('onboarding.participants.emptyState')}</p>
          )}
        </CardContent>
      </Card>

      {/* Game Rules Summary */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-white">
            <FileText className="w-4 h-4 text-primary" />
            {t('nav.rules')} ({gameRules.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {gameRules.length > 0 ? (
            <div className="border border-white/10 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 bg-white/5 hover:bg-white/5">
                    <TableHead className="text-white/60">{t('admin.type')}</TableHead>
                    <TableHead className="text-white/60">{t('admin.eventName')}</TableHead>
                    <TableHead className="text-white/60">{t('admin.points')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gameRules.slice(0, 5).map((rule, i) => (
                    <TableRow key={i} className="border-white/10">
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={`${
                            rule.eventType === "positive" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                            rule.eventType === "negative" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                            rule.eventType === "bonus" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                            rule.eventType === "elimination" ? "bg-purple-500/20 text-purple-400 border-purple-500/30" :
                            "bg-blue-500/20 text-blue-400 border-blue-500/30"
                          }`}
                        >
                          {eventTypeLabels[rule.eventType] || rule.eventType}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-white">{rule.eventName}</TableCell>
                      <TableCell>
                        <span className={rule.points >= 0 ? "text-green-400" : "text-red-400"}>
                          {rule.points > 0 ? `+${rule.points}` : rule.points}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {gameRules.length > 5 && (
                <div className="px-4 py-2 bg-white/5 text-sm text-white/60 text-center">
                  +{gameRules.length - 5} {t('common.more')}
                </div>
              )}
            </div>
          ) : (
            <p className="text-white/60 text-sm">{t('onboarding.review.noRulesAdded')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
