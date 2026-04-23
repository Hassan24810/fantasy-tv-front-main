import { useState } from "react";
import { Trophy, Users, Eye, ArrowUpDown, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { UserTeamDrawer, LeagueUser } from "./UserTeamDrawer";
import { useLeagueMembers, type LeagueMember } from "@/hooks/useLeagueMembers";
import { useTranslation } from "react-i18next";

export interface LeagueDetail {
  id: string;
  name: string;
  totalPoints: number;
  status: "Public" | "Private";
  code: string;
  creator: string;
  createdAt: string;
  description?: string;
  showId?: string;
  users?: LeagueUser[]; // Kept for backwards compat, but we'll use real data
}

interface LeagueDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  league: LeagueDetail | null;
}

export function LeagueDetailDrawer({ open, onOpenChange, league }: LeagueDetailDrawerProps) {
  const { t } = useTranslation();
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedUser, setSelectedUser] = useState<LeagueUser | null>(null);
  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState(false);

  // Use real league members from the database
  const { members, isLoading } = useLeagueMembers(
    open ? league?.id : undefined, 
    league?.showId
  );

  if (!league) return null;

  // Sort members by total points
  const sortedMembers = [...members].sort((a, b) => 
    sortAsc ? a.totalPoints - b.totalPoints : b.totalPoints - a.totalPoints
  );

  // Calculate total points and gameweek points across all members
  const totalLeaguePoints = members.reduce((sum, m) => sum + m.totalPoints, 0);
  const totalLeagueGWPoints = members.reduce((sum, m) => sum + m.gameweekPoints, 0);

  const handleViewUser = (member: LeagueMember) => {
    // Convert LeagueMember to LeagueUser format for the drawer
    const user: LeagueUser = {
      id: member.userId,
      name: member.username,
      email: "", // Not available from league_members
      avatarUrl: member.avatarUrl || undefined,
      points: member.totalPoints,
      teamSize: member.teamSize,
      joinedAt: member.joinedAt,
      team: [], // Team will be loaded by the drawer
    };
    setSelectedUser(user);
    setIsUserDrawerOpen(true);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl bg-white border-l border-slate-200 p-0">
          <SheetHeader className="p-6 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-xl font-semibold text-slate-900">
                {t('admin.leagueDetails')}
              </SheetTitle>
            </div>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-80px)]">
            <div className="p-6 space-y-6">
              {/* League Info Card */}
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-6 border border-primary/20">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{league.name}</h2>
                    <p className="text-sm text-slate-500 mt-1">{t('admin.createdBy', { name: league.creator })}</p>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`font-normal ${
                      league.status === "Public" 
                        ? "border-green-200 bg-green-50 text-green-700" 
                        : "border-orange-200 bg-orange-50 text-orange-700"
                    }`}
                  >
                    {league.status === "Public" ? t('leagues.public') : t('leagues.private')}
                  </Badge>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-white/60 rounded-lg p-4 text-center">
                    <Trophy className="h-5 w-5 text-amber-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-slate-900">
                      {isLoading ? "..." : totalLeaguePoints.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500">{t('dashboard.totalPoints')}</p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-4 text-center">
                    <Trophy className="h-5 w-5 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-bold text-slate-900">
                      {isLoading ? "..." : totalLeagueGWPoints.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500">{t('dashboard.gwPoints')}</p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-4 text-center">
                    <Users className="h-5 w-5 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-bold text-slate-900">
                      {isLoading ? "..." : members.length}
                    </p>
                    <p className="text-xs text-slate-500">{t('leagues.members')}</p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-4 text-center">
                    <div className="h-5 w-5 mx-auto mb-2 flex items-center justify-center">
                      <span className="text-sm font-mono text-primary">#</span>
                    </div>
                    <p className="text-sm font-mono font-bold text-slate-900">{league.code}</p>
                    <p className="text-xs text-slate-500">{t('leagues.inviteCode')}</p>
                  </div>
                </div>
              </div>

              {/* Users List */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">{t('admin.leagueMembers')}</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortAsc(!sortAsc)}
                    className="gap-2 text-slate-600 border-slate-200"
                  >
                    <ArrowUpDown className="h-4 w-4" />
                    {sortAsc ? t('common.lowToHigh') : t('common.highToLow')}
                  </Button>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-8 text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    {t('admin.loadingMembers')}
                  </div>
                ) : sortedMembers.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    {t('leagues.noMembersYet')}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sortedMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors group"
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          member.rank === 1 ? "bg-amber-100 text-amber-700" :
                          member.rank === 2 ? "bg-slate-200 text-slate-700" :
                          member.rank === 3 ? "bg-orange-100 text-orange-700" :
                          "bg-slate-100 text-slate-500"
                        }`}>
                          {member.rank}
                        </div>
                        
                        <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                          <AvatarImage src={member.avatarUrl || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary font-medium">
                            {member.username.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">{member.username}</p>
                          <p className="text-sm text-slate-500">{t('admin.teamMembers', { count: member.teamSize })}</p>
                        </div>

                        <div className="text-right mr-2">
                          <p className="font-bold text-slate-900">{member.totalPoints.toLocaleString()}</p>
                          <p className="text-xs text-emerald-600 font-medium">GW: {member.gameweekPoints.toLocaleString()}</p>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewUser(member)}
                          className="gap-1 text-primary hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Eye className="h-4 w-4" />
                          {t('admin.view')}
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <UserTeamDrawer
        open={isUserDrawerOpen}
        onOpenChange={setIsUserDrawerOpen}
        user={selectedUser}
      />
    </>
  );
}