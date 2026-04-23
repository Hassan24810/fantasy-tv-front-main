import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { parsePointsPerPosition } from "@/lib/eventDisplayUtils";

export interface RuleTemplate {
  id: string;
  name: string;
  description: string | null;
  template: string;
  participantsCount: number;
  participantCountMode: "exact" | "variable";
  pointsPerPosition: number[];
  icon: string;
  eventType: string;
  isElimination: boolean;
  sortOrder: number;
}

export function useRuleTemplates() {
  const [templates, setTemplates] = useState<RuleTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from("rule_templates")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[useRuleTemplates] Failed to fetch templates:", error);
      setTemplates([]);
    } else {
      setTemplates(
        (data ?? []).map((t: any) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          template: t.template,
          participantsCount: t.participants_count,
          participantCountMode: t.participant_count_mode as "exact" | "variable",
          pointsPerPosition: parsePointsPerPosition(t.points_per_position),
          icon: t.icon || "star",
          eventType: t.event_type,
          isElimination: t.is_elimination || false,
          sortOrder: t.sort_order || 0,
        }))
      );
    }
    
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return {
    templates,
    isLoading,
    refetch: fetchTemplates,
  };
}
