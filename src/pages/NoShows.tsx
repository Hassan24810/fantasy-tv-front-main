import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FolderOpen, Plus, Mail } from "lucide-react";
import fantasyRealityIcon from "@/assets/fantasy-reality-icon.png";
import { PendingInvitations, PendingInvitation } from "@/components/admin/PendingInvitations";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const NoShows = () => {
  const navigate = useNavigate();
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

  return (
    <div className="min-h-screen onboarding-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <img 
            src={fantasyRealityIcon} 
            alt="Fantasy Reality" 
            className="h-12 w-auto"
          />
          <div className="flex flex-col leading-none">
            <span className="font-display font-bold text-base text-primary tracking-wide">FANTASY</span>
            <span className="font-display font-bold text-base text-white tracking-wide">REALITY</span>
          </div>
        </div>

        <div className="onboarding-container rounded-2xl p-6 md:p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-8 h-8 text-white/60" />
            </div>
            <h1 className="text-2xl font-display text-white font-bold mb-2">
              No Shows Yet
            </h1>
            <p className="text-white/70">
              You don't have access to any shows yet. Create a new show or accept an invitation.
            </p>
          </div>
          
          <div className="space-y-3">
            {pendingInvitations.length > 0 && (
              <>
                <PendingInvitations
                  invitations={pendingInvitations}
                  onUpdate={fetchPendingInvitations}
                />
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/20" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[#0F172A] px-2 text-white/50">or</span>
                  </div>
                </div>
              </>
            )}

            <Button
              onClick={() => navigate("/onboarding")}
              className="w-full bg-primary hover:bg-primary/90 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create a New Show
            </Button>
            
            {pendingInvitations.length === 0 && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/20" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[#0F172A] px-2 text-white/50">or</span>
                  </div>
                </div>

                <div className="text-center p-4 bg-[#1A2332] rounded-lg border border-white/10">
                  <Mail className="w-5 h-5 text-white/60 mx-auto mb-2" />
                  <p className="text-sm text-white/70">
                    If you should have access to an existing show, please contact the show administrator to invite you.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-white/70 text-sm mt-6">
          <button
            onClick={() => navigate("/")}
            className="hover:text-white transition-colors"
          >
            ← Back to home
          </button>
        </p>
      </div>
    </div>
  );
};

export default NoShows;
