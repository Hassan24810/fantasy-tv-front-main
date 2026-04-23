import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  UserCircle,
  Calendar,
  Trophy,
  Settings,
  LogOut,
  ExternalLink,
  ChevronDown,
  Check,
  Plus,
  Megaphone,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminShow } from "@/contexts/AdminShowContext";
import { Badge } from "@/components/ui/badge";

export function AdminSidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { show, shows, branding, selectShow } = useAdminShow();

  const menuItems = [
    { title: t('admin.dashboard'), icon: LayoutDashboard, path: "/dashboard" },
    { title: t('admin.users'), icon: UserCircle, path: "/dashboard/users" },
    { title: t('admin.rules'), icon: FileText, path: "/dashboard/rules" },
    { title: t('admin.participants'), icon: Users, path: "/dashboard/participants" },
    { title: t('admin.episodes'), icon: Calendar, path: "/dashboard/episodes" },
    { title: t('admin.leagues'), icon: Trophy, path: "/dashboard/leagues" },
    { title: t('updates.title'), icon: Megaphone, path: "/dashboard/updates" },
    { title: t('admin.settings'), icon: Settings, path: "/dashboard/settings" },
  ];

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const handlePreviewB2C = () => {
    if (show) {
      window.open(`/play/${show.id}`, "_blank");
    }
  };

  const handleAddNewShow = () => {
    navigate("/onboarding?mode=new");
  };

  return (
    <Sidebar className="border-r-0 bg-sidebar">
      <SidebarHeader className="p-6 pb-4">
        {/* Show Selector Dropdown - always show dropdown for "Add New Show" option */}
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full focus:outline-none">
            <div className="flex items-center gap-3 p-2 -m-2 rounded-lg hover:bg-sidebar-accent transition-colors cursor-pointer">
              {branding?.logo_url ? (
                <img 
                  src={branding.logo_url} 
                  alt={show?.name || "Logo"} 
                  className="h-10 w-10 object-contain rounded-xl flex-shrink-0"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg flex-shrink-0">
                  {show?.name?.slice(0, 2).toUpperCase() || "FR"}
                </div>
              )}
              <div className="flex flex-col items-start flex-1 min-w-0">
                <div className="flex items-center gap-1 w-full">
                  <span className="text-base font-bold tracking-tight text-white truncate">
                    {show?.name || "Select Show"}
                  </span>
                  {show?.season_number && (
                    <span className="text-white/60 text-xs flex-shrink-0">
                      S{show.season_number}
                    </span>
                  )}
                  <ChevronDown className="h-4 w-4 text-white/50 ml-auto flex-shrink-0" />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {show && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-white border-white/30">
                      {show.status || "draft"}
                    </Badge>
                  )}
                  {show?.role && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {show.role}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="start" 
            className="w-56 bg-white border border-slate-200 shadow-lg z-50"
          >
            {shows.map((s) => (
              <DropdownMenuItem
                key={s.id}
                onClick={() => selectShow(s.id)}
                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold text-sm flex-shrink-0">
                  {s.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm font-medium text-slate-900 truncate">
                    {s.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500">
                      S{s.season_number || 1}
                    </span>
                    <Badge variant="secondary" className="text-[9px] px-1 py-0">
                      {s.role}
                    </Badge>
                  </div>
                </div>
                {s.id === show?.id && (
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleAddNewShow}
              className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                <Plus className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium text-slate-900">
                Add New Show
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      {/* Preview B2C Button */}
      {show && (
        <div className="px-4 pb-2">
          <button
            onClick={handlePreviewB2C}
            className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Preview B2C Site
          </button>
        </div>
      )}

      <Separator className="bg-sidebar-border mx-4 mb-2" />

      <SidebarContent className="px-3 pt-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={isActive(item.path)}
                    onClick={() => navigate(item.path)}
                    tooltip={item.title}
                    className={`gap-3 h-11 px-4 rounded-lg transition-all ${
                      isActive(item.path)
                        ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-medium"
                        : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-sm">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 mt-auto">
        <Separator className="bg-sidebar-border mb-4" />
        
        <SidebarMenuButton
          onClick={handleLogout}
          className="gap-3 h-11 px-4 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent w-full"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-sm">{t('common.logout')}</span>
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}
