import { useState, useMemo } from "react";
import { Search, Pencil, Trash2, ChevronLeft, ChevronRight, Users as UsersIcon, Trophy, SlidersHorizontal, Loader2, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { useTranslation } from "react-i18next";
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
import { EditUserSheet } from "@/components/admin/EditUserSheet";
import { DeleteUserDialog } from "@/components/admin/DeleteUserDialog";
import { UsersFilter, FilterState } from "@/components/admin/UsersFilter";
import { UserDetailDrawer } from "@/components/admin/UserDetailDrawer";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAdminShowUsers, AdminShowUser } from "@/hooks/useAdminShowUsers";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const defaultFilters: FilterState = {
  totalPointsMin: null,
  totalPointsMax: null,
  gwPointsMin: null,
  gwPointsMax: null,
  gender: null,
};

function UsersContent() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminShowUser | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [sortColumn, setSortColumn] = useState<"gwPoints" | "totalPoints" | null>(null);
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");

  const { users, isLoading, updateUser, deleteUser } = useAdminShowUsers();
  
  const itemsPerPage = 15;

  const handleSort = (column: "gwPoints" | "totalPoints") => {
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

  const getSortIcon = (column: "gwPoints" | "totalPoints") => {
    if (sortColumn !== column) {
      return <ChevronsUpDown className="h-3.5 w-3.5 text-slate-300" />;
    }
    return sortDirection === "desc" 
      ? <ChevronDown className="h-3.5 w-3.5 text-primary" />
      : <ChevronUp className="h-3.5 w-3.5 text-primary" />;
  };

  const filteredUsers = useMemo(() => {
    let result = users.filter((u) => {
      const matchesSearch =
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTotalPoints =
        (filters.totalPointsMin === null || u.total_points >= filters.totalPointsMin) &&
        (filters.totalPointsMax === null || u.total_points <= filters.totalPointsMax);

      const matchesGwPoints =
        (filters.gwPointsMin === null || u.gameweek_points >= filters.gwPointsMin) &&
        (filters.gwPointsMax === null || u.gameweek_points <= filters.gwPointsMax);

      const matchesGender = filters.gender === null || u.gender === filters.gender;

      return matchesSearch && matchesTotalPoints && matchesGwPoints && matchesGender;
    });

    if (sortColumn) {
      result = [...result].sort((a, b) => {
        let comparison = 0;
        switch (sortColumn) {
          case "gwPoints":
            comparison = a.gameweek_points - b.gameweek_points;
            break;
          case "totalPoints":
            comparison = a.total_points - b.total_points;
            break;
        }
        return sortDirection === "desc" ? -comparison : comparison;
      });
    }

    return result;
  }, [users, searchQuery, filters, sortColumn, sortDirection]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleEdit = (userItem: AdminShowUser) => {
    setSelectedUser(userItem);
    setIsEditOpen(true);
  };

  const handleDelete = (userItem: AdminShowUser) => {
    setSelectedUser(userItem);
    setIsDeleteOpen(true);
  };

  const handleViewDetail = (userItem: AdminShowUser) => {
    setSelectedUser(userItem);
    setIsDetailOpen(true);
  };

  const handleClearFilters = () => {
    setFilters(defaultFilters);
  };

  const handleUpdateUser = async (data: { id: string; username?: string; email?: string; gender?: string }) => {
    await updateUser(data.id, { username: data.username, email: data.email, gender: data.gender });
    setIsEditOpen(false);
  };

  const handleDeleteUser = async (id: string) => {
    await deleteUser(id);
    setIsDeleteOpen(false);
  };

  return (
    <>
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t('admin.activeUsers')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('admin.usersDescription')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder={t('common.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
            />
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            className={`border-slate-200 hover:bg-slate-50 ${showFilters ? 'bg-primary text-white hover:bg-primary/90 hover:text-white' : 'text-slate-600'}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <UsersFilter
          filters={filters}
          onFiltersChange={setFilters}
          onClearFilters={handleClearFilters}
        />
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : paginatedUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <UsersIcon className="h-12 w-12 mb-4 text-slate-300" />
            <p className="text-lg font-medium">{t('admin.noRegisteredUsers')}</p>
            <p className="text-sm">{t('admin.usersAppearHere')}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-200 hover:bg-transparent">
                <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wider py-4 px-6">{t('admin.id')}</TableHead>
                <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wider py-4 px-6">{t('admin.userName')}</TableHead>
                <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wider py-4 px-6">{t('admin.email')}</TableHead>
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
                <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wider py-4 px-6">{t('admin.memberSince')}</TableHead>
                <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wider py-4 px-6">{t('admin.action')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.map((userItem) => (
                <TableRow key={userItem.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <TableCell className="py-4 px-6 text-slate-900 font-medium font-mono text-xs">
                    {userItem.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    <div>
                      <p className="text-slate-900">{userItem.username}</p>
                      <p className="text-xs text-slate-400">{userItem.gender || t('admin.notSpecified')}</p>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-6 text-slate-900">{userItem.email}</TableCell>
                  <TableCell className="py-4 px-6 text-slate-900">{userItem.gameweek_points}</TableCell>
                  <TableCell className="py-4 px-6 text-slate-900">{userItem.total_points}</TableCell>
                  <TableCell className="py-4 px-6 text-slate-900">
                    {format(new Date(userItem.joined_at), 'dd MMM, yyyy')}
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-blue-50"
                            onClick={() => handleViewDetail(userItem)}
                          >
                            <Trophy className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-slate-800 text-white">
                          {t('admin.viewLeaguesTeam')}
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-blue-50"
                            onClick={() => handleViewDetail(userItem)}
                          >
                            <UsersIcon className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-slate-800 text-white">
                          {t('admin.viewTeams')}
                        </TooltipContent>
                      </Tooltip>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-blue-50"
                        onClick={() => handleEdit(userItem)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-400 hover:text-destructive hover:bg-red-50"
                        onClick={() => handleDelete(userItem)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Pagination */}
        {filteredUsers.length > 0 && (
          <div className="flex items-center justify-center py-4 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 mr-4">{t('admin.totalItems', { count: filteredUsers.length })}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "ghost"}
                  size="icon"
                  className={`h-8 w-8 ${
                    currentPage === page
                      ? "bg-primary text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <EditUserSheet 
        open={isEditOpen} 
        onOpenChange={setIsEditOpen} 
        user={selectedUser}
        onSubmit={handleUpdateUser}
        onSendPasswordReset={async (email) => {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth`,
          });
          if (error) {
            return { success: false, error: error.message };
          }
          return { success: true };
        }}
        isLoading={false}
      />
      <DeleteUserDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        user={selectedUser}
        onConfirm={() => selectedUser && handleDeleteUser(selectedUser.id)}
        isLoading={false}
      />
      <UserDetailDrawer
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        user={selectedUser}
      />
    </>
  );
}

export default function Users() {
  return (
    <AdminLayout>
      <UsersContent />
    </AdminLayout>
  );
}
