import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminShow } from "@/contexts/AdminShowContext";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type ShowUpdate = Tables<"show_updates">;

interface CreateUpdateInput {
  title: string;
  body: string;
  type?: string;
  publish_at: string;
  expire_at?: string | null;
  is_enabled?: boolean;
  media_url?: string | null;
}

interface UpdateUpdateInput extends Partial<CreateUpdateInput> {
  id: string;
}

export function useUpdates() {
  const { show } = useAdminShow();
  const queryClient = useQueryClient();

  const { data: updates = [], isLoading } = useQuery({
    queryKey: ["show-updates", show?.id],
    queryFn: async () => {
      if (!show?.id) return [];

      const { data, error } = await supabase
        .from("show_updates")
        .select("*")
        .eq("show_id", show.id)
        .order("publish_at", { ascending: false });

      if (error) throw error;
      return data as ShowUpdate[];
    },
    enabled: !!show?.id,
  });

  const createUpdate = useMutation({
    mutationFn: async (input: CreateUpdateInput) => {
      if (!show?.id) throw new Error("No show selected");

      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("show_updates")
        .insert({
          show_id: show.id,
          title: input.title,
          body: input.body,
          type: input.type || "info",
          publish_at: input.publish_at,
          expire_at: input.expire_at || null,
          is_enabled: input.is_enabled ?? true,
          created_by: user?.id,
          media_url: input.media_url || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["show-updates", show?.id] });
      toast.success("Update created successfully");
    },
    onError: (error) => {
      console.error("Error creating update:", error);
      toast.error("Failed to create update");
    },
  });

  const updateUpdate = useMutation({
    mutationFn: async (input: UpdateUpdateInput) => {
      const { id, ...updateData } = input;

      const { data, error } = await supabase
        .from("show_updates")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["show-updates", show?.id] });
      toast.success("Update saved successfully");
    },
    onError: (error) => {
      console.error("Error updating:", error);
      toast.error("Failed to save update");
    },
  });

  const deleteUpdate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("show_updates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["show-updates", show?.id] });
      toast.success("Update deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting update:", error);
      toast.error("Failed to delete update");
    },
  });

  return {
    updates,
    isLoading,
    createUpdate,
    updateUpdate,
    deleteUpdate,
  };
}
