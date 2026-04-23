import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserPlus, Trash2, Shield, Edit2, Eye } from "lucide-react";
import { AdminPermission } from "@/pages/Settings";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";

interface PermissionsSectionProps {
  showId: string;
  permissions: AdminPermission[];
  onRefresh: () => Promise<void>;
}

export function PermissionsSection({ showId, permissions, onRefresh }: PermissionsSectionProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const [canPublish, setCanPublish] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleInvite = async () => {
    if (!email.trim()) {
      toast({
        title: t('settings.permissionsSection.emailRequired'),
        description: t('settings.permissionsSection.pleaseEnterEmail'),
        variant: "destructive",
      });
      return;
    }

    setInviting(true);
    try {
      const { error } = await supabase.from("admin_permissions").insert({
        show_id: showId,
        email: email.trim(),
        user_id: crypto.randomUUID(), // Placeholder - resolved on invite acceptance
        role,
        can_publish_episodes: canPublish,
        invited_by: user?.id,
        status: "pending",
      } as any);

      if (error) {
        if (error.code === "23505") {
          toast({
            title: t('settings.permissionsSection.alreadyInvited'),
            description: t('settings.permissionsSection.alreadyInvitedDescription'),
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: t('toast.inviteSent'),
          description: t('settings.permissionsSection.inviteSentDescription', { email, role }),
        });
        setEmail("");
        setRole("viewer");
        setCanPublish(false);
        await onRefresh();
      }
    } catch (error) {
      console.error("Error inviting user:", error);
      toast({
        title: t('toast.error'),
        description: t('toast.pleaseTryAgain'),
        variant: "destructive",
      });
    } finally {
      setInviting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("admin_permissions")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      toast({
        title: t('settings.permissionsSection.accessRevoked'),
        description: t('settings.permissionsSection.accessRevokedDescription'),
      });
      await onRefresh();
    } catch (error) {
      console.error("Error revoking access:", error);
      toast({
        title: t('toast.error'),
        description: t('toast.pleaseTryAgain'),
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="h-4 w-4" />;
      case "editor":
        return <Edit2 className="h-4 w-4" />;
      default:
        return <Eye className="h-4 w-4" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-500/20 text-red-400";
      case "editor":
        return "bg-amber-500/20 text-amber-400";
      default:
        return "bg-blue-500/20 text-blue-400";
    }
  };

  return (
    <>
      <Card className="bg-card text-card-foreground border-0 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold">{t('settings.permissionsSection.title')}</CardTitle>
          <CardDescription className="text-card-foreground/60">
            {t('settings.permissionsSection.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Invite Form */}
          <div className="p-4 rounded-lg bg-secondary/30 border border-border space-y-4">
            <h3 className="font-medium text-card-foreground flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              {t('settings.permissionsSection.inviteNewUser')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="invite_email" className="text-card-foreground">
                  {t('settings.permissionsSection.emailAddress')}
                </Label>
                <Input
                  id="invite_email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('settings.permissionsSection.emailPlaceholder')}
                  className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-card-foreground">{t('settings.permissionsSection.role')}</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="bg-white border-slate-200 text-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="admin">{t('settings.permissionsSection.admin')}</SelectItem>
                    <SelectItem value="editor">{t('settings.permissionsSection.editor')}</SelectItem>
                    <SelectItem value="viewer">{t('settings.permissionsSection.viewer')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  onClick={handleInvite}
                  disabled={inviting || !email.trim()}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {inviting ? t('settings.permissionsSection.inviting') : t('settings.permissionsSection.sendInvite')}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="can_publish"
                checked={canPublish}
                onCheckedChange={setCanPublish}
              />
              <Label htmlFor="can_publish" className="text-card-foreground text-sm">
                {t('settings.permissionsSection.canPublishEpisodes')}
              </Label>
            </div>
          </div>

          {/* Role Descriptions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-4 w-4 text-red-400" />
                <span className="font-medium text-red-400">{t('settings.permissionsSection.admin')}</span>
              </div>
              <p className="text-xs text-card-foreground/60">
                {t('settings.permissionsSection.adminDescription')}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Edit2 className="h-4 w-4 text-amber-400" />
                <span className="font-medium text-amber-400">{t('settings.permissionsSection.editor')}</span>
              </div>
              <p className="text-xs text-card-foreground/60">
                {t('settings.permissionsSection.editorDescription')}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Eye className="h-4 w-4 text-blue-400" />
                <span className="font-medium text-blue-400">{t('settings.permissionsSection.viewer')}</span>
              </div>
              <p className="text-xs text-card-foreground/60">
                {t('settings.permissionsSection.viewerDescription')}
              </p>
            </div>
          </div>

          {/* Current Users Table */}
          <div className="space-y-3">
            <h3 className="font-medium text-card-foreground">{t('settings.permissionsSection.currentAccess')}</h3>
            {permissions.length === 0 ? (
              <div className="text-center py-8 text-card-foreground/60">
                <p>{t('settings.permissionsSection.noUsersInvited')}</p>
                <p className="text-sm">{t('settings.permissionsSection.youAreOwner')}</p>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                      <TableHead className="text-card-foreground/70">{t('settings.permissionsSection.email')}</TableHead>
                      <TableHead className="text-card-foreground/70">{t('settings.permissionsSection.role')}</TableHead>
                      <TableHead className="text-card-foreground/70">{t('settings.permissionsSection.publishAccess')}</TableHead>
                      <TableHead className="text-card-foreground/70">Status</TableHead>
                      <TableHead className="text-card-foreground/70 text-right">{t('admin.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {permissions.map((perm) => (
                      <TableRow key={perm.id} className="border-border">
                        <TableCell className="text-card-foreground font-medium">
                          {perm.email}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getRoleBadgeColor(perm.role)} border-0`}>
                            {getRoleIcon(perm.role)}
                            <span className="ml-1 capitalize">{perm.role}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-card-foreground">
                          {perm.can_publish_episodes ? (
                            <Badge className="bg-green-500/20 text-green-400 border-0">{t('common.yes')}</Badge>
                          ) : (
                            <Badge className="bg-secondary text-card-foreground/60 border-0">{t('common.no')}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {(perm as any).status === "pending" ? (
                            <Badge className="bg-amber-500/20 text-amber-400 border-0">Pending</Badge>
                          ) : (
                            <Badge className="bg-green-500/20 text-green-400 border-0">Accepted</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(perm.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-card-foreground">
              {t('settings.permissionsSection.revokeAccess')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-card-foreground/60">
              {t('settings.permissionsSection.revokeAccessDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-secondary border-border text-card-foreground hover:bg-secondary/80">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? t('settings.permissionsSection.revoking') : t('settings.permissionsSection.revokeAccessButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}