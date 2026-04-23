import { useState, useEffect, useMemo } from "react";
import { useShow } from "@/contexts/ShowContext";
import { supabase } from "@/integrations/supabase/client";
import { B2CNavigation } from "./B2CNavigation";
import { B2CLayout } from "./B2CLayout";
import { B2CPointsCard } from "./dashboard/B2CPointsCard";
import { B2CTransfersCard } from "./dashboard/B2CTransfersCard";
import { B2CTeamCard } from "./dashboard/B2CTeamCard";
import { B2CUpdatesCard } from "./dashboard/B2CUpdatesCard";
import { B2CTransferModal } from "./dashboard/B2CTransferModal";
import { B2CTransferHistoryModal } from "./dashboard/B2CTransferHistoryModal";
import { B2CTransferEditModal } from "./dashboard/B2CTransferEditModal";
import { B2CPointsBreakdownModal } from "./dashboard/B2CPointsBreakdownModal";
import { B2CRankingModal } from "./dashboard/B2CRankingModal";
import { B2CSelectTeamModal } from "./B2CSelectTeamModal";
import { B2CParticipantGrid } from "./B2CParticipantGrid";
import { B2CGameRules } from "./B2CGameRules";
import { B2CEvents } from "./B2CEvents";
import { B2CLeagues } from "./B2CLeagues";
import { B2CFooter } from "./B2CFooter";
import { useUserTeam } from "@/hooks/useUserTeam";
import { useUserTransfers, Transfer } from "@/hooks/useUserTransfers";
import { useUserPointsBreakdown } from "@/hooks/useUserPointsBreakdown";
import { useActiveUpdates } from "@/hooks/useActiveUpdates";
import { isParticipantEliminated } from "@/lib/participantSelectability";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Users, Clock } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Participant = Tables<"participants">;

interface B2CDashboardProps {
  username?: string;
  avatarUrl?: string | null;
}

type BreakdownTab = "gameweek" | "alltime";

