import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminShow } from "@/contexts/AdminShowContext";
import { toast } from "sonner";

export interface ShowUser {
  id: string;
  show_id: string;
  user_id: string;
  username: string;
  email: string;
  total_points: number;
  gw_points: number;
  gender: string | null;
  avatar_url: string | null;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateShowUserData {
  username?: string;
  email?: string;
  total_points?: number;
  gw_points?: number;
  gender?: string;
  avatar_url?: string;
}

export function useShowUsers() {
  const { show } = useAdminShow();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ["show-users", show?.id],
    queryFn: async () => {
      if (!show?.id) return [];
      
      const { data, error } = await supabase
        .from("show_users")
        .select("*")
        .eq("show_id", show.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ShowUser[];
    },
    enabled: !!show?.id,
  });

  const updateUser = useMutation({
    mutationFn: async ({ id, ...userData }: UpdateShowUserData & { id: string }) => {
      const { data, error } = await supabase
        .from("show_users")
        .update(userData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["show-users", show?.id] });
      toast.success("User updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update user: " + error.message);
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("show_users")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["show-users", show?.id] });
      toast.success("User deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete user: " + error.message);
    },
  });

  return {
    users,
    isLoading,
    error,
    updateUser,
    deleteUser,
  };
}
