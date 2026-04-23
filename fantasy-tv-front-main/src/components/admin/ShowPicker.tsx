import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { PendingInvitations, PendingInvitation } from "@/components/admin/PendingInvitations";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ShowWithRole {
  id: string;
  name: string;
  season_number: number | null;
  status: string | null;
  role: string;
}

interface ShowPickerProps {
  shows: ShowWithRole[];
  onSelect: (showId: string) => void;
  isLoading?: boolean;
}

export function ShowPicker({ shows, onSelect, isLoading }: ShowPickerProps) {
  const { user } = useAuth();
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);

  const fetchPendingInvitations = async () => {
    if (!user?.email) return;
    const { data } = await supabase.rpc("get_pending_invitations_for_email", {
      p_email: user.email,
    });
    if (data) {
      setPendingInvitations(data as unknown as PendingInvitation[]);
    }
  };

  useEffect(() => {
    fetchPendingInvitations();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-4">
      {pendingInvitations.length > 0 && (
        <Card className="bg-white/10 backdrop-blur-md border-primary/30 w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-display text-white">Pending Invitations</CardTitle>
          </CardHeader>
          <CardContent>
            <PendingInvitations
              invitations={pendingInvitations}
              onUpdate={fetchPendingInvitations}
            />
          </CardContent>
        </Card>
      )}

      <Card className="bg-white/10 backdrop-blur-md border-white/20 w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-display text-white">Choose a Show</CardTitle>
          <CardDescription className="text-white/70">
            Select which show workspace to enter
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {shows.map((show) => (
            <button
              key={show.id}
              onClick={() => onSelect(show.id)}
              className="w-full flex items-center gap-4 p-4 rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors text-left group"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-primary font-bold text-lg flex-shrink-0">
                {show.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white truncate">
                    {show.name}
                  </span>
                  {show.season_number && (
                    <span className="text-white/70 text-sm">
                      S{show.season_number}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs border-white/30 text-white/80">
                    {show.role}
                  </Badge>
                  <span className="text-xs text-white/60">
                    {show.status || "draft"}
                  </span>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-white/60 group-hover:text-white transition-colors" />
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
