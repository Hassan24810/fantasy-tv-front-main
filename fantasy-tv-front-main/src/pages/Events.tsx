import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Pencil, Trash2, ChevronDown, LogOut, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddEventSheet } from "@/components/admin/AddEventSheet";
import { DeleteEventDialog } from "@/components/admin/DeleteEventDialog";
import { useEvents, Event } from "@/hooks/useEvents";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function Events() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  
  const { events, isLoading: eventsLoading, deleteEvent } = useEvents();
  
  const itemsPerPage = 10;

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const filteredEvents = events.filter(
    (event) =>
      (event.rule_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      event.event_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.episode_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const paginatedEvents = filteredEvents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDelete = (event: Event) => {
    setSelectedEvent(event);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedEvent) {
      await deleteEvent.mutateAsync(selectedEvent.id);
      setIsDeleteOpen(false);
      setSelectedEvent(null);
    }
  };

  const formatEventDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "dd MMM, yyyy");
    } catch {
      return "-";
    }
  };

  const formatEventTime = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "HH:mm");
    } catch {
      return "-";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full">
        <AdminSidebar />
        <SidebarInset className="flex-1 bg-white">
          {/* Top Header */}
          <header className="flex h-16 items-center justify-end border-b border-slate-200 bg-white px-6">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-3 hover:bg-slate-50">
                  <Avatar className="h-9 w-9 border-2 border-slate-100">
                    <AvatarImage src={user?.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-blue-50 text-blue-600 text-sm font-medium">
                      {user?.user_metadata?.full_name?.[0] || user?.email?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-slate-700">
                    {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User"}
                  </span>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-white border-slate-200">
                <DropdownMenuItem 
                  onClick={() => signOut()} 
                  className="gap-2 cursor-pointer text-slate-600 hover:text-slate-900"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          {/* Main Content */}
          <main className="p-6">
            {/* Page Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">Events</h1>
                <p className="text-sm text-slate-500 mt-1">Manage all events across episodes</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                  />
                </div>
                <Button 
                  onClick={() => setIsAddOpen(true)}
                  className="bg-primary hover:bg-primary/90 text-white gap-2"
                >
                  Add Events
                </Button>
              </div>
            </div>

            {/* Events Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-200 hover:bg-transparent">
                    <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wider py-4 px-6">Episode</TableHead>
                    <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wider py-4 px-6">Date</TableHead>
                    <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wider py-4 px-6">Time</TableHead>
                    <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wider py-4 px-6">Event Rule</TableHead>
                    <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wider py-4 px-6">Event Details</TableHead>
                    <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wider py-4 px-6">Points</TableHead>
                    <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wider py-4 px-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className="border-b border-slate-100">
                        <TableCell className="py-4 px-6"><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell className="py-4 px-6"><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell className="py-4 px-6"><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell className="py-4 px-6"><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell className="py-4 px-6"><Skeleton className="h-4 w-48" /></TableCell>
                        <TableCell className="py-4 px-6"><Skeleton className="h-4 w-12" /></TableCell>
                        <TableCell className="py-4 px-6"><Skeleton className="h-8 w-16" /></TableCell>
                      </TableRow>
                    ))
                  ) : paginatedEvents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Calendar className="h-12 w-12 text-slate-300" />
                          <div>
                            <p className="text-slate-900 font-medium">No events yet</p>
                            <p className="text-slate-500 text-sm">Create your first event to get started</p>
                          </div>
                          <Button 
                            onClick={() => setIsAddOpen(true)}
                            className="mt-2 bg-primary hover:bg-primary/90 text-white"
                          >
                            Add Event
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedEvents.map((event) => (
                      <TableRow key={event.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <TableCell className="py-4 px-6 text-slate-900">{event.episode_name}</TableCell>
                        <TableCell className="py-4 px-6 text-slate-600">{formatEventDate(event.event_date)}</TableCell>
                        <TableCell className="py-4 px-6 text-slate-600">{formatEventTime(event.event_date)}</TableCell>
                        <TableCell className="py-4 px-6 text-slate-600">{event.rule_name || "-"}</TableCell>
                        <TableCell className="py-4 px-6 text-slate-600 max-w-xs truncate">{event.event_text}</TableCell>
                        <TableCell className="py-4 px-6">
                          <span className={`font-medium ${event.points_awarded >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {event.points_awarded >= 0 ? '+' : ''}{event.points_awarded}
                          </span>
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-slate-400 hover:text-destructive hover:bg-red-50"
                              onClick={() => handleDelete(event)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {filteredEvents.length > 0 && (
                <div className="flex items-center justify-center py-4 border-t border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500 mr-4">Total {filteredEvents.length} items</span>
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
          </main>
        </SidebarInset>
      </div>

      {/* Modals */}
      <AddEventSheet open={isAddOpen} onOpenChange={setIsAddOpen} />
      <DeleteEventDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteEvent.isPending}
      />
    </SidebarProvider>
  );
}
