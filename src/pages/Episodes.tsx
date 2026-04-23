import { useState, useMemo, useEffect } from "react";
import { 
  Search, 
  ChevronLeft, 
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Pencil,
  Trash2,
  Plus,
  Film,
  Clock,
  CalendarDays,
  Radio
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddEpisodeSheet } from "@/components/admin/AddEpisodeSheet";
import { EditEpisodeSheet } from "@/components/admin/EditEpisodeSheet";
import { DeleteEpisodeDialog } from "@/components/admin/DeleteEpisodeDialog";
import { EpisodeDetailDrawer } from "@/components/admin/EpisodeDetailDrawer";
import { useAdminShow } from "@/contexts/AdminShowContext";
import { useEpisodes, type Episode } from "@/hooks/useEpisodes";
import { formatDuration, getEpisodeStatus, type EpisodeStatus } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type SortField = "episodeNumber" | "status" | "activeFromDateTime" | "eventsCount";
type SortDirection = "asc" | "desc";

export type { Episode };

function EpisodesContent() {
  const { show, isLoading: showLoading } = useAdminShow();
  const { episodes, isLoading, addEpisode, updateEpisode, deleteEpisode } = useEpisodes({ showId: show?.id });
  const { t, i18n } = useTranslation();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("episodeNumber");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  
  const itemsPerPage = 10;

  // Auto-refresh current time for status updates
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 ml-1 opacity-50" />;
    return sortDirection === "asc" 
      ? <ArrowUp className="h-3.5 w-3.5 ml-1" /> 
      : <ArrowDown className="h-3.5 w-3.5 ml-1" />;
  };

  const getEpisodeStatusWithTime = (episode: Episode): EpisodeStatus => {
    return getEpisodeStatus(episode, currentTime);
  };

  const getStatusBadge = (status: EpisodeStatus) => {
    switch (status) {
      case "LIVE":
        return (
          <Badge className="bg-red-500 text-white hover:bg-red-500 border-0 gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            {t('admin.live')}
          </Badge>
        );
      case "ENDED":
        return (
          <Badge className="bg-slate-500 text-white hover:bg-slate-500 border-0">
            {t('admin.ended')}
          </Badge>
        );
      case "UPCOMING":
        return (
          <Badge className="bg-blue-500 text-white hover:bg-blue-500 border-0 gap-1">
            <CalendarDays className="h-3 w-3" />
            {t('admin.upcoming')}
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted border-0">
            {t('admin.draft')}
          </Badge>
        );
    }
  };

  const filteredAndSortedEpisodes = useMemo(() => {
    let filtered = episodes.filter((ep) => {
      const matchesSearch = 
        ep.episodeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `Episode ${ep.episodeNumber}`.toLowerCase().includes(searchQuery.toLowerCase());
      
      const status = getEpisodeStatus(ep, currentTime);
      const matchesStatus = 
        statusFilter === "all" ||
        statusFilter.toUpperCase() === status;
      
      return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "episodeNumber":
          comparison = a.episodeNumber - b.episodeNumber;
          break;
        case "status": {
          const statusOrder: Record<EpisodeStatus, number> = { LIVE: 0, UPCOMING: 1, ENDED: 2, DRAFT: 3 };
          const aStatus = getEpisodeStatus(a, currentTime);
          const bStatus = getEpisodeStatus(b, currentTime);
          comparison = statusOrder[aStatus] - statusOrder[bStatus];
          break;
        }
        case "activeFromDateTime":
          const aDate = a.activeFromDateTime ? new Date(a.activeFromDateTime).getTime() : 0;
          const bDate = b.activeFromDateTime ? new Date(b.activeFromDateTime).getTime() : 0;
          comparison = aDate - bDate;
          break;
        case "eventsCount":
          comparison = a.eventsCount - b.eventsCount;
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [episodes, searchQuery, statusFilter, sortField, sortDirection, currentTime]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedEpisodes.length / itemsPerPage));
  const paginatedEpisodes = filteredAndSortedEpisodes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);

    // Localize using the currently selected app language
    const locale = i18n.language || undefined;
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  const handleView = (episode: Episode) => {
    setSelectedEpisode(episode);
    setIsDetailOpen(true);
  };

  const handleEdit = (episode: Episode) => {
    setSelectedEpisode(episode);
    setIsEditOpen(true);
  };

  const handleDelete = (episode: Episode) => {
    setSelectedEpisode(episode);
    setIsDeleteOpen(true);
  };

  const handleAddEpisode = async (data: Omit<Episode, "id" | "createdAt" | "eventsCount" | "isActive">) => {
    const success = await addEpisode(data);
    if (success) setIsAddOpen(false);
    return success;
  };

  const handleUpdateEpisode = async (id: string, data: Partial<Omit<Episode, "id" | "createdAt">>) => {
    const success = await updateEpisode(id, data);
    if (success) setIsEditOpen(false);
    return success;
  };

  const handleDeleteEpisode = async (id: string) => {
    const success = await deleteEpisode(id);
    if (success) setIsDeleteOpen(false);
    return success;
  };

  if (showLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t('admin.loadingEpisodes')}</p>
      </div>
    );
  }

  if (!show) {
    return (
      <div className="bg-white rounded-xl border border-border p-10 text-center">
        <p className="text-foreground font-medium">{t('admin.noShowFound')}</p>
        <p className="text-muted-foreground text-sm mt-1">
          {t('admin.completeOnboarding')}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <Film className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{t('nav.episodes')}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t('admin.manageEpisodes', { name: show.name })}
            </p>
          </div>
        </div>
        <Button 
          onClick={() => setIsAddOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          {t('admin.addEpisode')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('admin.searchEpisodes')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-white border-border text-foreground">
            <SelectValue placeholder={t('admin.status')} />
          </SelectTrigger>
          <SelectContent className="bg-white border-border">
            <SelectItem value="all" className="text-foreground">{t('admin.allStatus')}</SelectItem>
            <SelectItem value="draft" className="text-foreground">{t('admin.draft')}</SelectItem>
            <SelectItem value="upcoming" className="text-foreground">{t('admin.upcoming')}</SelectItem>
            <SelectItem value="live" className="text-foreground">{t('admin.live')}</SelectItem>
            <SelectItem value="ended" className="text-foreground">{t('admin.ended')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {episodes.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-10 text-center">
          <Film className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-foreground font-medium">{t('admin.noEpisodesYet')}</p>
          <p className="text-muted-foreground text-sm mt-1">
            {t('admin.addFirstEpisode')}
          </p>
          <Button 
            onClick={() => setIsAddOpen(true)}
            className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {t('admin.addEpisode')}
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead 
                  className="text-muted-foreground font-medium text-xs uppercase tracking-wider py-4 px-6 w-28 cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("episodeNumber")}
                >
                  <div className="flex items-center">
                    {t('admin.episode')}
                    {getSortIcon("episodeNumber")}
                  </div>
                </TableHead>
                <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider py-4 px-6 min-w-[200px]">
                  {t('admin.name')}
                </TableHead>
                <TableHead 
                  className="text-muted-foreground font-medium text-xs uppercase tracking-wider py-4 px-6 w-28 cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center">
                    {t('admin.status')}
                    {getSortIcon("status")}
                  </div>
                </TableHead>
                <TableHead 
                  className="text-muted-foreground font-medium text-xs uppercase tracking-wider py-4 px-6 w-44 cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("activeFromDateTime")}
                >
                  <div className="flex items-center">
                    {t('admin.scheduled')}
                    {getSortIcon("activeFromDateTime")}
                  </div>
                </TableHead>
                <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider py-4 px-6 w-24">
                  {t('admin.duration')}
                </TableHead>
                <TableHead 
                  className="text-muted-foreground font-medium text-xs uppercase tracking-wider py-4 px-6 w-20 cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("eventsCount")}
                >
                  <div className="flex items-center">
                    {t('admin.events')}
                    {getSortIcon("eventsCount")}
                  </div>
                </TableHead>
                <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider py-4 px-6 w-32">
                  {t('admin.actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedEpisodes.map((episode) => {
                const status = getEpisodeStatusWithTime(episode);
                const isLive = status === "LIVE";
                
                return (
                  <TableRow 
                    key={episode.id} 
                    className={`border-b border-border/50 transition-colors ${
                      isLive 
                        ? "bg-red-50/30 hover:bg-red-50/50" 
                        : status === "ENDED"
                          ? "opacity-60 hover:opacity-80 bg-muted/20"
                          : "hover:bg-muted/30"
                    }`}
                  >
                    <TableCell className="py-4 px-6">
                      <span className={`font-medium ${isLive ? "text-red-700" : "text-foreground"}`}>
                        {t('admin.episode')} {episode.episodeNumber}
                      </span>
                    </TableCell>
                    <TableCell className={`py-4 px-6 ${isLive ? "text-red-700" : "text-foreground"}`}>
                      <span className="block truncate max-w-[300px]" title={episode.episodeName}>
                        {episode.episodeName}
                      </span>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      {getStatusBadge(status)}
                    </TableCell>
                    <TableCell className={`py-4 px-6 ${isLive ? "text-red-700" : "text-foreground"}`}>
                      {formatDateTime(episode.activeFromDateTime)}
                    </TableCell>
                    <TableCell className={`py-4 px-6 ${isLive ? "text-red-700" : "text-foreground"}`}>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        {formatDuration(episode.durationSeconds)}
                      </span>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <span className={`inline-flex items-center justify-center h-6 min-w-6 px-2 rounded-full text-xs font-medium ${
                        isLive 
                          ? "bg-red-100 text-red-700" 
                          : "bg-primary/10 text-primary"
                      }`}>
                        {episode.eventsCount}
                      </span>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 px-3 text-primary hover:text-primary hover:bg-primary/10 gap-1.5"
                          onClick={() => handleView(episode)}
                        >
                          <Eye className="h-4 w-4" />
                          {t('admin.view')}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          onClick={() => handleEdit(episode)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(episode)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
            <span className="text-sm text-muted-foreground">
              {t('admin.showingRange', { 
                from: Math.min(((currentPage - 1) * itemsPerPage) + 1, filteredAndSortedEpisodes.length), 
                to: Math.min(currentPage * itemsPerPage, filteredAndSortedEpisodes.length), 
                total: filteredAndSortedEpisodes.length 
              })}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-border"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="icon"
                    className={`h-8 w-8 ${
                      currentPage === page
                        ? "bg-primary text-primary-foreground"
                        : "border-border text-foreground hover:bg-muted"
                    }`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-border"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddEpisodeSheet 
        open={isAddOpen} 
        onOpenChange={setIsAddOpen}
        onAdd={handleAddEpisode}
        nextEpisodeNumber={(episodes.length > 0 ? Math.max(...episodes.map(e => e.episodeNumber)) : 0) + 1}
      />
      <EditEpisodeSheet 
        open={isEditOpen} 
        onOpenChange={setIsEditOpen} 
        episode={selectedEpisode}
        onUpdate={handleUpdateEpisode}
      />
      <DeleteEpisodeDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        episode={selectedEpisode}
        onDelete={handleDeleteEpisode}
      />
      <EpisodeDetailDrawer
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        episode={selectedEpisode}
      />
    </>
  );
}

export default function Episodes() {
  return (
    <AdminLayout>
      <EpisodesContent />
    </AdminLayout>
  );
}
