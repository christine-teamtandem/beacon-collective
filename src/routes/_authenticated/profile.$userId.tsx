import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useUserContext } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortfolioCard } from "./profile";

export const Route = createFileRoute("/_authenticated/profile/$userId")({
  component: ViewPortfolio,
});

function ViewPortfolio() {
  const { userId } = Route.useParams();
  const { user, role } = useUserContext();

  const { data, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["portfolio", userId],
    queryFn: async () => {
      const { data: prof, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, birthday, avatar_url, hobbies, favorites, goals, fun_facts")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      // Address is gated by SECURITY DEFINER fn; mentors get null, parents/admins/self get value.
      const { data: addr } = await supabase.rpc("get_profile_address", { _profile_id: userId });
      const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
      return { prof, address: (addr as string | null) ?? null, role: roleRow?.role ?? "member" };
    },
  });

  if (isLoading) {
    return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading portfolio…</div>;
  }
  if (!data?.prof) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">This portfolio is not available to you.</p>
        <Button asChild variant="outline"><Link to="/dashboard"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link></Button>
      </div>
    );
  }
  const p = data.prof;
  const hobbies = Array.isArray(p.hobbies) ? p.hobbies.join(", ") : (p.hobbies ?? "");
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-program font-semibold">portfolio</p>
          <h1 className="font-display text-3xl font-bold mt-1">{p.full_name}</h1>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to={role === "mentor" ? "/tracking" : "/dashboard"}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Link>
        </Button>
      </div>

      <div className="max-w-md">
        <PortfolioCard
          fullName={p.full_name ?? ""}
          email={p.email ?? ""}
          birthday={p.birthday ?? ""}
          address={data.address ?? ""}
          avatarUrl={p.avatar_url ?? ""}
          hobbies={hobbies}
          favorites={p.favorites ?? ""}
          goals={p.goals ?? ""}
          funFacts={p.fun_facts ?? ""}
          role={data.role}
        />
      </div>
    </div>
  );
}
