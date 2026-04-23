import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users } from "lucide-react";
import { EpisodeTeamMember } from "@/hooks/useUserTeamForEpisode";

interface B2CEpisodeTeamDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  episodeNumber: number;
  episodeName: string;
  teamMembers: EpisodeTeamMember[];
  isLoading: boolean;
}

export const B2CEpisodeTeamDrawer = ({
  open,
  onOpenChange,
  episodeNumber,
  episodeName,
  teamMembers,
  isLoading,
}: B2CEpisodeTeamDrawerProps) => {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Your Team for Episode {episodeNumber}
          </DrawerTitle>
          <DrawerDescription>
            These were your participants for {episodeName}
          </DrawerDescription>
        </DrawerHeader>
        
        <div className="px-4 pb-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : teamMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>You didn't have any participants on your team for this episode.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {teamMembers.map((member) => (
                <div
                  key={member.participant_id}
                  className="flex flex-col items-center p-3 rounded-lg bg-muted/50 border"
                >
                  <Avatar className="h-16 w-16 mb-2 border-2 border-primary/20">
                    <AvatarImage src={member.photo_url || undefined} alt={member.participant_name} />
                    <AvatarFallback className="text-lg font-medium">
                      {member.participant_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-center line-clamp-2">
                    {member.participant_name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Slot {member.slot_position}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};
