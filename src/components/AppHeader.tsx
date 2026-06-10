import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useUserContext } from "@/hooks/useSession";
import { LogOut, Shield } from "lucide-react";

export function AppHeader() {
  const navigate = useNavigate();
  const { user, role, program, fullName } = useUserContext();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-gold">
            <Shield className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">
            Vanguard <span className="text-gold">&</span> Flow
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          {user && (
            <>
              <Link to="/dashboard" className="text-muted-foreground hover:text-foreground" activeProps={{ className: "text-gold" }}>Dashboard</Link>
              {(role === "mentee" || role === "mentor" || role === "admin" || role === "parent") && (
                <Link to="/curriculum" className="text-muted-foreground hover:text-foreground" activeProps={{ className: "text-gold" }}>Curriculum</Link>
              )}
              {(role === "mentor" || role === "admin") && (
                <Link to="/tracking" className="text-muted-foreground hover:text-foreground" activeProps={{ className: "text-gold" }}>Tracking</Link>
              )}
              {(role === "mentor" || role === "admin") && (
                <Link to="/workbook" className="text-muted-foreground hover:text-foreground" activeProps={{ className: "text-gold" }}>Workbook</Link>
              )}
              {role === "admin" && (
                <>
                  <Link to="/people" className="text-muted-foreground hover:text-foreground" activeProps={{ className: "text-gold" }}>People</Link>
                  <Link to="/reports" className="text-muted-foreground hover:text-foreground" activeProps={{ className: "text-gold" }}>Reports</Link>
                </>
              )}
            </>
          )}
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="hidden sm:flex flex-col text-right text-xs">
                <span className="font-semibold">{fullName || user.email}</span>
                <span className="text-muted-foreground capitalize">{role}{program ? ` · ${program}` : ""}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button asChild size="sm" className="bg-gradient-gold text-primary-foreground">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
