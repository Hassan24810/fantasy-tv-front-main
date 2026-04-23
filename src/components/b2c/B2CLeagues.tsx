import { useState, useEffect } from "react";
import { useShow } from "@/contexts/ShowContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Trophy, Eye, ArrowLeft, Loader2, CirclePlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useB2CLeagues, type B2CLeague, type LeagueMember } from "@/hooks/useB2CLeagues";
import { supabase } from "@/integrations/supabase/client";
import { B2CContentContainer } from "./B2CContentContainer";
import { LeagueInsights } from "./LeagueInsights";
import { useLeagueInsights } from "@/hooks/useLeagueInsights";
import { useTranslation } from "react-i18next";

interface LeagueDetailProps {
  league: B2CLeague;
  onBack: () => void;
  getLeaderboard: (leagueId: string) => Promise<LeagueMember[]>;
  showId: string | undefined;
}

const LeagueDetail = ({ league, onBack, getLeaderboard, showId }: LeagueDetailProps) => {
  const { t } = useTranslation();
  const [members, setMembers] = useState<LeagueMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // League insights for this specific league
  const { data: insightsData, isLoading: insightsLoading } = useLeagueInsights(showId, league.id);

  useEffect(() => {
    const fetchMembers = async () => {
      setIsLoading(true);
      const data = await getLeaderboard(league.id);
      setMembers(data);
      setIsLoading(false);
    };
    fetchMembers();
  }, [league.id, getLeaderboard]);

  return (
    <B2CContentContainer className="max-w-[1480px]">
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="inline-flex items-center gap-2 text-slate-700 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
        </button>
      </div>

      <Card className="border-slate-200 shadow-sm rounded-xl">
          <CardHeader className="pb-0 pt-5">
            <CardTitle className="text-xl md:text-2xl font-bold text-slate-900">League Detail</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 md:-mx-6">
                <div className="min-w-[660px] px-4 md:px-6">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Name</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">GW Score</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Total score</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Rounds since active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((member) => (
                        <tr
                          key={member.member_id}
                          className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={member.avatar_url || undefined} />
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                  {member.username.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium text-slate-900">{member.username}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">{member.gameweek_points}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-900">{member.total_points}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{member.team_size}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {members.length === 0 && (
                    <div className="p-16 text-center">
                      <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500">{t('leagues.noMembersYet')}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
      </Card>

      {/* League Insights - At the bottom */}
      <div>
        <LeagueInsights mode="league" data={insightsData} isLoading={insightsLoading} />
      </div>
      </div>
    </B2CContentContainer>
  );
};

export const B2CLeagues = () => {
  const { show } = useShow();
  const { t } = useTranslation();
  const [userId, setUserId] = useState<string | undefined>();
  const [selectedLeague, setSelectedLeague] = useState<B2CLeague | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);

  // Form states
  const [newLeagueName, setNewLeagueName] = useState("");
  const [newLeagueDescription, setNewLeagueDescription] = useState("");
  const [newLeaguePublic, setNewLeaguePublic] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    userLeagues,
    isLoading,
    createLeague,
    joinByCode,
    leaveLeague,
    getLeaderboard,
  } = useB2CLeagues(show?.id, userId);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id);
    };
    getUser();
  }, []);

  const handleCreateLeague = async () => {
    if (!newLeagueName.trim()) return;
    setIsSubmitting(true);
    const result = await createLeague(newLeagueName, newLeagueDescription, newLeaguePublic);
    if (result.success && result.league_id) {
      setCreateDialogOpen(false);
      setNewLeagueName("");
      setNewLeagueDescription("");
      setNewLeaguePublic(true);
      // Wait briefly for refetch to complete, then navigate to the created league
      setTimeout(() => {
        const createdLeague = userLeagues.find(l => l.id === result.league_id);
        if (createdLeague) {
          setSelectedLeague(createdLeague);
        }
      }, 500);
    }
    setIsSubmitting(false);
  };

  const handleJoinByCode = async () => {
    if (!joinCode.trim()) return;
    setIsSubmitting(true);
    const result = await joinByCode(joinCode);
    if (result.success) {
      setJoinDialogOpen(false);
      setJoinCode("");
      // Navigate to the joined league if we got the league_id
      if (result.league_id) {
        setTimeout(() => {
          const joinedLeague = userLeagues.find(l => l.id === result.league_id);
          if (joinedLeague) {
            setSelectedLeague(joinedLeague);
          }
        }, 500);
      }
    }
    setIsSubmitting(false);
  };

  if (selectedLeague) {
    return (
      <LeagueDetail
        league={selectedLeague}
        onBack={() => setSelectedLeague(null)}
        getLeaderboard={getLeaderboard}
        showId={show?.id}
      />
    );
  }

  return (
    <B2CContentContainer className="max-w-[1480px]">
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* My Leagues */}
          <Card className="border-slate-200 shadow-sm rounded-xl">
            <CardHeader className="pb-0">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <CardTitle className="text-2xl font-bold text-slate-900">{t('leagues.title')}</CardTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:flex md:items-center md:gap-3 w-full md:w-auto">
                  <Button onClick={() => setCreateDialogOpen(true)} className="gap-2 rounded-md w-full md:w-auto">
                    <Trophy className="h-4 w-4" />
                    {t('leagues.createLeague')}
                  </Button>
                  <Button variant="outline" onClick={() => setJoinDialogOpen(true)} className="gap-2 rounded-md w-full md:w-auto">
                    <CirclePlus className="h-4 w-4" />
                    {t('leagues.joinLeague')}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {userLeagues.length === 0 ? (
                <div className="py-12 text-center">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600 text-lg">{t('leagues.noLeaguesYet')}</p>
                  <p className="text-slate-400 text-sm mt-2">{t('leagues.createOrJoin')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 md:-mx-6">
                  <div className="min-w-[920px] px-4 md:px-6">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-100">
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">{t('leagues.leagueName')}</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Current Rank</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Last Rank</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Number of users</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Current leader</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">{t('leagues.leagueCode')}</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">{t('leagues.action')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userLeagues.map((league) => (
                          <tr
                            key={league.id}
                            className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                          >
                            <td className="px-4 py-3 text-sm font-medium text-slate-900">{league.name}</td>
                            <td className="px-4 py-3 text-sm text-slate-700">
                              {league.user_rank ? `#${league.user_rank}` : "-"}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-700">
                              {league.user_rank ? `#${Math.max(1, league.user_rank + 1)}` : "-"}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-700">{league.member_count}</td>
                            <td className="px-4 py-3">
                              {league.leader_name ? (
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                      {league.leader_name.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm text-slate-500">{league.leader_name}</span>
                                </div>
                              ) : (
                                <span className="text-sm text-slate-500">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-slate-700">{league.invite_code}</td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => setSelectedLeague(league)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20"
                                aria-label={t('leagues.view')}
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      )}

      {/* Create League Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-white border-border w-[calc(100vw-24px)] max-w-[calc(100vw-24px)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">{t("leagues.createLeague")}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t("leagues.createAndInvite")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="league-name" className="text-foreground">{t("leagues.leagueName")}</Label>
              <Input
                id="league-name"
                placeholder={t("leagues.enterLeagueName")}
                value={newLeagueName}
                onChange={(e) => setNewLeagueName(e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="league-description" className="text-foreground">{t("leagues.descriptionOptional")}</Label>
              <Input
                id="league-description"
                placeholder={t("leagues.describeLeague")}
                value={newLeagueDescription}
                onChange={(e) => setNewLeagueDescription(e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="league-public" className="text-foreground">{t("leagues.isPublic")}</Label>
              <Switch
                id="league-public"
                checked={newLeaguePublic}
                onCheckedChange={setNewLeaguePublic}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleCreateLeague}
              disabled={isSubmitting || !newLeagueName.trim()}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t("leagues.createLeague")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Join League Dialog */}
      <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <DialogContent className="bg-white border-border w-[calc(100vw-24px)] max-w-[calc(100vw-24px)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">{t("leagues.joinLeague")}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t("leagues.enterCodeToJoin")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="league-code" className="text-foreground">{t("leagues.leagueCode")}</Label>
              <Input
                id="league-code"
                placeholder={t("leagues.codeExample")}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="bg-background"
              />
            </div>
            <Button
              className="w-full"
              onClick={handleJoinByCode}
              disabled={isSubmitting || !joinCode.trim()}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t("leagues.joinLeague")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </B2CContentContainer>
  );
};
