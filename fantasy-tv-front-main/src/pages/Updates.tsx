import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useUpdates } from "@/hooks/useUpdates";
import { useAdminShow } from "@/contexts/AdminShowContext";
import { Plus, Search, Megaphone, MoreHorizontal, Pencil, Trash2, Image, Video } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { AddUpdateSheet } from "@/components/admin/AddUpdateSheet";
import { EditUpdateSheet } from "@/components/admin/EditUpdateSheet";
import { DeleteUpdateDialog } from "@/components/admin/DeleteUpdateDialog";
import type { Tables } from "@/integrations/supabase/types";

type ShowUpdate = Tables<"show_updates">;

function getUpdateStatus(update: ShowUpdate): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  const now = new Date();
  const publishAt = new Date(update.publish_at);
  const expireAt = update.expire_at ? new Date(update.expire_at) : null;

  if (!update.is_enabled) {
    return { label: "Disabled", variant: "secondary" };
  }
  if (expireAt && expireAt <= now) {
    return { label: "Expired", variant: "destructive" };
  }
  if (publishAt > now) {
    return { label: "Scheduled", variant: "outline" };
  }
  return { label: "Active", variant: "default" };
}

function getTypeBadgeVariant(type: string): "default" | "secondary" | "destructive" | "outline" {
  switch (type) {
    case "warning":
      return "destructive";
    case "hype":
      return "default";
    default:
      return "secondary";
  }
}

function UpdatesContent() {
  const { t } = useTranslation();
  const { show } = useAdminShow();
  const { updates, isLoading } = useUpdates();
  const [searchQuery, setSearchQuery] = useState("");
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUpdate, setSelectedUpdate] = useState<ShowUpdate | null>(null);

  const filteredUpdates = updates.filter((update) =>
    update.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (update: ShowUpdate) => {
    setSelectedUpdate(update);
    setEditSheetOpen(true);
  };

  const handleDelete = (update: ShowUpdate) => {
    setSelectedUpdate(update);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("updates.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("updates.description", { name: show?.name })}
          </p>
        </div>
        <Button onClick={() => setAddSheetOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("updates.addUpdate")}
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("updates.searchUpdates")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filteredUpdates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">{t("updates.noUpdatesYet")}</h3>
          <p className="text-muted-foreground mt-1">{t("updates.addFirstUpdate")}</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("updates.titleColumn")}</TableHead>
                <TableHead>{t("updates.type")}</TableHead>
                <TableHead>{t("updates.publishAt")}</TableHead>
                <TableHead>{t("updates.expireAt")}</TableHead>
                <TableHead>{t("updates.status")}</TableHead>
                <TableHead className="w-[70px]">{t("admin.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUpdates.map((update) => {
                const status = getUpdateStatus(update);
                return (
                  <TableRow key={update.id}>
                    <TableCell className="font-medium max-w-[300px] truncate">
                      <span className="flex items-center gap-2">
                        {update.title}
                        {(update as any).media_url && (
                          /\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test((update as any).media_url)
                            ? <Video className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            : <Image className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getTypeBadgeVariant(update.type || "info")}>
                        {update.type || "info"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(update.publish_at), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      {update.expire_at
                        ? format(new Date(update.expire_at), "MMM d, yyyy HH:mm")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(update)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            {t("common.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(update)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t("common.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <AddUpdateSheet open={addSheetOpen} onOpenChange={setAddSheetOpen} />
      
      <EditUpdateSheet
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
        update={selectedUpdate}
      />

      <DeleteUpdateDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        update={selectedUpdate}
      />
    </div>
  );
}

export default function Updates() {
  return (
    <AdminLayout>
      <UpdatesContent />
    </AdminLayout>
  );
}
