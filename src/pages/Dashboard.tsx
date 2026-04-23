import { useAuth } from "@/contexts/AuthContext";
import { Users, Calendar, Trophy, UserCircle, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminStatsCard } from "@/components/admin/AdminStatsCard";
import { AdminActiveUsersChart } from "@/components/admin/AdminActiveUsersChart";
import { AdminEventsPerDayChart } from "@/components/admin/AdminEventsPerDayChart";
import { AdminEventsPerParticipantChart } from "@/components/admin/AdminEventsPerParticipantChart";
import { AdminPointsChart } from "@/components/admin/AdminPointsChart";
import { AdminEventsTable } from "@/components/admin/AdminEventsTable";
import { AdminPickCountsChart } from "@/components/admin/AdminPickCountsChart";
import { useDashboardData } from "@/hooks/useDashboardData";

function DashboardContent() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { 
    stats,
    prevStats,
    eventsPerParticipant, 
    recentEvents, 
    isLoading 
  } = useDashboardData();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <AdminStatsCard 
          title={t('admin.totalActiveUsers')} 
          value={stats.totalUsers} 
          icon={Users}
          previousValue={prevStats.totalUsers}
          periodLabel={t('admin.vsLastMonth', 'vs last month')}
        />
        <AdminStatsCard 
          title={t('admin.totalEvents')} 
          value={stats.totalEvents} 
          icon={Calendar}
          previousValue={prevStats.totalEvents}
          periodLabel={t('admin.vsLastMonth', 'vs last month')}
        />
        <AdminStatsCard 
          title={t('nav.leagues')} 
          value={stats.leagues} 
          icon={Trophy} 
        />
        <AdminStatsCard 
          title={t('admin.totalParticipants')} 
          value={stats.totalParticipants} 
          icon={UserCircle} 
        />
      </div>

      <AdminActiveUsersChart />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AdminEventsPerDayChart />
        <AdminPickCountsChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AdminEventsPerParticipantChart data={eventsPerParticipant} />
        <AdminPointsChart />
      </div>

      <AdminEventsTable events={recentEvents} />
    </div>
  );
}

export default function Dashboard() {
  return (
    <AdminLayout>
      <DashboardContent />
    </AdminLayout>
  );
}
