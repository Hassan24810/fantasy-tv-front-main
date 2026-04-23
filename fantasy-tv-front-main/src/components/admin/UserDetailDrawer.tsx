import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Calendar, Loader2, ChevronRight } from "lucide-react";
import type { AdminShowUser } from "@/hooks/useAdminShowUsers";
import { useAdminUserTeam } from "@/hooks/useAdminUserTeam";
import { useAdminUserLeagues, UserLeague } from "@/hooks/useAdminUserLeagues";
import { useAdminShow } from "@/contexts/AdminShowContext";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { LeagueDetailDrawer, LeagueDetail } from "./LeagueDetailDrawer";

interface UserDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminShowUser | null;
}

export function UserDetailDrawer({ open, onOpenChange, user }: UserDetailDrawerProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");
  const { show } = useAdminShow();
  const { team, isLoading: isTeamLoading } = useAdminUserTeam(
    show?.id,
    user?.user_id
  );
  const { leagues, isLoading: isLeaguesLoading } = useAdminUserLeagues(
    show?.id,
    user?.user_id
  );

  // State for league detail drawer
  const [selectedLeague, setSelectedLeague] = useState<LeagueDetail | null>(null);
  const [isLeagueDrawerOpen, setIsLeagueDrawerOpen] = useState(false);

  if (!user) return null;

  const initials = user.username
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleOpenLeague = (league: UserLeague) => {
    const leagueDetail: LeagueDetail = {
      id: league.id,
      name: league.name,
      totalPoints: league.leagueTotalPoints,
      status: league.isPublic ? "Public" : "Private",
      code: "", // Not available from this data
      creator: "", // Not available from this data
      createdAt: league.joinedAt,
      showId: show?.id,
    };
    setSelectedLeague(leagueDetail);
    setIsLeagueDrawerOpen(true);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg bg-white border-border overflow-y-auto">
          <SheetHeader className="pb-6 border-b border-slate-200">
            {/* User Header */}
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 border-2 border-primary/30">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary text-xl font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <SheetTitle className="text-xl font-bold text-slate-900 mb-1">
                  {user.username}
                </SheetTitle>
                <p className="text-sm text-slate-500 mb-2">{user.email}</p>
                <div className="flex items-center gap-2">
                  {user.gender && (
                    <Badge variant="secondary">
                      {user.gender}
                    </Badge>
                  )}
                  <Badge className="bg-primary/20 text-primary border-0">
                    <Trophy className="h-3 w-3 mr-1" />
                    {user.total_points} pts
                  </Badge>
                </div>
              </div>
            </div>
          </SheetHeader>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="grid grid-cols-4 bg-slate-100 p-1 rounded-lg">
              <TabsTrigger
                value="overview"
                className="flex items-center gap-1 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md text-xs"
              >
                <Users className="h-3 w-3" />
                {t('admin.overview', 'Overview')}
              </TabsTrigger>
              <TabsTrigger
                value="team"
                className="flex items-center gap-1 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md text-xs"
              >
                <Users className="h-3 w-3" />
                {t('admin.team', 'Team')}
              </TabsTrigger>
              <TabsTrigger
                value="leagues"
                className="flex items-center gap-1 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md text-xs"
              >
                <Trophy className="h-3 w-3" />
                {t('admin.userLeagues', 'Leagues')}
              </TabsTrigger>
              <TabsTrigger
                value="stats"
                className="flex items-center gap-1 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md text-xs"
              >
                <Trophy className="h-3 w-3" />
                {t('admin.stats', 'Stats')}
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-slate-50 border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                      <Trophy className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-wider">{t('dashboard.totalPoints')}</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{user.total_points}</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-50 border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                      <Users className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-wider">{t('dashboard.gwPoints')}</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{user.gameweek_points}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-slate-50 border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                      <Users className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-wider">{t('admin.teamSize', 'Team Size')}</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{user.team_size}</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-50 border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                      <Calendar className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-wider">{t('admin.memberSince')}</span>
                    </div>
                    <p className="text-lg font-semibold text-slate-900">
                      {format(new Date(user.joined_at), 'MMM d, yyyy')}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="border-t pt-4">
                <p className="text-xs text-slate-400">
                  User ID: <span className="font-mono">{user.id}</span>
                </p>
              </div>
            </TabsContent>

            {/* Team Tab */}
            <TabsContent value="team" className="mt-6 space-y-4">
              {isTeamLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : team.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-lg font-medium">{t('admin.noTeamMembers', 'No team members')}</p>
                  <p className="text-sm">{t('admin.noTeamMembersDesc', "This user hasn't selected any participants yet")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {team.map((member) => (
                    <Card key={member.team_member_id} className="bg-slate-50 border-slate-200">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={member.participant_photo_url || undefined} />
                            <AvatarFallback className="bg-primary/20 text-primary text-sm">
                              {member.participant_name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 truncate">
                              {member.participant_name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {t('admin.addedEpisode', 'Added: Episode')} {member.added_episode}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-primary">{member.total_points} pts</p>
                            <p className="text-xs text-slate-500">{t('dashboard.gwPoints')}: {member.gameweek_points}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Leagues Tab */}
            <TabsContent value="leagues" className="mt-6 space-y-4">
              {isLeaguesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : leagues.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Trophy className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-lg font-medium">{t('admin.noLeaguesForUser', 'No leagues')}</p>
                  <p className="text-sm">{t('admin.noLeaguesForUserDesc', 'This user is not in any leagues.')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {leagues.map((league) => (
                    <Card key={league.id} className="bg-slate-50 border-slate-200 hover:bg-slate-100 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-amber-500" />
                            <span className="font-semibold text-slate-900">{league.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                league.isPublic 
                                  ? "border-green-200 bg-green-50 text-green-700" 
                                  : "border-orange-200 bg-orange-50 text-orange-700"
                              }`}
                            >
                              {league.isPublic ? t('leagues.public') : t('leagues.private')}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenLeague(league)}
                              className="h-7 px-2 text-primary hover:text-primary hover:bg-primary/10"
                            >
                              {t('admin.openLeague', 'Open')}
                              <ChevronRight className="h-3 w-3 ml-1" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2 mb-2">
                          <div className="text-center p-2 bg-white/60 rounded-lg">
                            <p className="text-xs text-slate-500 mb-1">{t('admin.userRank', 'Rank')}</p>
                            <p className="font-bold text-slate-900">
                              #{league.userRank} <span className="text-xs font-normal text-slate-500">{t('common.of')} {league.memberCount}</span>
                            </p>
                          </div>
                          <div className="text-center p-2 bg-white/60 rounded-lg">
                            <p className="text-xs text-slate-500 mb-1">{t('admin.userPts', 'User Pts')}</p>
                            <p className="font-bold text-slate-900">{league.userTotalPoints.toLocaleString()}</p>
                          </div>
                          <div className="text-center p-2 bg-white/60 rounded-lg">
                            <p className="text-xs text-slate-500 mb-1">{t('leagues.totalPts')}</p>
                            <p className="font-bold text-amber-600">{league.leagueTotalPoints.toLocaleString()}</p>
                          </div>
                          <div className="text-center p-2 bg-white/60 rounded-lg">
                            <p className="text-xs text-slate-500 mb-1">{t('leagues.gwPts')}</p>
                            <p className="font-bold text-emerald-600">{league.leagueGwPoints.toLocaleString()}</p>
                          </div>
                        </div>

                        <p className="text-xs text-slate-400">
                          {t('admin.joinedOn', 'Joined')}: {format(new Date(league.joinedAt), 'MMM d, yyyy')}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Stats Tab */}
            <TabsContent value="stats" className="mt-6 space-y-4">
              <div className="text-center py-8 text-slate-500">
                <Trophy className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p className="text-lg font-medium">{t('admin.statsComingSoon', 'Stats coming soon')}</p>
                <p className="text-sm">{t('admin.statsComingSoonDesc', 'Detailed user statistics will be available here')}</p>
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <LeagueDetailDrawer
        open={isLeagueDrawerOpen}
        onOpenChange={setIsLeagueDrawerOpen}
        league={selectedLeague}
      />
    </>
  );
}
