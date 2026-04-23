import { useEffect, useMemo, useState } from "react";
import { Search, Pencil, Power, ChevronLeft, ChevronRight, LayoutGrid, List, Clock } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddParticipantSheet } from "@/components/admin/AddParticipantSheet";
import { EditParticipantSheet } from "@/components/admin/EditParticipantSheet";
import { SetParticipantStatusDialog } from "@/components/admin/SetParticipantStatusDialog";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAdminShow } from "@/contexts/AdminShowContext";
import { getCurrentVisibleEpisodeNumber } from "@/lib/participantSelectability";
import { useTranslation } from "react-i18next";

type DbParticipant = Tables<"participants">;
type DbEpisode = Tables<"episodes">;

// UI shape used by existing admin sheets/dialogs
export interface Participant {
  id: string;
  name: string;
  age: number;
  occupation: string;
  info: string;
  attachments: string;
  photoUrl?: string;
  gender?: string | null;
  status: "active" | "inactive" | "customized";
  customStatusLabel?: string | null;
  visibility: "show" | "hide";
  availableFromEpisode?: number | null;
  role?: string | null;
  price?: number | null;
}

function mapDbParticipant(p: DbParticipant): Participant {
  const status = (p.status === "inactive" || p.status === "customized") ? p.status : "active";
  return {
    id: p.id,
    name: p.name,
    age: p.age ?? 0,
    occupation: p.occupation ?? "",
    info: p.bio ?? "",
    attachments: "—",
    photoUrl: p.photo_url ?? undefined,
    gender: p.gender ?? null,
    status: status as "active" | "inactive" | "customized",
    customStatusLabel: p.custom_status_label ?? null,
    visibility: "show",
    availableFromEpisode: p.available_from_episode ?? null,
    role: p.role ?? null,
    price: p.price ?? null,
  };
}