export const B2CDashboard = ({ username, avatarUrl }: B2CDashboardProps) => {
  const { show, settings, episodes, events } = useShow();
  const [activeTab, setActiveTab] = useState("home");
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [breakdownModalOpen, setBreakdownModalOpen] = useState(false);
  const [breakdownDefaultTab, setBreakdownDefaultTab] = useState<BreakdownTab>("gameweek");
  const [rankingModalOpen, setRankingModalOpen] = useState(false);
  const [selectTeamModalOpen, setSelectTeamModalOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [transferToEdit, setTransferToEdit] = useState<Transfer | null>(null);
  const [userId, setUserId] = useState<string | undefined>();

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Use real hooks for team, transfers, and points
  const { team, isLoading: teamLoading, refetch: refetchTeam } = useUserTeam(show?.id, userId);
  const {
    transfers,
    allTransfers,
    transfersRemaining,
    resetPeriod,
    nextAllowedTime,
    canTransfer,
    reason,
    makeTransfer,
    deleteTransfer,
    editTransfer,
    isLoading: transfersLoading
  } = useUserTransfers(show?.id);
  const {
    totalPoints,
    gameweekPoints,
    gameweekEpisodeNumber,
    events: pointsBreakdownEvents,
    isLoading: pointsLoading
  } = useUserPointsBreakdown(show?.id);

  // Fetch active updates for B2C
  const { updates } = useActiveUpdates(show?.id);

  // For rank, we still need the global ranking - use a simple query
  const [rankData, setRankData] = useState({ rank: 0, totalPlayers: 0 });
  useEffect(() => {
    const fetchRank = async () => {
      if (!show?.id) return;
      const { data } = await supabase.rpc("get_show_global_ranking", {
        p_show_id: show.id,
      });
      if (data && Array.isArray(data)) {
        const { data: { user } } = await supabase.auth.getUser();
        const userRank = data.find((r: { user_id: string }) => r.user_id === user?.id);
        setRankData({
          rank: userRank ? Number(userRank.rank) : data.length + 1,
          totalPlayers: data.length,
        });
      }
    };
    fetchRank();
  }, [show?.id, totalPoints]);

  // Transform team data for B2CTeamCard with elimination status
  const teamForCard = useMemo(() => {
    return team.map((member) => ({
      participant: member.participant,
      totalPoints: member.totalPoints,
      gameweekPoints: member.gameweekPoints,
      isEliminated: isParticipantEliminated(member.participant, { episodes, events }),
    }));
  }, [team, episodes, events]);

  // Transform current transfers for card display
  const transferHistory = useMemo(() => {
    return transfers.map((t) => ({
      id: t.id,
      playerIn: {
        name: t.participantIn?.name || "Unknown",
        photo: t.participantIn?.photo_url || undefined
      },
      playerOut: {
        name: t.participantOut?.name || "Unknown",
        photo: t.participantOut?.photo_url || undefined
      },
      date: t.transferDate
        ? `Transferred ${format(new Date(t.transferDate), "EEEE, dd.MM")}`
        : "Unknown date",
    }));
  }, [transfers]);

  // Current team for edit modal
  const currentTeamForEdit = useMemo(() => {
    return team.map((member) => ({
      participantId: member.participant.id,
      name: member.participant.name,
      photoUrl: member.participant.photo_url || undefined,
    }));
  }, [team]);

  // Calculate next reset time display
  const nextResetDisplay = useMemo(() => {
    if (nextAllowedTime) {
      return format(new Date(nextAllowedTime), "EEE, h:mm a");
    }
    return "N/A";
  }, [nextAllowedTime]);

  const handleTransfer = (participant: Participant) => {
    setSelectedParticipant(participant);
    setTransferModalOpen(true);
  };

  const handleConfirmTransfer = async (newParticipant: Participant) => {
    if (!selectedParticipant) return;

    const result = await makeTransfer(selectedParticipant.id, newParticipant.id);

    if (result.success) {
      setSelectedParticipant(null);
      setTransferModalOpen(false);
    }
    // Error handling is done inside makeTransfer with toasts
  };

  const handleDeleteTransfer = async (transferId: string) => {
    return await deleteTransfer(transferId);
  };

  const handleEditTransfer = (transfer: Transfer) => {
    setTransferToEdit(transfer);
    setEditModalOpen(true);
    setHistoryModalOpen(false);
  };

  const handleConfirmEdit = async (transferId: string, newOutId: string, newInId: string) => {
    const result = await editTransfer(transferId, newOutId, newInId);
    if (result.success) {
      setTransferToEdit(null);
      setEditModalOpen(false);
    }
    return result;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // Redirect is handled by the auth state change listener in B2CApp
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "home":
        return (
          <div className="bg-slate-100 min-h-screen">
            <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Left Column - Your Team + Updates (wider) */}
                <div className="lg:w-[65%]">
                  {teamForCard.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-border shadow-sm p-8 text-center mb-6">
                      <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">Du har ikke valgt lag ennå</h3>
                      {canTransfer ? (
                        <>
                          <p className="text-muted-foreground mb-4">Velg deltakere til laget ditt for å begynne å samle poeng.</p>
                          <Button 
                            onClick={() => setSelectTeamModalOpen(true)}
                            className="px-8 py-3 text-white font-semibold"
                            style={{ background: "linear-gradient(135deg, var(--show-primary), var(--show-secondary))" }}
                          >
                            Velg lag
                          </Button>
                        </>
                      ) : (
                        <>
                          <p className="text-muted-foreground mb-3">Lagvalg er stengt akkurat nå.</p>
                          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            <span>Åpner igjen: {nextResetDisplay}</span>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <B2CTeamCard
                      team={teamForCard}
                      onTransfer={handleTransfer}
                    />
                  )}
                  <B2CUpdatesCard updates={updates} />
                </div>
                {/* Right Column - Points + Transfers (narrower) */}
                <div className="lg:w-[35%] space-y-6">
                  <B2CPointsCard
                    gameweekPoints={gameweekPoints}
                    totalPoints={totalPoints}
                    rank={rankData.rank}
                    totalPlayers={rankData.totalPlayers}
                    onGameweekClick={() => {
                      setBreakdownDefaultTab("gameweek");
                      setBreakdownModalOpen(true);
                    }}
                    onTotalClick={() => {
                      setBreakdownDefaultTab("alltime");
                      setBreakdownModalOpen(true);
                    }}
                    onRankClick={() => setRankingModalOpen(true)}
                  />
                  <B2CTransfersCard
                    transfersAvailable={transfersRemaining}
                    maxTransfers={settings?.transfers_per_reset || 2}
                    totalTransferred={allTransfers.length}
                    nextResetTime={nextResetDisplay}
                    transferHistory={transferHistory}
                    onViewHistory={() => setHistoryModalOpen(true)}
                    onDeleteTransfer={handleDeleteTransfer}
                    onEditTransfer={(id) => {
                      const transfer = allTransfers.find(t => t.id === id);
                      if (transfer) handleEditTransfer(transfer);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      case "events":
        return <B2CEvents />;
      case "participants":
        return <B2CParticipantGrid />;
      case "rules":
        return <B2CGameRules />;
      case "leagues":
        return <B2CLeagues />;
      default:
        return null;
    }
  };

  return (
    <B2CLayout>
      <B2CNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        username={username}
        avatarUrl={avatarUrl}
      />

      {renderTabContent()}
      <B2CFooter />

      <B2CTransferModal
        open={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        currentParticipant={selectedParticipant}
        onConfirmTransfer={handleConfirmTransfer}
        teamParticipantIds={team.map((m) => m.participant.id)}
        canTransfer={canTransfer}
        transferBlockReason={reason}
        nextAllowedTime={nextAllowedTime}
      />

      <B2CTransferHistoryModal
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        allTransfers={allTransfers}
        currentResetPeriod={resetPeriod}
        onDeleteTransfer={handleDeleteTransfer}
        onEditTransfer={handleEditTransfer}
      />

      <B2CTransferEditModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setTransferToEdit(null);
        }}
        transfer={transferToEdit}
        showId={show?.id || ""}
        currentTeam={currentTeamForEdit}
        onConfirmEdit={handleConfirmEdit}
      />

      <B2CPointsBreakdownModal
        open={breakdownModalOpen}
        onOpenChange={setBreakdownModalOpen}
        events={pointsBreakdownEvents}
        gameweekEpisodeNumber={gameweekEpisodeNumber}
        totalPoints={totalPoints}
        gameweekPoints={gameweekPoints}
        defaultTab={breakdownDefaultTab}
      />

      <B2CRankingModal
        open={rankingModalOpen}
        onOpenChange={setRankingModalOpen}
        showId={show?.id}
        currentUserId={userId}
        userRank={rankData.rank}
        totalPlayers={rankData.totalPlayers}
      />

      {userId && (
        <B2CSelectTeamModal
          open={selectTeamModalOpen}
          onOpenChange={setSelectTeamModalOpen}
          userId={userId}
          onTeamSelected={() => refetchTeam()}
        />
      )}
    </B2CLayout>
  );
};
