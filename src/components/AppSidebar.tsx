import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

import { useUserContext, type AppRole, type Program } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, BookOpen, ClipboardList, FolderOpen, FileText, BarChart3,
  Shield, Heart, LogOut, Users, Calendar, Megaphone, MessageCircle, ShieldCheck, Mail, UserCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Item = { title: string; url: string; icon: React.ComponentType<{ className?: string }> };

const profileItem: Item = { title: "My Profile", url: "/profile", icon: UserCircle2 };

function itemsFor(role: AppRole | null, _program: Program | null): { label: string; items: Item[] }[] {
  if (role === "admin") {
    return [
      { label: "Super Admin", items: [
        { title: "Admin Portal", url: "/admin", icon: ShieldCheck },
        { title: "Students", url: "/people", icon: Users },
        { title: "Sponsor Reports", url: "/reports", icon: BarChart3 },
      ]},
      { label: "Admin", items: [
        { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
        { title: "Tracking Logs", url: "/tracking", icon: ClipboardList },
        { title: "Workbook Reviews", url: "/workbook", icon: FileText },
        { title: "Resources", url: "/resources", icon: FolderOpen },
      ]},
      { label: "Communication", items: [
        { title: "Calendar", url: "/calendar", icon: Calendar },
        { title: "Announcements", url: "/announcements", icon: Megaphone },
        { title: "Messages", url: "/messages", icon: MessageCircle },
        { title: "Compose email", url: "/compose", icon: Mail },
      ]},
      { label: "Curriculum", items: [
        { title: "12-Week Curriculum", url: "/curriculum", icon: Shield },
      ]},
      { label: "Account", items: [profileItem] },
    ];
  }
  if (role === "mentor") {
    return [
      { label: "Mentor", items: [
        { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
        { title: "Tracking Logs", url: "/tracking", icon: ClipboardList },
        { title: "Resources", url: "/resources", icon: FolderOpen },
      ]},
      { label: "Communication", items: [
        { title: "Calendar", url: "/calendar", icon: Calendar },
        { title: "Announcements", url: "/announcements", icon: Megaphone },
        { title: "Messages", url: "/messages", icon: MessageCircle },
        { title: "Compose email", url: "/compose", icon: Mail },
      ]},
      { label: "Curriculum", items: [
        { title: "12-Week Curriculum", url: "/curriculum", icon: BookOpen },
      ]},
      { label: "Account", items: [profileItem] },
    ];
  }
  if (role === "parent") {
    return [
      { label: "Family", items: [
        { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      ]},
      { label: "Communication", items: [
        { title: "Calendar", url: "/calendar", icon: Calendar },
        { title: "Announcements", url: "/announcements", icon: Megaphone },
        { title: "Messages", url: "/messages", icon: MessageCircle },
      ]},
      { label: "Account", items: [profileItem] },
    ];
  }
  // mentee
  return [
    { label: "My Hub", items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "My Workbook", url: "/workbook", icon: FileText },
      { title: "Resources", url: "/resources", icon: FolderOpen },
    ]},
    { label: "Communication", items: [
      { title: "Calendar", url: "/calendar", icon: Calendar },
      { title: "Announcements", url: "/announcements", icon: Megaphone },
      { title: "Messages", url: "/messages", icon: MessageCircle },
    ]},
    { label: "Curriculum", items: [
      { title: "12-Week Curriculum", url: "/curriculum", icon: BookOpen },
    ]},
    { label: "Account", items: [profileItem] },
  ];
}


export function AppSidebar() {
  const { role, program, fullName, user } = useUserContext();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isMobile, setOpenMobile } = useSidebar();
  const groups = itemsFor(role, program);

  const closeMobile = () => { if (isMobile) setOpenMobile(false); };

  const programLabel = program === "vanguard" ? "Vanguard Brotherhood" : program === "flow" ? "Flow Collective" : role === "admin" ? "Admin Console" : "Awaiting assignment";
  const ProgramIcon = program === "flow" ? Heart : Shield;

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };


  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-program">
            <ProgramIcon className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold leading-tight">{programLabel}</p>
            <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">{role ?? "member"}</p>
          </div>
        </div>
        {role === "admin" && (
          <div className="px-2 pb-2">
            <p className="px-1 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Hubs</p>
            <div className="grid grid-cols-2 gap-1">
              <Link to="/hub/$program" params={{ program: "vanguard" }} className="flex items-center gap-1 rounded-md border border-sidebar-border bg-sidebar-accent/30 px-2 py-1.5 text-xs font-semibold hover:bg-sidebar-accent">
                <Shield className="h-3 w-3 text-gold" /> Vanguard
              </Link>
              <Link to="/hub/$program" params={{ program: "flow" }} className="flex items-center gap-1 rounded-md border border-sidebar-border bg-sidebar-accent/30 px-2 py-1.5 text-xs font-semibold hover:bg-sidebar-accent">
                <Heart className="h-3 w-3 text-rose" /> Flow
              </Link>
            </div>
          </div>
        )}
      </SidebarHeader>


      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => {
                  const active = pathname === item.url || (item.url !== "/dashboard" && pathname.startsWith(item.url));
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={active}>
                        <Link to={item.url} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">
            {(fullName || user?.email || "?").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold">{fullName || user?.email}</p>
          </div>
          <Button size="icon" variant="ghost" onClick={signOut} aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
