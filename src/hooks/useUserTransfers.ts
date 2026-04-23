import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type Participant = Tables<"participants">;

export interface Transfer {
  id: string;
  participantOut: Participant;
  participantIn: Participant;
  transferDate: string;
  resetPeriod: string;
  effectiveFromEpisode?: number;
}

interface TransferStatusResponse {
  can_transfer: boolean;
  reason: string;
  next_allowed_datetime: string | null;
  transfers_remaining: number;
  reset_period: string;
}

interface TransferResultResponse {
  success: boolean;
  error?: string;
  error_code?: string;
  next_allowed_datetime?: string;
  transfers_remaining?: number;
}

interface TransferStatus {
  canTransfer: boolean;
  reason: string;
  nextAllowedDatetime: string | null;
  transfersRemaining: number;
  resetPeriod: string;
}

interface UseUserTransfersReturn {
  transfers: Transfer[];
  allTransfers: Transfer[];
  currentRoundTransfers: Transfer[];
  transfersUsed: number;
  transfersRemaining: number;
  canTransfer: boolean;
  reason: string;
  nextAllowedTime: string | null;
  resetPeriod: string;
  isLoading: boolean;
  error: string | null;
  makeTransfer: (participantOutId: string, participantInId: string) => Promise<{ success: boolean; error?: string; nextAllowedDatetime?: string }>;
  deleteTransfer: (transferId: string) => Promise<{ success: boolean; error?: string }>;
  editTransfer: (transferId: string, newOutId: string, newInId: string) => Promise<{ success: boolean; error?: string }>;
  refetch: () => Promise<void>;
}

