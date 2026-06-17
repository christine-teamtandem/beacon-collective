import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useUserContext } from "@/hooks/useSession";
import { Heart, Shield } from "lucide-react";
import { useState } from "react";
import { DonateModal } from "@/components/DonateModal";
import { Button } from "@/components/ui/button";
import { ViewAsBar } from "@/components/ViewAsBar";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { program } = useUserContext();
  const [donateOpen, setDonateOpen] = useState(false);
  const themeClass = program === "flow" ? "flow-theme" : "";
  const ProgramIcon = program === "flow" ? Heart : Shield;
  const programName = program === "flow" ? "Flow Collective" : program === "vanguard" ? "Vanguard Brotherhood" : "Mentorship Hub";

  return (
    <div className={themeClass}>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <SidebarInset className="flex-1">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl">
              <SidebarTrigger />
              <Link to="/" className="flex min-w-0 items-center gap-2">
                <ProgramIcon className="h-4 w-4 shrink-0 text-program" />
                <span className="truncate text-sm font-semibold">{programName}</span>
              </Link>
              <div className="ml-auto flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setDonateOpen(true)}>
                  <Heart className="mr-1.5 h-3.5 w-3.5" /> Donate
                </Button>
              </div>
            </header>
            <ViewAsBar />
            <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
              <Outlet />
            </main>
          </SidebarInset>
        </div>
        <DonateModal open={donateOpen} onOpenChange={setDonateOpen} />
      </SidebarProvider>
    </div>
  );
}
