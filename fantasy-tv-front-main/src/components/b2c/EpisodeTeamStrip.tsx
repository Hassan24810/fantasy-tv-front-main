import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TeamMember {
  participant_id: string;
  name: string;
  photo_url: string | null;
  slot_position: number;
}

interface EpisodeTeamStripProps {
  teamMembers: TeamMember[];
  selectedParticipantId: string | null;
  onParticipantClick: (participantId: string) => void;
}

export const EpisodeTeamStrip = ({
  teamMembers,
  selectedParticipantId,
  onParticipantClick,
}: EpisodeTeamStripProps) => {
  if (teamMembers.length === 0) {
    return (
      <div className="bg-muted/30 border border-border rounded-lg p-4 mb-4">
        <p className="text-sm text-muted-foreground text-center">
          No team set for this episode
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-4">
      <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
        Your Team
      </p>
      <div className="flex flex-wrap gap-3">
        <TooltipProvider>
          {teamMembers.map((member) => {
            const isSelected = selectedParticipantId === member.participant_id;
            return (
              <Tooltip key={member.participant_id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onParticipantClick(member.participant_id)}
                    className="flex flex-col items-center gap-1 group focus:outline-none"
                  >
                    <Avatar
                      className={cn(
                        "h-10 w-10 cursor-pointer transition-all duration-200",
                        "hover:scale-105 hover:ring-2 hover:ring-primary/50",
                        isSelected && "ring-2 ring-primary scale-105"
                      )}
                    >
                      <AvatarImage
                        src={member.photo_url || undefined}
                        alt={member.name}
                        className="object-cover"
                      />
                      <AvatarFallback className="text-xs bg-muted">
                        {member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={cn(
                        "text-xs max-w-[60px] truncate transition-colors",
                        isSelected
                          ? "text-primary font-medium"
                          : "text-muted-foreground group-hover:text-foreground"
                      )}
                    >
                      {member.name.split(" ")[0]}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{member.name}</p>
                  {isSelected && (
                    <p className="text-xs text-muted-foreground">
                      Click to show all team events
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>
      {selectedParticipantId && (
        <p className="text-xs text-muted-foreground mt-3">
          Filtering to events involving{" "}
          <span className="font-medium text-primary">
            {teamMembers.find((m) => m.participant_id === selectedParticipantId)
              ?.name || "selected player"}
          </span>
          . Click again to clear.
        </p>
      )}
    </div>
  );
};
