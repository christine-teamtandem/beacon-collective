import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Shield, Users, Calendar, Megaphone, ArrowRight } from "lucide-react";
import { useUserContext } from "@/hooks/useSession";

export const Route = createFileRoute("/_authenticated/hub/$program")({
  component: HubPage,
});

const META = {
  vanguard: {
    name: "The Vanguard Brotherhood",
    tagline: "Discipline. Brotherhood. Excellence.",
    icon: Shield,
    themeClass: "",
  },
  flow: {
    name: "The Flow Collective",
    tagline: "Voice. Sisterhood. Flow.",
    icon: Heart,
    themeClass: "flow-theme",
  },
} as const;

function HubPage() {
  const { program } = useParams({ from: "/_authenticated/hub/$program" });
  const { role, program: myProgram } = useUserContext();

  if (program !== "vanguard" && program !== "flow") {
    return <p className="text-sm text-muted-foreground">Unknown hub.</p>;
  }
  // Non-admins can only view their own hub.
  if (role && role !== "admin" && myProgram && myProgram !== program) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Not available</CardTitle>
          <CardDescription>You're a member of the other program. Ask an admin if you need cross-program access.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return <HubInner program={program} />;
}

function HubInner({ program }: { program: "vanguard" | "flow" }) {
  const meta = META[program];
  const Icon = meta.icon;

  const { data: members = [] } = useQuery({
    queryKey: ["hub-members", program],
    queryFn: async () =>
      (await supabase.from("profiles").select("id, full_name, status").eq("program", program)).data ?? [],
  });
  const { data: upcoming = [] } = useQuery({
    queryKey: ["hub-sessions", program],
    queryFn: async () =>
      (
        await supabase
          .from("sessions")
          .select("*")
          .eq("program", program)
          .gte("ends_at", new Date().toISOString())
          .order("starts_at", { ascending: true })
          .limit(3)
      ).data ?? [],
  });
  const { data: announcements = [] } = useQuery({
    queryKey: ["hub-announcements", program],
    queryFn: async () =>
      (
        await supabase
          .from("announcements")
          .select("*")
          .eq("program", program)
          .order("created_at", { ascending: false })
          .limit(3)
      ).data ?? [],
  });

  return (
    <div className={meta.themeClass}>
      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-gradient-program p-6 text-primary-foreground shadow-elegant">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-background/15">
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest opacity-80">{program} hub</p>
              <h1 className="font-display text-3xl font-bold">{meta.name}</h1>
              <p className="opacity-90 text-sm">{meta.tagline}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Stat icon={<Users />} label="Members" value={members.length} />
          <Stat icon={<Calendar />} label="Upcoming sessions" value={upcoming.length} />
          <Stat icon={<Megaphone />} label="Recent announcements" value={announcements.length} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming sessions</CardTitle>
              <CardDescription>Next 3 Zoom sessions for this hub.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcoming.length === 0 && <p className="text-sm text-muted-foreground">Nothing scheduled.</p>}
              {upcoming.map((s) => (
                <div key={s.id} className="rounded-lg border border-border p-3">
                  <p className="font-semibold">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(s.starts_at).toLocaleString()}</p>
                </div>
              ))}
              <Button asChild size="sm" variant="ghost"><Link to="/calendar">Open calendar <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Latest announcements</CardTitle>
              <CardDescription>From mentors and admins.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {announcements.length === 0 && <p className="text-sm text-muted-foreground">No announcements yet.</p>}
              {announcements.map((a) => (
                <div key={a.id} className="rounded-lg border border-border p-3">
                  <p className="font-semibold">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</p>
                </div>
              ))}
              <Button asChild size="sm" variant="ghost"><Link to="/announcements">All announcements <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>{members.length} people assigned to {meta.name}.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {members.length === 0 && <p className="text-sm text-muted-foreground">No members yet.</p>}
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border border-border p-2 text-sm">
                <span className="truncate">{m.full_name || "Unnamed"}</span>
                <Badge variant="outline" className="capitalize">{m.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span className="text-program">{icon}</span>{label}
      </div>
      <div className="mt-1 font-display text-3xl font-bold">{value}</div>
    </div>
  );
}
