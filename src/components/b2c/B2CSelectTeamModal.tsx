import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { B2CTeamSelection } from "./B2CTeamSelection";
import { useShow } from "@/contexts/ShowContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Participant = Tables<"participants">;

interface B2CSelectTeamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onTeamSelected: () => void;
}

export const B2CSelectTeamModal = ({ open, onOpenChange, userId, onTeamSelected }: B2CSelectTeamModalProps) => {
  const { participants, show, episodes, events, settings } = useShow();
  const [selectedTeam, setSelectedTeam] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (selectedTeam.length === 0) {
      toast.error("Please select at least one participant for your team");
      return;
    }

    setIsLoading(true);
    try {
      // Validate team constraints
      const { data: validationResult, error: validationError } = await supabase.rpc(
        "validate_team_constraints",
        {
          p_show_id: show?.id || "",
          p_participant_ids: selectedTeam.map((p) => p.id),
        }
      );

      if (validationError) {
        console.error("Validation error:", validationError);
      } else if (validationResult) {
        const typedResult = validationResult as unknown as { valid: boolean; error: string | null };
        if (!typedResult.valid) {
          toast.error(typedResult.error || "Team does not meet requirements");
          setIsLoading(false);
          return;
        }
      }

      // Get current active episode
      const { data: activeEpisode } = await supabase.rpc("get_current_active_episode", {
        p_show_id: show?.id || "",
      });

      const currentEpisodeNumber = activeEpisode?.episode_number || 0;

      // Save team
      const teamInserts = selectedTeam.map((participant, index) => ({
        show_id: show?.id || "",
        user_id: userId,
        participant_id: participant.id,
        slot_position: index + 1,
        added_episode: currentEpisodeNumber + 1,
      }));

      const { error: teamError } = await supabase.from("user_teams").insert(teamInserts);

      if (teamError) {
        console.error("Error saving team:", teamError);
        toast.error("Failed to save team. Please try again.");
        setIsLoading(false);
        return;
      }

      toast.success("Team selected! Good luck!");
      setSelectedTeam([]);
      onOpenChange(false);
      onTeamSelected();
    } catch (error) {
      console.error("Team selection error:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto border-white/10 p-0"
        style={{
          background: "linear-gradient(135deg, rgba(15,15,25,0.98) 0%, rgba(10,10,18,0.99) 100%)",
          backdropFilter: "blur(20px)",
        }}
      >
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
        >
          <X className="h-5 w-5 text-white" />
        </button>

        <B2CTeamSelection
          participants={participants}
          episodes={episodes}
          events={events}
          selectedTeam={selectedTeam}
          onTeamChange={setSelectedTeam}
          onBack={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          gameSettings={settings}
        />
      </DialogContent>
    </Dialog>
  );
};
