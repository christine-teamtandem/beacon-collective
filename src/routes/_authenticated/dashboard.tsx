import { createFileRoute, Link } from "@tanstack/react-router";
import { useUserContext } from "@/hooks/useSession";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { PROGRAMS, getCurriculum } from "@/lib/curriculum";
import { BookOpen, Users, ClipboardList, Trophy, ArrowRight, Calendar, Heart, Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user, role, program, fullName, loading } = useUserContext();

  if (loading) return <div className="text-muted-foreground">Loading...</div>;
  if (!user) return null;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-program font-semibold">{role} dashboard</p>
        <h1 className="font-display text-4xl font-bold mt-1">Welcome back, {fullName.split(" ")[0] || "friend"}.</h1>
        <p className="text-muted-foreground mt-1">
          {program ? PROGRAMS[program].name : role === "mentee" ? "Waiting for program assignment" : "Mentorship Hub"}
        </p>
      </div>

      {role === "mentee" && program && <MenteeDashboard userId={user.id} program={program} />}
      {role === "mentor" && <MentorDashboard userId={user.id} />}
      {role === "admin" && <AdminDashboard />}
      {role === "parent" && <ParentDashboard userId={user.id} />}
      {role === "mentee" && !program && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Waiting for program assignment</CardTitle>
            <CardDescription>
              An admin will assign you to either The Vanguard Brotherhood or The Flow Collective.
              Once assigned, your dashboard will unlock the curriculum, workbook, and program resources.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Mentor or coordinator? Email <a className="text-program underline" href="mailto:freebleeders@gmail.com">freebleeders@gmail.com</a> to expedite.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MenteeDashboard({ userId, program }: { userId: string; program: "vanguard" | "flow" }) {
  const curriculum = getCurriculum(program);
  const { data: progress = [] } = useQuery({
    queryKey: ["progress", userId, program],
    queryFn: async () => {
      const { data } = await supabase
        .from("weekly_progress").select("*")
        .eq("mentee_id", userId).eq("program", program);
      return data ?? [];
    },
  });
  const completed = progress.filter((p) => p.completed).length;
  const pct = (completed / curriculum.length) * 100;
  const nextWeek = curriculum.find((w) => !progress.find((p) => p.week_number === w.week && p.completed));

  const { data: upcoming = [] } = useQuery({
    queryKey: ["dash-upcoming", program],
    queryFn: async () => {
      const { data } = await supabase.from("sessions").select("*")
        .gte("ends_at", new Date().toISOString()).order("starts_at", { ascending: true }).limit(3);
      return data ?? [];
    },
  });

  return (
    <>
      <div className="grid md:grid-cols-3 gap-4">
        <StatCard icon={<Trophy className="h-4 w-4" />} label="Weeks completed" value={`${completed}/${curriculum.length}`} />
        <StatCard icon={<Calendar className="h-4 w-4" />} label="Current week" value={nextWeek ? `W${nextWeek.week}` : "Done!"} />
        <StatCard icon={<BookOpen className="h-4 w-4" />} label="Progress" value={`${Math.round(pct)}%`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Zoom Schedule</CardTitle>
          <CardDescription>Your next mentorship sessions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {upcoming.length === 0 && <p className="text-sm text-muted-foreground">No sessions scheduled yet.</p>}
          {upcoming.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-md border border-border p-3">
              <div className="min-w-0">
                <p className="font-semibold truncate">{s.title}</p>
                <p className="text-xs text-muted-foreground">{new Date(s.starts_at).toLocaleString()}</p>
              </div>
              {s.zoom_url && <Button asChild size="sm" variant="outline"><a href={s.zoom_url} target="_blank" rel="noreferrer">Join</a></Button>}
            </div>
          ))}
          <Button asChild variant="ghost" size="sm" className="w-full mt-2"><Link to="/calendar">Open calendar</Link></Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your journey</CardTitle>
          <CardDescription>{PROGRAMS[program].duration}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={pct} className="h-2" />
          {nextWeek && (
            <div className="flex items-center justify-between p-4 rounded-lg border border-gold/30 bg-gold/5">
              <div>
                <p className="text-xs uppercase text-gold font-semibold">Next up</p>
                <p className="font-semibold mt-1">W{nextWeek.week} · {nextWeek.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{nextWeek.focus}</p>
              </div>
              <Button asChild>
                <Link to="/curriculum/$week" params={{ week: String(nextWeek.week) }}>
                  Open <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
          <Button asChild variant="outline" className="w-full">
            <Link to="/curriculum">View full curriculum</Link>
          </Button>
        </CardContent>
      </Card>
    </>
  );
}


function MentorDashboard({ userId }: { userId: string }) {
  const { data: mentees = [] } = useQuery({
    queryKey: ["mentees", userId],
    queryFn: async () => {
      const { data: assignments } = await supabase
        .from("mentor_assignments").select("mentee_id").eq("mentor_id", userId);
      const ids = (assignments ?? []).map((a) => a.mentee_id);
      if (!ids.length) return [];
      const { data: profiles } = await supabase
        .from("profiles").select("id, full_name, program").in("id", ids);
      return profiles ?? [];
    },
  });
  const { data: logCount = 0 } = useQuery({
    queryKey: ["mentor-logs-count", userId],
    queryFn: async () => {
      const { count } = await supabase.from("tracking_logs").select("*", { count: "exact", head: true }).eq("mentor_id", userId);
      return count ?? 0;
    },
  });

  return (
    <>
      <div className="grid md:grid-cols-3 gap-4">
        <StatCard icon={<Users className="h-4 w-4" />} label="Your mentees" value={String(mentees.length)} />
        <StatCard icon={<ClipboardList className="h-4 w-4" />} label="Tracking logs" value={String(logCount)} />
        <StatCard icon={<BookOpen className="h-4 w-4" />} label="Workbook" value="Active" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Your mentees</CardTitle>
            <CardDescription>Click to log a check-in</CardDescription>
          </div>
          <Button asChild size="sm"><Link to="/tracking">New log</Link></Button>
        </CardHeader>
        <CardContent>
          {mentees.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assignments yet. Ask an admin to pair you with a mentee.</p>
          ) : (
            <ul className="space-y-2">
              {mentees.map((m) => (
                <li key={m.id} className="flex items-center justify-between p-3 rounded-md border border-border">
                  <div>
                    <p className="font-semibold">{m.full_name || "Unnamed mentee"}</p>
                    <p className="text-xs text-muted-foreground capitalize">{m.program ?? "no program"}</p>
                  </div>
                  <Badge variant="outline">{m.program === "vanguard" ? <Shield className="h-3 w-3 mr-1" /> : <Heart className="h-3 w-3 mr-1" />}{m.program}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [profiles, mentors, mentees, logs] = await Promise.all([
        supabase.from("profiles").select("id, program", { count: "exact" }),
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "mentor"),
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "mentee"),
        supabase.from("tracking_logs").select("id", { count: "exact", head: true }),
      ]);
      return {
        total: profiles.count ?? 0,
        mentors: mentors.count ?? 0,
        mentees: mentees.count ?? 0,
        logs: logs.count ?? 0,
        vanguard: profiles.data?.filter((p) => p.program === "vanguard").length ?? 0,
        flow: profiles.data?.filter((p) => p.program === "flow").length ?? 0,
      };
    },
  });
  return (
    <>
      <div className="grid md:grid-cols-4 gap-4">
        <StatCard icon={<Users className="h-4 w-4" />} label="Total members" value={String(stats?.total ?? 0)} />
        <StatCard icon={<Shield className="h-4 w-4" />} label="Vanguard" value={String(stats?.vanguard ?? 0)} />
        <StatCard icon={<Heart className="h-4 w-4" />} label="Flow" value={String(stats?.flow ?? 0)} />
        <StatCard icon={<ClipboardList className="h-4 w-4" />} label="Tracking logs" value={String(stats?.logs ?? 0)} />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>People</CardTitle><CardDescription>Manage mentors, mentees, and assignments.</CardDescription></CardHeader>
          <CardContent><Button asChild><Link to="/people">Open <ArrowRight className="ml-1 h-4 w-4" /></Link></Button></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Sponsor reports</CardTitle><CardDescription>Aggregate Mentee Wins, Engagement & Family Liaison.</CardDescription></CardHeader>
          <CardContent><Button asChild><Link to="/reports">View <ArrowRight className="ml-1 h-4 w-4" /></Link></Button></CardContent>
        </Card>
      </div>
    </>
  );
}

function ParentDashboard({ userId }: { userId: string }) {
  const { data: children = [] } = useQuery({
    queryKey: ["parent-children", userId],
    queryFn: async () => {
      const { data: links } = await supabase.from("parent_links").select("child_id").eq("parent_id", userId);
      const ids = (links ?? []).map((l) => l.child_id);
      if (!ids.length) return [];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, program").in("id", ids);
      return profiles ?? [];
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your children</CardTitle>
        <CardDescription>Follow their mentorship journey.</CardDescription>
      </CardHeader>
      <CardContent>
        {children.length === 0 ? (
          <p className="text-sm text-muted-foreground">No children linked yet. Ask an admin to link your account.</p>
        ) : (
          <ul className="space-y-2">
            {children.map((c) => (
              <li key={c.id} className="flex items-center justify-between p-3 rounded-md border border-border">
                <div>
                  <p className="font-semibold">{c.full_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{c.program}</p>
                </div>
                <Badge variant="outline">{c.program}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <span className="text-gold">{icon}</span> {label}
      </div>
      <div className="mt-2 font-display text-3xl font-bold">{value}</div>
    </div>
  );
}
