import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  UserCircle,
  Calendar,
  Trophy,
  Settings,
  ChevronLeft,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const menuItems = [
  { title: "Dashboard", icon: LayoutDashboard, path: "" },
  { title: "User", icon: UserCircle, path: "/user" },
  { title: "Rules", icon: FileText, path: "/rules" },
  { title: "Participant", icon: Users, path: "/participants" },
  { title: "Events", icon: Calendar, path: "/events" },
  { title: "Leagues", icon: Trophy, path: "/leagues" },
  { title: "Settings", icon: Settings, path: "/settings" },
];

export function ShowSidebar() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => {
    const fullPath = `/show/${id}${path}`;
    return location.pathname === fullPath || (path === "" && location.pathname === `/show/${id}`);
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-lg">
            🎬
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight">
                <span className="text-primary">FANTASY</span>{" "}
                <span className="text-sidebar-foreground">REALITY</span>
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <div className="px-4 py-2">
        <SidebarTrigger className="w-8 h-8 rounded-lg bg-sidebar-accent border border-sidebar-border" />
      </div>

      <Separator className="bg-sidebar-border mx-4" />

      <SidebarContent className="px-2 pt-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={isActive(item.path)}
                    onClick={() => navigate(`/show/${id}${item.path}`)}
                    tooltip={item.title}
                    className={`gap-3 h-10 ${
                      isActive(item.path)
                        ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                        : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="font-medium">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {!isCollapsed && (
        <div className="p-4 mt-auto">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => navigate("/dashboard")}
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Shows
          </Button>
        </div>
      )}
    </Sidebar>
  );
}
