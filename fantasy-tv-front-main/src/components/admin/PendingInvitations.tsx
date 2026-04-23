import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Shield, Edit2, Eye, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export interface PendingInvitation {
  id: string;
  show_id: string;
  role: string;
  can_publish_episodes: boolean;
  invited_at: string;
  show_name: string;
  season_number: number | null;
  show_status: string | null;
}

interface PendingInvitationsProps {
  invitations: PendingInvitation[];
  onUpdate: () => void;
}

export function PendingInvitations({ invitations, onUpdate }: PendingInvitationsProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (invitations.length === 0) return null;

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin": return <Shield className="h-4 w-4" />;
      case "editor": return <Edit2 className="h-4 w-4" />;
      default: return <Eye className="h-4 w-4" />;
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "admin": return "bg-red-500/20 text-red-400 border-0";
      case "editor": return "bg-amber-500/20 text-amber-400 border-0";
      default: return "bg-blue-500/20 text-blue-400 border-0";
    }
  };

  const handleAccept = async (invitation: PendingInvitation) => {
    setLoadingId(invitation.id);
    try {
      const { data, error } = await supabase.rpc("accept_admin_invitation", {
        p_invitation_id: invitation.id,
      });

      if (error) throw error;

      const result = data as any;
      if (!result?.success) {
        throw new Error(result?.error || "Failed to accept invitation");
      }

      toast({
        title: "Invitation accepted",
        description: `You now have access to ${invitation.show_name}`,
      });

      localStorage.setItem("admin_selected_show_id", invitation.show_id);
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error accepting invitation:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to accept invitation",
        variant: "destructive",
      });
    } finally {
      setLoadingId(null);
    }
  };

  const handleDecline = async (invitation: PendingInvitation) => {
    setLoadingId(invitation.id);
    try {
      const { data, error } = await supabase.rpc("decline_admin_invitation", {
        p_invitation_id: invitation.id,
      });

      if (error) throw error;

      const result = data as any;
      if (!result?.success) {
        throw new Error(result?.error || "Failed to decline invitation");
      }

      toast({
        title: "Invitation declined",
        description: `Invitation to ${invitation.show_name} has been declined`,
      });

      onUpdate();
    } catch (error: any) {
      console.error("Error declining invitation:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to decline invitation",
        variant: "destructive",
      });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-white/80 text-sm font-medium flex items-center gap-2">
        <Mail className="h-4 w-4" />
        Pending Invitations
      </h3>
      {invitations.map((inv) => (
        <div
          key={inv.id}
          className="p-4 rounded-lg border border-primary/30 bg-primary/10 backdrop-blur-sm space-y-3"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary font-bold text-sm flex-shrink-0">
              {inv.show_name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white truncate">
                  {inv.show_name}
                </span>
                {inv.season_number && (
                  <span className="text-white/70 text-sm">S{inv.season_number}</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge className={getRoleBadgeClass(inv.role)}>
                  {getRoleIcon(inv.role)}
                  <span className="ml-1 capitalize">{inv.role}</span>
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => handleAccept(inv)}
              disabled={loadingId === inv.id}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Check className="h-4 w-4 mr-1" />
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDecline(inv)}
              disabled={loadingId === inv.id}
              className="flex-1 border-white/20 text-white hover:bg-white/10"
            >
              <X className="h-4 w-4 mr-1" />
              Decline
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