export const useUserTransfers = (showId: string | undefined): UseUserTransfersReturn => {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [allTransfers, setAllTransfers] = useState<Transfer[]>([]);
  const [status, setStatus] = useState<TransferStatus>({
    canTransfer: true,
    reason: "",
    nextAllowedDatetime: null,
    transfersRemaining: 999,
    resetPeriod: "UNLIMITED",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAllTransfers = useCallback(async () => {
    if (!showId) return;

    try {
      const { data, error: fetchError } = await supabase
        .from("transfers")
        .select(`
          id,
          transfer_date,
          reset_period,
          effective_from_episode,
          participant_out:participants!transfers_participant_out_id_fkey (*),
          participant_in:participants!transfers_participant_in_id_fkey (*)
        `)
        .eq("show_id", showId)
        .order("transfer_date", { ascending: false });

      if (fetchError) throw fetchError;

      setAllTransfers(
        (data || []).map((t) => ({
          id: t.id,
          participantOut: t.participant_out as Participant,
          participantIn: t.participant_in as Participant,
          transferDate: t.transfer_date,
          resetPeriod: t.reset_period,
          effectiveFromEpisode: t.effective_from_episode ?? undefined,
        }))
      );
    } catch (err) {
      console.error("Error fetching all transfers:", err);
    }
  }, [showId]);

  const fetchTransferStatus = useCallback(async () => {
    if (!showId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get transfer status from RPC
      const { data: statusData, error: statusError } = await supabase.rpc("get_next_transfer_time", {
        p_show_id: showId,
      });

      if (statusError) throw statusError;

      if (statusData) {
        const typedStatus = statusData as unknown as TransferStatusResponse;

        setStatus({
          canTransfer: typedStatus.can_transfer,
          reason: typedStatus.reason || "",
          nextAllowedDatetime: typedStatus.next_allowed_datetime,
          transfersRemaining: typedStatus.transfers_remaining,
          resetPeriod: typedStatus.reset_period,
        });

        // Fetch recent transfers for this reset period
        const { data: transfersData, error: transfersError } = await supabase
          .from("transfers")
          .select(`
            id,
            transfer_date,
            reset_period,
            effective_from_episode,
            participant_out:participants!transfers_participant_out_id_fkey (*),
            participant_in:participants!transfers_participant_in_id_fkey (*)
          `)
          .eq("show_id", showId)
          .eq("reset_period", typedStatus.reset_period)
          .order("transfer_date", { ascending: false });

        if (transfersError) throw transfersError;

        setTransfers(
          (transfersData || []).map((t) => ({
            id: t.id,
            participantOut: t.participant_out as Participant,
            participantIn: t.participant_in as Participant,
            transferDate: t.transfer_date,
            resetPeriod: t.reset_period,
            effectiveFromEpisode: t.effective_from_episode ?? undefined,
          }))
        );
      }

      // Also fetch all transfers for history view
      await fetchAllTransfers();
    } catch (err) {
      console.error("Error fetching transfer status:", err);
      setError("Failed to load transfer status");
    } finally {
      setIsLoading(false);
    }
  }, [showId, fetchAllTransfers]);

  const makeTransfer = useCallback(
    async (participantOutId: string, participantInId: string): Promise<{ success: boolean; error?: string; nextAllowedDatetime?: string }> => {
      if (!showId) {
        return { success: false, error: "No show selected" };
      }

      try {
        // Call the server-side RPC for hard-block enforcement
        const { data, error: rpcError } = await supabase.rpc("validate_and_execute_transfer", {
          p_show_id: showId,
          p_participant_out_id: participantOutId,
          p_participant_in_id: participantInId,
        });

        if (rpcError) throw rpcError;

        const typedResult = data as unknown as TransferResultResponse;

        if (!typedResult.success) {
          const nextTime = typedResult.next_allowed_datetime
            ? format(new Date(typedResult.next_allowed_datetime), "EEEE, MMM d 'at' h:mm a")
            : null;

          const errorMessage = nextTime
            ? `${typedResult.error}. Next transfer: ${nextTime}`
            : typedResult.error;

          toast({
            title: "Transfer blocked",
            description: errorMessage,
            variant: "destructive",
          });

          return {
            success: false,
            error: typedResult.error,
            nextAllowedDatetime: typedResult.next_allowed_datetime,
          };
        }

        toast({
          title: "Transfer complete!",
          description: `${typedResult.transfers_remaining} transfers remaining this period.`,
        });

        // Refetch status
        await fetchTransferStatus();

        return { success: true };
      } catch (err) {
        console.error("Error making transfer:", err);
        toast({
          title: "Error",
          description: "Failed to complete transfer",
          variant: "destructive",
        });
        return { success: false, error: "Failed to complete transfer" };
      }
    },
    [showId, fetchTransferStatus, toast]
  );

  const deleteTransfer = useCallback(
    async (transferId: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const { data, error: rpcError } = await supabase.rpc("delete_transfer_in_current_round", {
          p_transfer_id: transferId,
        });

        if (rpcError) throw rpcError;

        const typedResult = data as unknown as TransferResultResponse;

        if (!typedResult.success) {
          toast({
            title: "Cannot delete transfer",
            description: typedResult.error,
            variant: "destructive",
          });
          return { success: false, error: typedResult.error };
        }

        toast({
          title: "Transfer deleted",
          description: `Transfer reversed. ${typedResult.transfers_remaining} transfers remaining.`,
        });

        await fetchTransferStatus();
        return { success: true };
      } catch (err) {
        console.error("Error deleting transfer:", err);
        toast({
          title: "Error",
          description: "Failed to delete transfer",
          variant: "destructive",
        });
        return { success: false, error: "Failed to delete transfer" };
      }
    },
    [fetchTransferStatus, toast]
  );

  const editTransfer = useCallback(
    async (transferId: string, newOutId: string, newInId: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const { data, error: rpcError } = await supabase.rpc("edit_transfer_in_current_round", {
          p_transfer_id: transferId,
          p_new_participant_out_id: newOutId,
          p_new_participant_in_id: newInId,
        });

        if (rpcError) throw rpcError;

        const typedResult = data as unknown as TransferResultResponse;

        if (!typedResult.success) {
          toast({
            title: "Cannot edit transfer",
            description: typedResult.error,
            variant: "destructive",
          });
          return { success: false, error: typedResult.error };
        }

        toast({
          title: "Transfer updated",
          description: "Your transfer has been modified.",
        });

        await fetchTransferStatus();
        return { success: true };
      } catch (err) {
        console.error("Error editing transfer:", err);
        toast({
          title: "Error",
          description: "Failed to edit transfer",
          variant: "destructive",
        });
        return { success: false, error: "Failed to edit transfer" };
      }
    },
    [fetchTransferStatus, toast]
  );

  useEffect(() => {
    fetchTransferStatus();
  }, [fetchTransferStatus]);

  // Real-time subscription
  useEffect(() => {
    if (!showId) return;

    const channel = supabase
      .channel(`transfers-${showId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transfers",
          filter: `show_id=eq.${showId}`,
        },
        () => {
          fetchTransferStatus();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "episodes",
          filter: `show_id=eq.${showId}`,
        },
        () => {
          // Episode changes can affect transfer windows
          fetchTransferStatus();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_settings",
          filter: `show_id=eq.${showId}`,
        },
        () => {
          // Settings changes affect transfer rules
          fetchTransferStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showId, fetchTransferStatus]);

  // Computed: current round transfers
  const currentRoundTransfers = allTransfers.filter(
    (t) => t.resetPeriod === status.resetPeriod
  );

  return {
    transfers,
    allTransfers,
    currentRoundTransfers,
    transfersUsed: transfers.length,
    transfersRemaining: status.transfersRemaining,
    canTransfer: status.canTransfer,
    reason: status.reason,
    nextAllowedTime: status.nextAllowedDatetime,
    resetPeriod: status.resetPeriod,
    isLoading,
    error,
    makeTransfer,
    deleteTransfer,
    editTransfer,
    refetch: fetchTransferStatus,
  };
};
