import { Trophy, Star, TrendingUp, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export interface TeamMember {
  id: string;
  name: string;
  photoUrl?: string;
  role: string;
  points: number;
  status: "active" | "eliminated";
}

export interface LeagueUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  points: number;
  teamSize: number;
  joinedAt: string;
  team: TeamMember[];
}

interface UserTeamDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: LeagueUser | null;
}

export function UserTeamDrawer({ open, onOpenChange, user }: UserTeamDrawerProps) {
  if (!user) return null;

  const activeMembers = user.team.filter(m => m.status === "active").length;
  const totalTeamPoints = user.team.reduce((sum, m) => sum + m.points, 0);
  const avgPoints = user.team.length > 0 ? Math.round(totalTeamPoints / user.team.length) : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg bg-white border-l border-slate-200 p-0">
        <SheetHeader className="p-6 border-b border-slate-100">
          <SheetTitle className="text-xl font-semibold text-slate-900">
            User Team
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-80px)]">
          <div className="p-6 space-y-6">
            {/* User Profile Card */}
            <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20">
              <Avatar className="h-16 w-16 border-4 border-white shadow-lg">
                <AvatarImage src={user.avatarUrl} />
                <AvatarFallback className="bg-primary text-white text-xl font-bold">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
                <p className="text-sm text-slate-500">{user.email}</p>
                <p className="text-xs text-slate-400 mt-1">Joined {user.joinedAt}</p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-100">
                <Trophy className="h-5 w-5 text-amber-500 mx-auto mb-2" />
                <p className="text-xl font-bold text-slate-900">{user.points.toLocaleString()}</p>
                <p className="text-xs text-slate-500">Total Points</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
                <Users className="h-5 w-5 text-green-500 mx-auto mb-2" />
                <p className="text-xl font-bold text-slate-900">{activeMembers}/{user.team.length}</p>
                <p className="text-xs text-slate-500">Active</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
                <TrendingUp className="h-5 w-5 text-blue-500 mx-auto mb-2" />
                <p className="text-xl font-bold text-slate-900">{avgPoints}</p>
                <p className="text-xs text-slate-500">Avg Points</p>
              </div>
            </div>

            {/* Team Members */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Team Members</h3>
              <div className="space-y-3">
                {user.team.map((member, index) => (
                  <div
                    key={member.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                      member.status === "eliminated" 
                        ? "bg-slate-50 border-slate-200 opacity-60" 
                        : "bg-white border-slate-200 hover:border-primary/30 hover:shadow-sm"
                    }`}
                  >
                    <div className="relative">
                      <Avatar className="h-12 w-12 border-2 border-white shadow">
                        <AvatarImage src={member.photoUrl} />
                        <AvatarFallback className="bg-slate-100 text-slate-600 font-medium">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      {index === 0 && member.status === "active" && (
                        <div className="absolute -top-1 -right-1 bg-amber-400 rounded-full p-1">
                          <Star className="h-3 w-3 text-white fill-white" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900 truncate">{member.name}</p>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            member.status === "active"
                              ? "border-green-200 bg-green-50 text-green-700"
                              : "border-red-200 bg-red-50 text-red-700"
                          }`}
                        >
                          {member.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500">{member.role}</p>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-slate-900">{member.points.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">pts</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