function ParticipantsContent() {
  const { show, settings } = useAdminShow();
  const { t } = useTranslation();
  const budgetEnabled = settings?.budget_mode_enabled ?? false;

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [genderFilter, setGenderFilter] = useState<"all" | "male" | "female">("all");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [episodes, setEpisodes] = useState<DbEpisode[]>([]);

  const itemsPerPage = viewMode === "card" ? 9 : 12;
  const currentVisibleEpisode = getCurrentVisibleEpisodeNumber(episodes);

  useEffect(() => {
    const load = async () => {
      if (!show?.id) {
        setParticipants([]);
        setEpisodes([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      
      // Fetch participants and episodes in parallel
      const [participantsResult, episodesResult] = await Promise.all([
        supabase
          .from("participants")
          .select("*")
          .eq("show_id", show.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("episodes")
          .select("*")
          .eq("show_id", show.id)
          .order("episode_number", { ascending: true })
      ]);

      if (participantsResult.error) {
        console.error("[Participants] Failed to load participants:", participantsResult.error);
        setParticipants([]);
      } else {
        setParticipants((participantsResult.data ?? []).map(mapDbParticipant));
      }

      if (episodesResult.error) {
        console.error("[Participants] Failed to load episodes:", episodesResult.error);
        setEpisodes([]);
      } else {
        setEpisodes(episodesResult.data ?? []);
      }

      setIsLoading(false);
    };

    load();
  }, [show?.id]);

  // Helper function to determine release status
  const getReleaseStatus = (participant: Participant): { isReleased: boolean; label: string } => {
    if (!participant.availableFromEpisode) {
      return { isReleased: true, label: t('admin.released') };
    }
    if (participant.availableFromEpisode <= currentVisibleEpisode) {
      return { isReleased: true, label: t('admin.released') };
    }
    return { isReleased: false, label: t('admin.unreleased') };
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, viewMode, genderFilter]);

  const filteredParticipants = useMemo(() => {
    let result = participants;
    
    // Gender filter
    if (genderFilter !== "all") {
      result = result.filter((p) => {
        const g = p.gender?.toLowerCase() ?? "";
        if (genderFilter === "male") return g === "male" || g === "m" || g === "man";
        if (genderFilter === "female") return g === "female" || g === "f" || g === "woman";
        return true;
      });
    }
    
    // Search filter
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((p) => {
        const name = p.name.toLowerCase();
        const occupation = p.occupation.toLowerCase();
        const info = p.info.toLowerCase();
        return name.includes(q) || occupation.includes(q) || info.includes(q);
      });
    }
    
    return result;
  }, [participants, searchQuery, genderFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredParticipants.length / itemsPerPage));
  const paginatedParticipants = filteredParticipants.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleEdit = (participant: Participant) => {
    setSelectedParticipant(participant);
    setIsEditOpen(true);
  };

  const handleToggleStatus = (participant: Participant) => {
    setSelectedParticipant(participant);
    setIsStatusOpen(true);
  };

  const refetchParticipants = async () => {
    if (!show?.id) return;
    const { data } = await supabase
      .from("participants")
      .select("*")
      .eq("show_id", show.id)
      .order("created_at", { ascending: true });
    setParticipants((data ?? []).map(mapDbParticipant));
  };

  return (
    <>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t('nav.participants')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('admin.manageParticipants', { name: show?.name ?? '' })}</p>
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
          {/* Gender Filter */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1">
            <button
              onClick={() => setGenderFilter("all")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                genderFilter === "all" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t('common.all')}
            </button>
            <button
              onClick={() => setGenderFilter("male")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                genderFilter === "male" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t('admin.male')}
            </button>
            <button
              onClick={() => setGenderFilter("female")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                genderFilter === "female" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t('admin.female')}
            </button>
          </div>
          <Button onClick={() => setIsAddOpen(true)} className="bg-primary hover:bg-primary/90 text-white gap-2">
            {t('admin.addParticipant')}
          </Button>
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1">
            <button
              onClick={() => setViewMode("card")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "card" ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "list" ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500">{t('admin.loadingParticipants')}</div>
      ) : filteredParticipants.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <p className="text-slate-900 font-medium">{t('admin.noParticipantsAdded')}</p>
          <p className="text-slate-500 text-sm mt-1">{t('admin.addParticipantsDescription')}</p>
          <Button onClick={() => setIsAddOpen(true)} className="mt-6 bg-primary hover:bg-primary/90 text-white">
            {t('admin.addParticipant')}
          </Button>
        </div>
      ) : (
        <>
          {viewMode === "card" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {paginatedParticipants.map((participant) => {
                const releaseStatus = getReleaseStatus(participant);
                return (
                <div key={participant.id} className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 border-2 border-slate-100">
                        <AvatarImage src={participant.photoUrl} />
                        <AvatarFallback className="bg-blue-50 text-blue-600 font-medium">
                          {participant.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-slate-900">{participant.name}</h3>
                        <p className="text-sm text-slate-500">
                          {participant.occupation || "—"}
                          {participant.age ? ` | ${participant.age}y` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge 
                        variant={participant.status === "active" ? "default" : "secondary"}
                        className={
                          participant.status === "active" 
                            ? "bg-green-100 text-green-700 hover:bg-green-100" 
                            : participant.status === "customized"
                            ? "bg-purple-100 text-purple-700 hover:bg-purple-100"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-100"
                        }
                      >
                        {participant.status === "active" 
                          ? t('admin.active') 
                          : participant.status === "customized" 
                          ? (participant.customStatusLabel || t('admin.customized'))
                          : t('admin.inactive')}
                      </Badge>
                      {!releaseStatus.isReleased && (
                        <Badge 
                          variant="outline"
                          className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50"
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          {releaseStatus.label}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-blue-50"
                        onClick={() => handleEdit(participant)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 ${
                          participant.status === "active" 
                            ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50" 
                            : "text-green-600 hover:text-green-700 hover:bg-green-50"
                        }`}
                        onClick={() => handleToggleStatus(participant)}
                        title={participant.status === "active" ? t('admin.setInactive') : t('admin.setActive')}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600 mb-4 line-clamp-4">{participant.info || "—"}</p>

                  <div>
                    <p className="text-xs text-slate-400 mb-1">{t('admin.attachment')}</p>
                    <p className="text-sm text-slate-600">{participant.attachments}</p>
                  </div>
                </div>
              );
              })}
            </div>
          )}

          {viewMode === "list" && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
              <Table>
                <TableHeader>
                 <TableRow className="border-b border-slate-200 hover:bg-transparent">
                     <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wider py-4 px-6">#</TableHead>
                     <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wider py-4 px-6">{t('admin.name')}</TableHead>
                     <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wider py-4 px-6">{t('admin.status')}</TableHead>
                     <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wider py-4 px-6">{t('admin.age')}</TableHead>
                     <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wider py-4 px-6">{t('admin.occupation')}</TableHead>
                     {budgetEnabled && <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wider py-4 px-6">{t('admin.price', 'Price')}</TableHead>}
                     <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wider py-4 px-6">{t('admin.info')}</TableHead>
                     <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wider py-4 px-6">{t('admin.action')}</TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedParticipants.map((participant, index) => {
                    const releaseStatus = getReleaseStatus(participant);
                    return (
                    <TableRow key={participant.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <TableCell className="py-4 px-6 text-slate-600">
                        {String((currentPage - 1) * itemsPerPage + index + 1).padStart(2, "0")}
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border border-slate-100">
                            <AvatarImage src={participant.photoUrl} />
                            <AvatarFallback className="bg-blue-50 text-blue-600 text-xs font-medium">
                              {participant.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-slate-900 font-medium">{participant.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="flex flex-col gap-1">
                          <Badge 
                            variant={participant.status === "active" ? "default" : "secondary"}
                            className={
                              participant.status === "active" 
                                ? "bg-green-100 text-green-700 hover:bg-green-100" 
                                : participant.status === "customized"
                                ? "bg-purple-100 text-purple-700 hover:bg-purple-100"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-100"
                            }
                          >
                            {participant.status === "active" 
                              ? t('admin.active') 
                              : participant.status === "customized" 
                              ? (participant.customStatusLabel || t('admin.customized'))
                              : t('admin.inactive')}
                          </Badge>
                          {!releaseStatus.isReleased && (
                            <Badge 
                              variant="outline"
                              className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 text-xs"
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              {releaseStatus.label}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                       <TableCell className="py-4 px-6 text-slate-600">{participant.age || "—"}</TableCell>
                       <TableCell className="py-4 px-6 text-slate-600">{participant.occupation || "—"}</TableCell>
                       {budgetEnabled && <TableCell className="py-4 px-6 text-slate-600">{participant.price ?? "—"}</TableCell>}
                       <TableCell className="py-4 px-6 text-slate-500 max-w-xs">
                         <span className="line-clamp-2">{participant.info || "—"}</span>
                       </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-blue-50"
                            onClick={() => handleEdit(participant)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${
                              participant.status === "active" 
                                ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50" 
                                : "text-green-600 hover:text-green-700 hover:bg-green-50"
                            }`}
                            onClick={() => handleToggleStatus(participant)}
                            title={participant.status === "active" ? t('admin.setInactive') : t('admin.setActive')}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex items-center justify-center py-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 mr-4">{t('admin.totalItems', { count: filteredParticipants.length })}</span>
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
                    currentPage === page ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-100"
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
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      <AddParticipantSheet open={isAddOpen} onOpenChange={setIsAddOpen} budgetEnabled={budgetEnabled} showId={show?.id || ""} onParticipantAdded={refetchParticipants} />
      <EditParticipantSheet open={isEditOpen} onOpenChange={setIsEditOpen} participant={selectedParticipant} onParticipantUpdated={refetchParticipants} budgetEnabled={budgetEnabled} />
      <SetParticipantStatusDialog 
        open={isStatusOpen} 
        onOpenChange={setIsStatusOpen} 
        participant={selectedParticipant}
        onStatusChanged={refetchParticipants}
      />
    </>
  );
}

export default function Participants() {
  return (
    <AdminLayout>
      <ParticipantsContent />
    </AdminLayout>
  );
}
