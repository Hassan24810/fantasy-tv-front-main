import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { parsePointsPerPosition } from "@/lib/eventDisplayUtils";

export interface Rule {
  id: string;
  showId: string;
  title: string;
  description: string;
  template: string;
  icon: string;
  points: number;
  eventType: string;
  participantsCount: number;
  participantCountMode: "exact" | "variable";
  pointsPerPosition: number[];
  isElimination: boolean;
  eliminatedPosition: number | null;
}

// Valid event types that match the DB constraint
export const VALID_EVENT_TYPES = [
  { value: "positive", label: "Positive Event" },
  { value: "negative", label: "Negative Event" },
  { value: "bonus", label: "Bonus Event" },
  { value: "elimination", label: "Elimination" },
  { value: "social", label: "Social Event" },
] as const;

interface UseRulesOptions {
  showId: string | null | undefined;
}

export function useRules({ showId }: UseRulesOptions) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRules = useCallback(async () => {
    if (!showId) {
      setRules([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from("game_rules")
      .select("*")
      .eq("show_id", showId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[useRules] Failed to fetch rules:", error);
      setRules([]);
    } else {
      setRules(
        (data ?? []).map((r: any) => ({
          id: r.id,
          showId: r.show_id,
          title: r.event_name,
          description: r.description ?? "",
          template: r.template ?? "",
          icon: r.icon ?? "star",
          points: r.points,
          eventType: r.event_type,
          participantsCount: r.participants_count ?? 1,
          participantCountMode: (r.participant_count_mode as "exact" | "variable") ?? "exact",
          pointsPerPosition: parsePointsPerPosition(r.points_per_position),
          isElimination: r.is_elimination ?? false,
          eliminatedPosition: r.eliminated_position ?? null,
        }))
      );
    }
    setIsLoading(false);
  }, [showId]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const addRule = async (rule: Omit<Rule, "id" | "showId"> & { eliminatedPosition?: number }) => {
    if (!showId) {
      toast({
        title: "Error",
        description: "No show selected. Please select a show first.",
        variant: "destructive",
      });
      return false;
    }

    // Validate event type - cast to the union type
    type ValidEventType = "positive" | "negative" | "bonus" | "elimination" | "social";
    const validEventTypes: ValidEventType[] = ["positive", "negative", "bonus", "elimination", "social"];
    const eventType: ValidEventType = (validEventTypes as string[]).includes(rule.eventType) 
      ? (rule.eventType as ValidEventType) 
      : "positive";

    console.log("[useRules] Adding rule:", {
      showId,
      title: rule.title,
      eventType,
      points: rule.points,
      participantsCount: rule.participantsCount,
      isElimination: rule.isElimination,
    });

    // Prepare points_per_position: use provided array or fallback to single points value
    const pointsPerPosition = rule.pointsPerPosition && rule.pointsPerPosition.length > 0
      ? rule.pointsPerPosition
      : [rule.points];

    const { data, error } = await supabase.from("game_rules").insert({
      show_id: showId,
      event_name: rule.title,
      event_type: eventType as "positive" | "negative" | "bonus" | "elimination" | "social",
      points: rule.points,
      description: rule.description || null,
      template: rule.template || null,
      icon: rule.icon || "star",
      participants_count: rule.participantsCount || 1,
      participant_count_mode: rule.participantCountMode || "exact",
      points_per_position: pointsPerPosition,
      is_elimination: rule.isElimination || false,
      eliminated_position: rule.isElimination ? (rule.eliminatedPosition || 1) : null,
    } as any).select();

    if (error) {
      console.error("[useRules] Failed to add rule:", error);
      toast({
        title: "Error adding rule",
        description: error.message || "Failed to add rule. Please try again.",
        variant: "destructive",
      });
      return false;
    }

    console.log("[useRules] Rule added successfully:", data);
    toast({
      title: "Rule added",
      description: `${rule.title} has been added successfully.`,
    });
    await fetchRules();
    return true;
  };

  const updateRule = async (id: string, updates: Partial<Omit<Rule, "id" | "showId">>) => {
    const updatePayload: Record<string, any> = {};
    if (updates.title !== undefined) updatePayload.event_name = updates.title;
    if (updates.eventType !== undefined) {
      type ValidEventType = "positive" | "negative" | "bonus" | "elimination" | "social";
      const validEventTypes: ValidEventType[] = ["positive", "negative", "bonus", "elimination", "social"];
      updatePayload.event_type = (validEventTypes as string[]).includes(updates.eventType) 
        ? updates.eventType 
        : "positive";
    }
    if (updates.points !== undefined) updatePayload.points = updates.points;
    if (updates.description !== undefined) updatePayload.description = updates.description || null;
    if (updates.template !== undefined) updatePayload.template = updates.template || null;
    if (updates.icon !== undefined) updatePayload.icon = updates.icon || "star";
    if (updates.participantsCount !== undefined) updatePayload.participants_count = updates.participantsCount || 1;
    if (updates.participantCountMode !== undefined) updatePayload.participant_count_mode = updates.participantCountMode || "exact";
    if (updates.pointsPerPosition !== undefined) {
      updatePayload.points_per_position = updates.pointsPerPosition;
    }
    if (updates.isElimination !== undefined) updatePayload.is_elimination = updates.isElimination;
    if (updates.eliminatedPosition !== undefined) {
      updatePayload.eliminated_position = updates.isElimination ? updates.eliminatedPosition : null;
    }

    const { error } = await supabase
      .from("game_rules")
      .update(updatePayload as any)
      .eq("id", id);

    if (error) {
      console.error("[useRules] Failed to update rule:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update rule. Please try again.",
        variant: "destructive",
      });
      return false;
    }

    toast({
      title: "Rule updated",
      description: "Rule has been updated successfully.",
    });
    await fetchRules();
    return true;
  };

  const deleteRule = async (id: string, title?: string) => {
    const { error } = await supabase.from("game_rules").delete().eq("id", id);

    if (error) {
      console.error("[useRules] Failed to delete rule:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete rule. Please try again.",
        variant: "destructive",
      });
      return false;
    }

    toast({
      title: "Rule deleted",
      description: title ? `${title} has been deleted.` : "Rule deleted.",
      variant: "destructive",
    });
    await fetchRules();
    return true;
  };

  return {
    rules,
    isLoading,
    refetch: fetchRules,
    addRule,
    updateRule,
    deleteRule,
  };
}
