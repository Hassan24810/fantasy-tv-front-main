import { ReactNode, useState } from "react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GoldPointsBadge } from "@/components/ui/GoldPointsBadge";
import { Users } from "lucide-react";
import { Rule } from "@/hooks/useRules";
import { useIsMobile } from "@/hooks/use-mobile";
import { RuleIconOnly } from "@/components/ui/RuleIcon";

interface RuleHoverCardProps {
  rule: Rule;
  icon: string | null | undefined;
  children: ReactNode;
}

function RuleDetails({ rule, icon }: { rule: Rule; icon: string | null | undefined }) {
  return (
    <>
      {/* Header with icon and title */}
      <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white shadow-sm border border-slate-200">
          <RuleIconOnly icon={icon} className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-slate-900 truncate">{rule.title}</h4>
          <span className="text-xs text-slate-500 capitalize">{rule.eventType} event</span>
        </div>
        <GoldPointsBadge points={rule.points} size="lg" />
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Description */}
        {rule.description && (
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Description
            </label>
            <p className="mt-1 text-sm text-slate-700 leading-relaxed">{rule.description}</p>
          </div>
        )}

        {/* Template */}
        {rule.template && (
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Template
            </label>
            <p className="mt-1 text-sm text-slate-600 font-mono bg-slate-50 rounded-md px-2 py-1.5 border border-slate-200">
              {rule.template}
            </p>
          </div>
        )}

        {/* Participants */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <Users className="h-4 w-4 text-slate-400" />
          <span className="text-sm text-slate-600">
            {rule.participantsCount} participant{rule.participantsCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </>
  );
}

export function RuleHoverCard({ rule, icon, children }: RuleHoverCardProps) {
  const isMobile = useIsMobile();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (isMobile) {
    return (
      <>
        <div onClick={() => setDialogOpen(true)} className="cursor-pointer">
          {children}
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="p-0 overflow-hidden max-w-sm bg-white border border-slate-200 rounded-xl">
            <DialogHeader className="sr-only">
              <DialogTitle>{rule.title}</DialogTitle>
            </DialogHeader>
            <RuleDetails rule={rule} icon={icon} />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <HoverCard openDelay={200} closeDelay={100}>
        <HoverCardTrigger asChild>
          <div onClick={() => setDialogOpen(true)} className="cursor-pointer">
            {children}
          </div>
        </HoverCardTrigger>
        <HoverCardContent
          side="right"
          align="start"
          className="w-80 p-0 overflow-hidden bg-white border border-slate-200 shadow-xl rounded-xl"
        >
          <RuleDetails rule={rule} icon={icon} />
        </HoverCardContent>
      </HoverCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="p-0 overflow-hidden max-w-sm bg-white border border-slate-200 rounded-xl">
          <DialogHeader className="sr-only">
            <DialogTitle>{rule.title}</DialogTitle>
          </DialogHeader>
          <RuleDetails rule={rule} icon={icon} />
        </DialogContent>
      </Dialog>
    </>
  );
}
