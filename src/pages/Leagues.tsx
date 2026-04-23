import { useState, useMemo } from "react";
import { Search, Pencil, Trash2, ChevronLeft, ChevronRight, SlidersHorizontal, Eye, Trophy, Plus, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { AddLeagueSheet } from "@/components/admin/AddLeagueSheet";
import { EditLeagueSheet } from "@/components/admin/EditLeagueSheet";
import { DeleteLeagueDialog } from "@/components/admin/DeleteLeagueDialog";
import { LeagueDetailDrawer, LeagueDetail } from "@/components/admin/LeagueDetailDrawer";
import { useAdminShow } from "@/contexts/AdminShowContext";
import { useLeagues, type League } from "@/hooks/useLeagues";
import { useTranslation } from "react-i18next";

function LeaguesContent() {
  const { show, isLoading: showLoading } = useAdminShow();
  const { leagues, isLoading, addLeague, updateLeague, deleteLeague } = useLeagues({ showId: show?.id });
  const { t } = useTranslation();

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [selectedLeagueDetail, setSelectedLeagueDetail] = useState<LeagueDetail | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterByCode, setFilterByCode] = useState("");
  const [filterByUsers, setFilterByUsers] = useState("");
  const [sortColumn, setSortColumn] = useState<"members" | "gwPoints" | "totalPoints" | null>(null);
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");
  
  const itemsPerPage = 15;

  const handleSort = (column: "members" | "gwPoints" | "totalPoints") => {
    if (sortColumn === column) {
      if (sortDirection === "desc") {
        setSortDirection("asc");
      } else {
        setSortColumn(null);
        setSortDirection("desc");
      }
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
    setCurrentPage(1);
  };

  const getSortIcon = (column: "members" | "gwPoints" | "totalPoints") => {
    if (sortColumn !== column) {
      return <ChevronsUpDown className="h-3.5 w-3.5 text-slate-300" />;
    }
    return sortDirection === "desc" 
      ? <ChevronDown className="h-3.5 w-3.5 text-primary" />
      : <ChevronUp className="h-3.5 w-3.5 text-primary" />;
  };

  const filteredLeagues = useMemo(() => {
    let result = leagues.filter(
      (league) =>
        league.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (league.inviteCode?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    );

    if (sortColumn) {
      result = [...result].sort((a, b) => {
        let comparison = 0;
        switch (sortColumn) {
          case "members":
            comparison = a.usersInLeague - b.usersInLeague;
            break;
          case "gwPoints":
            comparison = a.gwPoints - b.gwPoints;
            break;
          case "totalPoints":
            comparison = a.totalPoints - b.totalPoints;
            break;
        }
        return sortDirection === "desc" ? -comparison : comparison;
      });
    }

    return result;
  }, [leagues, searchQuery, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredLeagues.length / itemsPerPage));
  const paginatedLeagues = filteredLeagues.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleEdit = (league: League) => {
    setSelectedLeague(league);
    setIsEditOpen(true);
  };

  const handleDelete = (league: League) => {
    setSelectedLeague(league);
    setIsDeleteOpen(true);
  };

  const handleView = (league: League) => {
    const detail: LeagueDetail = {
      id: league.id,
      name: league.name,
      totalPoints: 0, // Will be calculated from real members
      status: league.isPublic ? "Public" : "Private",
      code: league.inviteCode || "",
      creator: "You",
      createdAt: league.createdAt,
      description: league.description || "",
      showId: show?.id, // Pass showId for useLeagueMembers
    };
    setSelectedLeagueDetail(detail);
    setIsDetailOpen(true);
  };

  const handleAddLeague = async (data: { name: string; description?: string; isPublic?: boolean; maxMembers?: number }) => {
    const success = await addLeague(data);
    if (success) setIsAddOpen(false);
    return success;
  };

  const handleUpdateLeague = async (id: string, data: Partial<League>) => {
    const success = await updateLeague(id, data);
    if (success) setIsEditOpen(false);
    return success;
  };

  const handleDeleteLeague = async (id: string) => {
    const success = await deleteLeague(id);
    if (success) setIsDeleteOpen(false);
    return success;
  };

  if (showLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t('admin.loadingLeagues')}</p>
      </div>
    );
  }

  if (!show) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
        <p className="text-slate-900 font-medium">{t('admin.noShowFound')}</p>
        <p className="text-slate-500 text-sm mt-1">
          {t('admin.completeOnboarding')}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t('nav.leagues')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('admin.manageLeagues', { name: show.name })}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder={t('admin.searchLeagues')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className={`border-slate-200 ${showFilters ? 'bg-primary/10 border-primary' : ''}`}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
          <Button 
            onClick={() => setIsAddOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white gap-2"
          >
            <Plus className="h-4 w-4" />
            {t('admin.addLeague')}
          </Button>
        </div>
      </div>

      {/* Filter Section */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-700">{t('admin.filters')}</span>
            <Button
              variant="outline"
              size="sm"
              className="border-primary text-primary hover:bg-primary/5"
            >
              {t('common.filter')}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select value={filterByCode} onValueChange={setFilterByCode}>
              <SelectTrigger className="bg-white border-slate-200 text-slate-900">
                <SelectValue placeholder={t('admin.byCode')} />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="all" className="text-slate-900">{t('admin.allCodes')}</SelectItem>
                <SelectItem value="A" className="text-slate-900">A</SelectItem>
                <SelectItem value="B" className="text-slate-900">B</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterByUsers} onValueChange={setFilterByUsers}>
              <SelectTrigger className="bg-white border-slate-200 text-slate-900">
                <SelectValue placeholder={t('admin.byNumberOfUsers')} />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="1-10" className="text-slate-900">1-10</SelectItem>
                <SelectItem value="11-20" className="text-slate-900">11-20</SelectItem>
                <SelectItem value="21-50" className="text-slate-900">21-50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {leagues.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <Trophy className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-900 font-medium">{t('admin.noLeaguesYet')}</p>
          <p className="text-slate-500 text-sm mt-1">
            {t('admin.addFirstLeague')}
          </p>
          <Button 
            onClick={() => setIsAddOpen(true)}
            className="mt-6 bg-primary hover:bg-primary/90 text-white"
          >
            {t('admin.addLeague')}
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-200 hover:bg-transparent bg-slate-50">
                <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wider py-4 px-6">{t('admin.leagueName')}</TableHead>
                <TableHead 
                  className="text-slate-600 font-medium text-xs uppercase tracking-wider py-4 px-6 cursor-pointer hover:text-slate-700 transition-colors select-none"
                  onClick={() => handleSort("members")}
                >
                  <div className="flex items-center gap-1.5">
                    {t('admin.members')}
                    {getSortIcon("members")}
                  </div>
                </TableHead>
                <TableHead 
                  className="text-slate-600 font-medium text-xs uppercase tracking-wider py-4 px-6 cursor-pointer hover:text-slate-700 transition-colors select-none"
                  onClick={() => handleSort("gwPoints")}
                >
                  <div className="flex items-center gap-1.5">
                    {t('admin.gwPoints')}
                    {getSortIcon("gwPoints")}
                  </div>
                </TableHead>
                <TableHead 
                  className="text-slate-600 font-medium text-xs uppercase tracking-wider py-4 px-6 cursor-pointer hover:text-slate-700 transition-colors select-none"
                  onClick={() => handleSort("totalPoints")}
                >
                  <div className="flex items-center gap-1.5">
                    {t('admin.totalPoints')}
                    {getSortIcon("totalPoints")}
                  </div>
                </TableHead>
                <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wider py-4 px-6">{t('admin.status')}</TableHead>
                <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wider py-4 px-6">{t('admin.code')}</TableHead>
                <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wider py-4 px-6 text-right">{t('admin.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLeagues.map((league) => (
                <TableRow key={league.id} className="border-b border-slate-100 hover:bg-slate-50/50 group">
                  <TableCell className="py-4 px-6">
                    <span className="font-medium text-slate-900">{league.name}</span>
                  </TableCell>
                  <TableCell className="py-4 px-6 text-slate-600">{league.usersInLeague}</TableCell>
                  <TableCell className="py-4 px-6 text-slate-600">{league.gwPoints}</TableCell>
                  <TableCell className="py-4 px-6 text-slate-600">{league.totalPoints}</TableCell>
                  <TableCell className="py-4 px-6">
                    <Badge 
                      variant="outline" 
                      className={`font-normal ${
                        league.isPublic 
                          ? "border-green-200 bg-green-50 text-green-700" 
                          : "border-orange-200 bg-orange-50 text-orange-700"
                      }`}
                      >
                        {league.isPublic ? t('leagues.public') : t('leagues.private')}
                      </Badge>
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    <code className="text-sm bg-slate-100 px-2 py-1 rounded text-slate-700">{league.inviteCode || "—"}</code>
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    <div className="flex items-center justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-8 gap-1.5 text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => handleView(league)}
                        >
                          <Eye className="h-4 w-4" />
                          {t('admin.view')}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-blue-50"
                        onClick={() => handleEdit(league)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-400 hover:text-destructive hover:bg-red-50"
                        onClick={() => handleDelete(league)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between py-4 px-6 border-t border-slate-200 bg-slate-50">
            <span className="text-sm text-slate-500">
              {t('admin.showingRange', { 
                from: Math.min((currentPage - 1) * itemsPerPage + 1, filteredLeagues.length), 
                to: Math.min(currentPage * itemsPerPage, filteredLeagues.length), 
                total: filteredLeagues.length 
              })}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-slate-200"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5) {
                  if (currentPage > 3) {
                    pageNum = currentPage - 2 + i;
                  }
                  if (pageNum > totalPages) {
                    pageNum = totalPages - 4 + i;
                  }
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="icon"
                    className={`h-8 w-8 ${
                      currentPage === pageNum
                        ? "bg-primary text-white"
                        : "border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-slate-200"
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
      <AddLeagueSheet 
        open={isAddOpen} 
        onOpenChange={setIsAddOpen}
        onAdd={handleAddLeague}
      />
      <EditLeagueSheet 
        open={isEditOpen} 
        onOpenChange={setIsEditOpen} 
        league={selectedLeague ? {
          id: selectedLeague.id,
          name: selectedLeague.name,
          usersInLeague: selectedLeague.usersInLeague,
          totalPoints: 0,
          status: selectedLeague.isPublic ? "Public" : "Private",
          code: selectedLeague.inviteCode || "",
          creator: "You",
          users: [],
        } : null}
        onUpdate={handleUpdateLeague}
      />
      <DeleteLeagueDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        league={selectedLeague ? {
          id: selectedLeague.id,
          name: selectedLeague.name,
          usersInLeague: selectedLeague.usersInLeague,
          totalPoints: 0,
          status: selectedLeague.isPublic ? "Public" : "Private",
          code: selectedLeague.inviteCode || "",
          creator: "You",
          users: [],
        } : null}
        onDelete={handleDeleteLeague}
      />
      <LeagueDetailDrawer
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        league={selectedLeagueDetail}
      />
    </>
  );
}

export default function Leagues() {
  return (
    <AdminLayout>
      <LeaguesContent />
    </AdminLayout>
  );
}
