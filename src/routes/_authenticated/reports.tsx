import { createFileRoute } from "@tanstack/react-router";
import { useUserContext } from "@/hooks/useSession";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Activity, Heart, Shield } from "lucide-react";
import { PROGRAMS } from "@/lib/curriculum";

export const Route = createFileRoute("/_authenticated/reports")({
  component: Reports,
});

function Reports() {
  const { role } = useUserContext();
  if (role && role !== "admin") return <p className="text-muted-foreground">Admin only.</p>;

  const { data } = useQuery({
    queryKey: ["sponsor-report"],
    queryFn: async () => {
      const [{ data: logs }, { data: profiles }, { data: progress }] = await Promise.all([
        supabase.from("tracking_logs").select("*"),
        supabase.from("profiles").select("id, full_name, program"),
        supabase.from("weekly_progress").select("*").eq("completed", true),
      ]);
      return { logs: logs ?? [], profiles: profiles ?? [], progress: progress ?? [] };
    },
  });

  const logs = data?.logs ?? [];
  const profiles = data?.profiles ?? [];
  const progress = data?.progress ?? [];

  const byCat = {
    mentee_wins: logs.filter((l) => l.category === "mentee_wins").length,
    engagement: logs.filter((l) => l.category === "engagement").length,
    family_liaison: logs.filter((l) => l.category === "family_liaison").length,
  };
  const vCount = profiles.filter((p) => p.program === "vanguard").length;
  const fCount = profiles.filter((p) => p.program === "flow").length;
  const totalCompletedWeeks = progress.length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-gold font-semibold">Sponsor reports</p>
        <h1 className="font-display text-4xl font-bold mt-1">Program Impact Summary</h1>
        <p className="text-muted-foreground mt-1">Aggregate metrics across both programs for sponsorship reports.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Metric icon={<Trophy />} label="Mentee Wins logged" value={byCat.mentee_wins} desc="Milestones, skills, confidence" />
        <Metric icon={<Activity />} label="Engagement notes" value={byCat.engagement} desc="Attendance, completion" />
        <Metric icon={<Heart />} label="Family Liaison" value={byCat.family_liaison} desc="Family communication" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle><Shield className="inline h-5 w-5 mr-2 text-gold" />{PROGRAMS.vanguard.name}</CardTitle><CardDescription>{vCount} members</CardDescription></CardHeader>
          <CardContent>
            <p className="text-sm">Completed weeks: <span className="font-semibold text-gold">{progress.filter((p) => p.program === "vanguard").length}</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle><Heart className="inline h-5 w-5 mr-2 text-rose" />{PROGRAMS.flow.name}</CardTitle><CardDescription>{fCount} members</CardDescription></CardHeader>
          <CardContent>
            <p className="text-sm">Completed weeks: <span className="font-semibold text-rose">{progress.filter((p) => p.program === "flow").length}</span></p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent activity</CardTitle><CardDescription>Latest {Math.min(logs.length, 20)} tracking logs</CardDescription></CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {logs.slice(0, 20).map((l) => {
              const mentee = profiles.find((p) => p.id === l.mentee_id);
              return (
                <li key={l.id} className="p-3 rounded border border-border bg-surface/40">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">{l.title}</p>
                    <Badge variant="outline" className="capitalize">{l.category.replace("_", " ")}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{mentee?.full_name ?? "Unknown"} · {mentee?.program} · {new Date(l.created_at).toLocaleDateString()}</p>
                  {l.note && <p className="text-sm mt-2">{l.note}</p>}
                </li>
              );
            })}
            {logs.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Aggregate engagement</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm">Total weeks completed across all mentees: <span className="font-display text-2xl text-gold ml-2">{totalCompletedWeeks}</span></p>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ icon, label, value, desc }: { icon: React.ReactNode; label: string; value: number; desc: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 text-gold">{icon}<CardTitle className="text-sm font-semibold">{label}</CardTitle></div>
      </CardHeader>
      <CardContent>
        <p className="font-display text-4xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{desc}</p>
      </CardContent>
    </Card>
  );
}
