import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminShow } from "@/contexts/AdminShowContext";
import { toast } from "sonner";

export interface AdminShowUser {
  id: string;
  user_id: string;
  username: string;
  email: string;
  avatar_url: string | null;
  gender: string | null;
  joined_at: string;
  total_points: number;
  gameweek_points: number;
  team_size: number;
}

export interface UpdateShowUserData {
  username?: string;
  email?: string;
  gender?: string;
}

export function useAdminShowUsers() {
  const { show } = useAdminShow();
  const [users, setUsers] = useState<AdminShowUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!show?.id) {
      setUsers([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc("admin_get_show_users_with_live_points", {
        p_show_id: show.id,
      });

      if (rpcError) throw rpcError;

      setUsers(
        (data || []).map((u: any) => ({
          id: u.id,
          user_id: u.user_id,
          username: u.username,
          email: u.email,
          avatar_url: u.avatar_url,
          gender: u.gender,
          joined_at: u.joined_at,
          total_points: Number(u.total_points),
          gameweek_points: Number(u.gameweek_points),
          team_size: Number(u.team_size),
        }))
      );
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [show?.id]);

  const debouncedFetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchUsers(), 300);
  }, [fetchUsers]);

  const updateUser = useCallback(async (id: string, data: UpdateShowUserData) => {
    try {
      const { error: updateError } = await supabase
        .from("show_users")
        .update(data)
        .eq("id", id);

      if (updateError) throw updateError;

      toast.success("User updated successfully");
      await fetchUsers();
    } catch (err) {
      console.error("Error updating user:", err);
      toast.error("Failed to update user");
      throw err;
    }
  }, [fetchUsers]);

  const deleteUser = useCallback(async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from("show_users")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      toast.success("User deleted successfully");
      await fetchUsers();
    } catch (err) {
      console.error("Error deleting user:", err);
      toast.error("Failed to delete user");
      throw err;
    }
  }, [fetchUsers]);

  const sendPasswordResetEmail = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      toast.success("Password reset email sent");
      return { success: true };
    } catch (err) {
      console.error("Error sending password reset:", err);
      toast.error("Failed to send password reset email");
      return { success: false, error: (err as Error).message };
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Real-time subscriptions
  useEffect(() => {
    if (!show?.id) return;

    const channel = supabase
      .channel(`admin-users-${show.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "show_users",
          filter: `show_id=eq.${show.id}`,
        },
        () => debouncedFetch()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "events",
          filter: `show_id=eq.${show.id}`,
        },
        () => debouncedFetch()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_teams",
          filter: `show_id=eq.${show.id}`,
        },
        () => debouncedFetch()
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [show?.id, debouncedFetch]);

  return {
    users,
    isLoading,
    error,
    updateUser,
    deleteUser,
    sendPasswordResetEmail,
    refetch: fetchUsers,
  };
}
